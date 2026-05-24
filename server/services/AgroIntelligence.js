import axios from 'axios';

const FALLBACK_PRICES = {
  soja: { valor: 134.5, unidade: 'sc', data: '28/04/2024', moeda: 'BRL' },
  milho: { valor: 62.15, unidade: 'sc', data: '28/04/2024', moeda: 'BRL' },
  boi_gordo: { valor: 232.8, unidade: 'arroba', data: '28/04/2024', moeda: 'BRL' },
  cafe: { valor: 1015.2, unidade: 'sc', data: '28/04/2024', moeda: 'BRL' },
  trigo: { valor: 68.4, unidade: 'sc', data: '28/04/2024', moeda: 'BRL' },
};

/**
 * Service to interact with the Python Agro-Intelligence microservice
 */
export class AgroIntelligenceService {
  static getApiBase() {
    return process.env.AGRO_INTEL_URL || 'http://localhost:8000';
  }

  /**
   * Fetch latest commodity prices (CEPEA)
   */
  static async getLatestPrices() {
    try {
      const response = await axios.get(`${this.getApiBase()}/prices`, { timeout: 6000 });
      return response.data;
    } catch (error) {
      console.error('[AgroIntelligence] Error fetching prices:', error.message);
      return {
        success: true,
        stale: true,
        data: FALLBACK_PRICES,
        warning: 'Servico de inteligencia agro indisponivel. Usando cotacoes de contingencia.',
      };
    }
  }

  /**
   * Fetch municipal production data (IBGE)
   */
  static async getMunicipalProduction(ibgeCode) {
    try {
      const response = await axios.get(`${this.getApiBase()}/production/municipality/${ibgeCode}`);
      return response.data;
    } catch (error) {
      console.error('[AgroIntelligence] Error fetching production:', error.message);
      return { success: false, error: 'Falha ao buscar dados produtivos do municipio.' };
    }
  }

  /**
   * Perform deep environmental analysis on a geometry (INPE/agrobr)
   */
  static async performEnvironmentalAnalysis(geometry) {
    try {
      const response = await axios.post(`${this.getApiBase()}/analysis/environmental`, { geometry });
      return response.data;
    } catch (error) {
      console.error('[AgroIntelligence] Error in environmental analysis:', error.message);
      return {
        success: false,
        risk_score: 0,
        status: 'OFFLINE',
        findings: ['Servidor de inteligencia ambiental indisponivel.'],
      };
    }
  }

  /**
   * Resolve property and generate KML/KMZ
   */
  static async geoprocessProperty(params) {
    try {
      const response = await axios.post(`${this.getApiBase()}/geoprocess`, params);
      return response.data;
    } catch (error) {
      console.error('[AgroIntelligence] Error in geoprocessing:', error.response?.data?.detail || error.message);
      return {
        success: false,
        error: error.response?.data?.detail || 'Falha ao processar dados geoespaciais.',
      };
    }
  }
}
