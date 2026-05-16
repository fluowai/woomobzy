import { db } from '../../../lib/pg.js';
import { AgroIntelligenceService } from '../../../services/AgroIntelligence.js';
import { CARConnector } from './integrations/car-connector.js';
import { RuralRepository } from './repository.js';

function collectPositions(coordinates, positions = []) {
  if (!Array.isArray(coordinates)) return positions;

  if (
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    positions.push(coordinates);
    return positions;
  }

  coordinates.forEach((item) => collectPositions(item, positions));
  return positions;
}

function getBoundingBox(geometry) {
  const positions = collectPositions(geometry?.coordinates);
  if (positions.length === 0) {
    throw new Error('Geometria rural sem coordenadas validas para analise.');
  }

  return positions.reduce(
    ([minLng, minLat, maxLng, maxLat], [lng, lat]) => [
      Math.min(minLng, lng),
      Math.min(minLat, lat),
      Math.max(maxLng, lng),
      Math.max(maxLat, lat),
    ],
    [Infinity, Infinity, -Infinity, -Infinity]
  );
}

export async function processRuralAnalysisJob({ analysisId, geometry }) {
  console.log(`[RuralAnalysis] Starting analysis for ${analysisId}...`);

  try {
    const bbox = getBoundingBox(geometry);
    const carData = await CARConnector.fetchByBbox(bbox);
    const envAnalysis = await AgroIntelligenceService.performEnvironmentalAnalysis(geometry);

    let overlappingAreaHa = 0;
    let carFound = false;

    if (carData.features && carData.features.length > 0) {
      carFound = true;

      const intersectionQuery = `
        SELECT ST_Area(ST_Intersection(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)::geography,
               ST_SetSRID(ST_GeomFromGeoJSON($2), 4326)::geography)) / 10000 as area_intersection
      `;

      const firstCarGeom = carData.features[0].geometry;
      const { rows } = await db.query(intersectionQuery, [
        JSON.stringify(geometry),
        JSON.stringify(firstCarGeom),
      ]);
      overlappingAreaHa = rows[0]?.area_intersection || 0;
    }

    let score = 0;
    if (carFound) score += 40;
    if (envAnalysis.success && envAnalysis.risk_score === 0) score += 40;
    if (envAnalysis.risk_score >= 70) score -= 50;

    score = Math.max(0, Math.min(100, score));

    const riskLevel = score >= 80 ? 'baixo' : score >= 50 ? 'medio' : 'alto';
    const report = {
      area_total_ha: geometry.area_ha || 0,
      car: {
        encontrado: carFound,
        area_sobreposta: overlappingAreaHa,
        features_count: carData.features?.length || 0,
      },
      sigef: { certificado: true, sobreposicao: false },
      ambiental: {
        score_risco: envAnalysis.risk_score || 0,
        status: envAnalysis.status || 'OFFLINE',
        findings: envAnalysis.findings || [],
      },
      score,
      riskLevel,
    };

    await RuralRepository.updateAnalysis(analysisId, {
      status: 'completed',
      report,
      score,
      riskLevel,
    });
  } catch (error) {
    console.error(`[RuralAnalysis] Error processing analysis ${analysisId}:`, error);
    await RuralRepository.updateAnalysis(analysisId, {
      status: 'failed',
      report: { error: error.message },
    });
    throw error;
  }
}

export function runRuralAnalysisInBackground(jobData) {
  setImmediate(() => {
    processRuralAnalysisJob(jobData).catch((error) => {
      console.error(
        `[RuralAnalysis] Background analysis ${jobData.analysisId} failed:`,
        error.message
      );
    });
  });
}
