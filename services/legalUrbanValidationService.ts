import { logger } from '@/utils/logger';
import { callApi } from '../src/lib/api';

export interface UrbanPropertyData {
  inscricao?: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
  areaTerreno?: number;
  areaConstruida?: number;
  valorVenalTerreno?: number;
  valorVenalConstrucao?: number;
  valorVenalTotal?: number;
  anoConstrucao?: number;
  tipologia?: string;
  padraoConstrutivo?: string;
  zonaUso?: string;
  frente?: number;
  profundidade?: number;
  iptuStatus?: 'REGULAR' | 'INADIMPLENTE' | ' parcelado';
  ultimoPagamento?: string;
}

export interface ZoneamentoData {
  municipio?: string;
  zonaPrincipal?: string;
  coeffAproveitamento?: number;
  taxaOcupacao?: number;
  testadaMinima?: number;
  usoPermitido?: string[];
}

export interface CertidaoNegativa {
  cpf?: string;
  cnpj?: string;
  tipo?: 'PESSOA FÍSICA' | 'PESSOA JURÍDICA';
  certidaoNegativa?: boolean;
  dataEmissao?: string;
  validade?: string;
  link?: string;
}

export interface ValidationUrbanResult {
  source: 'IPTU' | 'ZONEAMENTO' | 'ENDERECO' | 'CND';
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

export class LegalUrbanValidationService {
  async getIptuData(inscricao: string): Promise<UrbanPropertyData | null> {
    try {
      const result = await callApi(
        `/api/urban/iptu/${encodeURIComponent(inscricao)}`
      );
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao buscar IPTU:', error);
      return null;
    }
  }

  async getPropertyDetails(codigo: string): Promise<any | null> {
    try {
      const result = await callApi(`/api/urban/imovel/${codigo}`);
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao buscar imóvel:', error);
      return null;
    }
  }

  async getZoneamento(municipio: string): Promise<ZoneamentoData | null> {
    try {
      const result = await callApi(
        `/api/urban/zoneamento/${encodeURIComponent(municipio)}`
      );
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao buscar zoneamento:', error);
      return null;
    }
  }

  async getCertidaoNegativa(cpf: string): Promise<CertidaoNegativa | null> {
    try {
      const result = await callApi(
        `/api/urban/cnd/pessoa/${encodeURIComponent(cpf)}`
      );
      return result.data || null;
    } catch (error) {
      logger.error('Erro ao buscar certidão:', error);
      return null;
    }
  }

  async getPropertiesByOwner(cpfCnpj: string): Promise<any[]> {
    try {
      const result = await callApi(
        `/api/urban/buscar?cpfCnpj=${encodeURIComponent(cpfCnpj)}`
      );
      return result.data || [];
    } catch (error) {
      logger.error('Erro ao buscar propriedades:', error);
      return [];
    }
  }

  async validateProperty(propertyId: string): Promise<{
    propertyId: string;
    propertyTitle: string;
    address: string;
    location: string;
    validations: ValidationUrbanResult[];
    riskScore: number;
    riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO';
  }> {
    try {
      const result = await callApi(`/api/urban/validar/${propertyId}`);
      return result;
    } catch (error) {
      logger.error('Erro na validação:', error);
      throw error;
    }
  }

  calculateRiskScore(validations: ValidationUrbanResult[]): {
    score: number;
    level: 'BAIXO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    factors: string[];
  } {
    let score = 100;
    const factors: string[] = [];

    for (const v of validations) {
      if (!v.success) {
        score -= 20;
        factors.push(`Erro na validação ${v.source}`);
      } else if (v.data?.status === 'INADIMPLENTE') {
        score -= 25;
        factors.push('IPTU inadimplente');
      } else if (v.data?.status === ' parcelado') {
        score -= 15;
        factors.push('IPTU parcelado');
      } else if (!v.data) {
        score -= 15;
        factors.push(`${v.source} sem dados`);
      }
    }

    return {
      score: Math.max(0, score),
      level:
        score >= 80
          ? 'BAIXO'
          : score >= 50
            ? 'MEDIO'
            : score >= 25
              ? 'ALTO'
              : 'CRITICO',
      factors,
    };
  }

  generateReport(
    propertyId: string,
    validations: ValidationUrbanResult[]
  ): {
    propertyId: string;
    generatedAt: string;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
    details: ValidationUrbanResult[];
    riskAssessment: ReturnType<typeof this.calculateRiskScore>;
  } {
    const successful = validations.filter((v) => v.success).length;

    return {
      propertyId,
      generatedAt: new Date().toISOString(),
      summary: {
        total: validations.length,
        successful,
        failed: validations.length - successful,
      },
      details: validations,
      riskAssessment: this.calculateRiskScore(validations),
    };
  }
}

export const legalUrbanValidationService = new LegalUrbanValidationService();
