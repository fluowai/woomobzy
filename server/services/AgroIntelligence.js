import axios from 'axios';

/**
 * Service to interact with the Python Agro-Intelligence microservice
 */
export class AgroIntelligenceService {
  static API_BASE = process.env.AGRO_INTEL_URL || 'http://localhost:8000';

  /**
   * Fetch latest commodity prices (CEPEA)
   */
  static async getLatestPrices() {
    try {
      const response = await axios.get(`${this.API_BASE}/prices`);
      return response.data;
    } catch (error) {
      console.error('[AgroIntelligence] Error fetching prices:', error.message);
      return { success: false, error: 'Serviço de inteligência agro indisponível.' };
    }
  }

  /**
   * Fetch municipal production data (IBGE)
   */
  static async getMunicipalProduction(ibgeCode) {
    try {
      const response = await axios.get(`${this.API_BASE}/production/municipality/${ibgeCode}`);
      return response.data;
    } catch (error) {
      console.error('[AgroIntelligence] Error fetching production:', error.message);
      return { success: false, error: 'Falha ao buscar dados produtivos do município.' };
    }
  }

  /**
   * Perform deep environmental analysis on a geometry (INPE/agrobr)
   */
  static async performEnvironmentalAnalysis(geometry) {
    try {
      const response = await axios.post(`${this.API_BASE}/analysis/environmental`, { geometry });
      return response.data;
    } catch (error) {
      console.error('[AgroIntelligence] Error in environmental analysis:', error.message);
      return { 
        success: false, 
        risk_score: 0, 
        status: 'OFFLINE', 
        findings: ['Servidor de inteligência ambiental indisponível.'] 
      };
    }
  }
}
