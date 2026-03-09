/**
 * Serviço para integração com dados rurais e portais públicos (SICAR, SIGEF, INCRA, etc)
 */

import { Property } from '../types';

export const ruralDataService = {
  /**
   * Gera links oficiais para consulta pública baseado nos dados do imóvel
   */
  getExternalLinks(property: Property) {
    const links = [];
    const legal = property.features.legal;

    if (legal?.carNumber) {
      links.push({
        label: 'Consulta SICAR (CAR)',
        url: `https://www.car.gov.br/#/consultar`,
        description: `Código: ${legal.carNumber}`,
        portal: 'SICAR'
      });
    }

    if (legal?.geoNumber) {
      links.push({
        label: 'Consulta SIGEF (GEO)',
        url: `https://sigef.incra.gov.br/consultar/parcelas/`,
        description: `Parcela Georreferenciada`,
        portal: 'SIGEF/INCRA'
      });
    }

    if (legal?.ccirNumber) {
      links.push({
        label: 'Consulta SNCR (CCIR)',
        url: `https://sncr.incra.gov.br/sncr-web/consultarImovelRural.do`,
        description: `Código INCRA: ${legal.ccirNumber}`,
        portal: 'INCRA'
      });
    }

    return links;
  },

  /**
   * Valida formato de código CAR (UF-XXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX)
   */
  validateCarFormat(carNumber: string): boolean {
    // Exemplo simplificado: SP-3500000-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    const regex = /^[A-Z]{2}-\d{7}-[A-F0-9]{32}$/i;
    // Alguns sistemas usam formatos variados, mas o padrão nacional SICAR é este.
    // Para ser mais flexível no início:
    return carNumber.length > 15;
  },

  /**
   * Consulta os dados do CAR via Proxy Backend
   */
  async fetchCarData(carNumber: string) {
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3002'}/api/rural/car/${encodeURIComponent(carNumber)}`;
    
    const response = await fetch(apiUrl);
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao consultar CAR');
    }
    
    const result = await response.json();
    return result.data;
  },

  /**
   * Mapeia a resposta do SICAR para os campos do sistema
   */
  mapSicarToFeatures(sicarData: any) {
    // A estrutura do registrorural/SICAR costuma vir com áreas em hectares
    return {
      areaHectares: sicarData.area_imovel || 0,
      reservaLegal: sicarData.percentual_reserva_legal || 20,
      app: sicarData.area_app || 0,
      status: sicarData.situacao || 'Ativo'
    };
  },
};
