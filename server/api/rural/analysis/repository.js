import { db } from '../../../lib/pg.js';

export class RuralRepository {
  /**
   * Insert a new rural area with PostGIS geometry
   */
  static async createArea({ organizationId, name, geojson }) {
    const query = `
      INSERT INTO rural_areas (organization_id, name, geometry, area_ha)
      VALUES ($1, $2, ST_GeomFromGeoJSON($3), ST_Area(ST_GeomFromGeoJSON($3)::geography) / 10000)
      RETURNING id, area_ha;
    `;
    const values = [organizationId, name, JSON.stringify(geojson)];
    const { rows } = await db.query(query, values);
    return rows[0];
  }

  /**
   * Create an initial analysis entry
   */
  static async createAnalysis(areaId) {
    const { rows } = await db.query(
      'INSERT INTO rural_analysis (area_id, status) VALUES ($1, $2) RETURNING id',
      [areaId, 'pending']
    );
    return rows[0];
  }

  /**
   * Update analysis result
   */
  static async updateAnalysis(id, { status, report, score, riskLevel }) {
    const { rows } = await db.query(
      `UPDATE rural_analysis 
       SET status = $1, report = $2, score = $3, risk_level = $4, created_at = NOW()
       WHERE id = $5 RETURNING *`,
      [status, JSON.stringify(report), score, riskLevel, id]
    );
    return rows[0];
  }

  /**
   * Get basic geographic info (Municipality/State) using IBGE mesh (concept)
   */
  static async getGeographicContext(areaId) {
    // This assumes an 'ibge_municipios' table exists or uses a public service
    // For now, return a placeholder or query if available
    return { municipio: 'Querência', uf: 'MT' }; 
  }
}
