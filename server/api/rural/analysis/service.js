import { KMZService } from './kmz-service.js';
import { RuralRepository } from './repository.js';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379');
const analysisQueue = new Queue('rural-analysis', { connection });

export class AnalysisService {
  /**
   * Handle the KMZ upload and initiate analysis
   */
  static async startKMZAnalysis(organizationId, filename, buffer) {
    // 1. Parse KMZ to GeoJSON
    const featureCollection = await KMZService.parseKMZ(buffer);
    const multiPolygon = KMZService.toMultiPolygon(featureCollection);

    // 2. Save Original Perimeter to PostGIS
    const area = await RuralRepository.createArea({
      organizationId,
      name: filename,
      geojson: multiPolygon
    });

    // 3. Create Analysis Record (Pending)
    const analysis = await RuralRepository.createAnalysis(area.id);

    // 4. Queue Heavy Spatial Processing
    await analysisQueue.add('process-analysis', {
      analysisId: analysis.id,
      areaId: area.id,
      organizationId,
      geometry: multiPolygon
    });

    return {
      success: true,
      jobId: analysis.id,
      area_id: area.id,
      initial_area_ha: area.area_ha,
      status: 'processing'
    };
  }
}
