import { callApi } from '../src/lib/api';

export interface RuralPropertyData {
  codigoImovel?: string;
  denominacao?: string;
  municipio?: string;
  uf?: string;
  areaTotal?: number;
  areaHa?: number;
  titulares?: Array<{
    nome: string;
    cpfCnpj?: string;
    percentual?: number;
    condicao?: string;
  }>;
  situacao?: string;
  dataAtualizacao?: string;
}

export interface SigefParcela {
  codigoParcela?: string;
  codigoImovel?: string;
  denominacao?: string;
  municipio?: string;
  uf?: string;
  areaCertificada?: number;
  areaShape?: number;
  situacao?: string;
  dataCertificacao?: string;
  geometria?: any;
}

export interface CarStatus {
  codigo: string;
  situacao?: string;
  status?: string;
  areaTotal?: number;
  areaAPP?: number;
  areaRL?: number;
  municipio?: string;
  uf?: string;
  nomeProprietario?: string;
  cpfCnpj?: string;
  dataInscricao?: string;
  dataAtualizacao?: string;
}

export interface ItrCertidao {
  nirf?: string;
  situacao?: 'REGULAR' | 'IRREGULAR' | 'PARCELADO';
  tipo?: 'NEGATIVA' | 'POSITIVA';
  mensagem?: string;
  dataEmissao?: string;
  link?: string;
  Debitos?: Array<{
    exercicio: number;
    valor?: number;
    situacao: string;
  }>;
}

export interface ValidationResult {
  source: 'SNCR' | 'SIGEF' | 'CAR' | 'ITR';
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  propertyId?: string;
}

export class LegalValidationService {
  async getPropertiesByOwner(cpfCnpj: string): Promise<RuralPropertyData[]> {
    try {
      const result = await callApi(
        `/api/rural/sncr/buscar?cpfCnpj=${encodeURIComponent(cpfCnpj)}`
      );
      return result.data || [];
    } catch (error) {
      console.error('Erro aoBuscar propriedades SNCR:', error);
      return [];
    }
  }

  async getPropertyDetails(
    codigoImovel: string
  ): Promise<RuralPropertyData | null> {
    try {
      const result = await callApi(`/api/rural/sncr/imovel/${codigoImovel}`);
      return result.data || null;
    } catch (error) {
      console.error('Erro aoBuscar detalhes SNCR:', error);
      return null;
    }
  }

  async getSigefParcela(codigoParcela: string): Promise<SigefParcela | null> {
    try {
      const result = await callApi(`/api/rural/sigef/parcela/${codigoParcela}`);
      return result.data || null;
    } catch (error) {
      console.error('Erro aoBuscar parcela SIGEF:', error);
      return null;
    }
  }

  async getCarStatus(carNumber: string): Promise<CarStatus | null> {
    try {
      const result = await callApi(
        `/api/rural/car/${encodeURIComponent(carNumber)}`
      );
      return result.data || null;
    } catch (error) {
      console.error('Erro aoBuscar CAR:', error);
      return null;
    }
  }

  async getItrCertidao(nirf: string): Promise<ItrCertidao | null> {
    try {
      const result = await callApi(`/api/rural/itr/certidao/${nirf}`);
      return result.data || null;
    } catch (error) {
      console.error('Erro aoBuscar certidão ITR:', error);
      return null;
    }
  }

  async validateProperty(propertyId: string): Promise<{
    propertyId: string;
    propertyTitle: string;
    location: string;
    areaHa: number;
    validations: ValidationResult[];
    riskScore: number;
    riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO';
  }> {
    try {
      const result = await callApi(`/api/rural/validar/${propertyId}`);
      return result;
    } catch (error) {
      console.error('Erro na validação:', error);
      throw error;
    }
  }

  calculateRiskScore(validations: ValidationResult[]): {
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
      } else if (v.data?.situacao === 'IRREGULAR') {
        score -= 25;
        factors.push('Débitos/Iregularidade detectada');
      } else if (v.data?.status === 'CANCELADO' || v.data?.status === 'BAIXA') {
        score -= 30;
        factors.push('Imóvel cancelado/baixo');
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

  generateValidationReport(
    propertyId: string,
    validations: ValidationResult[]
  ): {
    propertyId: string;
    generatedAt: string;
    summary: {
      total: number;
      successful: number;
      failed: number;
    };
    details: ValidationResult[];
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

export const legalValidationService = new LegalValidationService();
