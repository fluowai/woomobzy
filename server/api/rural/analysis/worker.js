import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { db } from '../../../lib/pg.js';
import { CARConnector } from './integrations/car-connector.js';
import { RuralRepository } from './repository.js';
import * as turf from '@turf/turf';
import { AgroIntelligenceService } from '../../../services/AgroIntelligence.js';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');

export const analysisWorker = new Worker('rural-analysis', async (job) => {
  const { analysisId, areaId, geometry } = job.data;

  console.log(`[Worker] Starting analysis for ${analysisId}...`);

  try {
    // 1. Calculate BBox for external queries
    const bbox = turf.bbox(geometry);

    // 2. Fetch External Data (CAR)
    const carData = await CARConnector.fetchByBbox(bbox);
    
    // 3. Environmental Analysis (agrobr/INPE)
    const envAnalysis = await AgroIntelligenceService.performEnvironmentalAnalysis(geometry);
    
    // 3. Spatial Cross-Analysis in PostGIS
    // We'll compare the input geometry with the fetched CAR features
    let overlappingAreaHa = 0;
    let carFound = false;

    if (carData.features && carData.features.length > 0) {
      carFound = true;
      
      // Calculate intersection area using ST_Intersection in PostGIS
      const intersectionQuery = `
        SELECT ST_Area(ST_Intersection(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography, 
               ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)::geography)) / 10000 as area_intersection
      `;
      
      // For simplicity, we compare with the first feature or merge them
      // In production, you'd iterate or use a temp table
      const firstCarGeom = carData.features[0].geometry;
      const { rows } = await db.query(intersectionQuery, [JSON.stringify(geometry), JSON.stringify(firstCarGeom)]);
      overlappingAreaHa = rows[0]?.area_intersection || 0;
    }

    // 4. Score Calculation
    let score = 0;
    if (carFound) score += 40;
    if (envAnalysis.success && envAnalysis.risk_score === 0) score += 40; // Bonus for clean area
    if (envAnalysis.risk_score >= 70) score -= 50; // Penalty for critical alerts
    
    // Normalize score to 0-100
    score = Math.max(0, Math.min(100, score));
    
    // Determine Risk Level
    const riskLevel = score >= 80 ? 'baixo' : score >= 50 ? 'medio' : 'alto';

    // 5. Final Report Construction
    const report = {
      area_total_ha: geometry.area_ha || 0, // Should be fetched from repo
      car: {
        encontrado: carFound,
        area_sobreposta: overlappingAreaHa,
        features_count: carData.features?.length || 0
      },
      sigef: { certificado: true, sobreposicao: false }, // Placeholder for now
      ambiental: {
        score_risco: envAnalysis.risk_score || 0,
        status: envAnalysis.status || 'OFFLINE',
        findings: envAnalysis.findings || []
      },
      score,
      riskLevel
    };

    // 6. Persist results
    await RuralRepository.updateAnalysis(analysisId, {
      status: 'completed',
      report,
      score,
      riskLevel
    });

  } catch (error) {
    console.error(`[Worker] Error processing job ${job.id}:`, error);
    await RuralRepository.updateAnalysis(analysisId, {
      status: 'failed',
      report: { error: error.message }
    });
    throw error;
  }
}, { connection });
