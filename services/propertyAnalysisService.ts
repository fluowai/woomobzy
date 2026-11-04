// Serviço de análise inteligente de propriedades rurais
// Integra dados climáticos com IA (Gemini) para gerar recomendações

import { logger } from '@/utils/logger';
import { climateService } from './climateService';
import { geminiService } from './geminiService';
import { Property, ClimateData, PropertyAnalysis } from '../types';

export const propertyAnalysisService = {
  /**
   * Analisa uma propriedade rural completa
   */
  async analyzeProperty(
    city: string,
    state: string,
    areaHectares: number,
    soilType: string
  ): Promise<PropertyAnalysis> {
    try {
      // 1. Buscar dados climáticos
      logger.info('🌍 Buscando dados climáticos...');
      const climate = await climateService.getClimateData(city, state);

      // 2. Preparar prompt para IA
      const prompt = this.buildAnalysisPrompt(climate, areaHectares, soilType);

      // 3. Chamar IA para análise
      logger.info('🤖 Analisando com IA...');
      const aiResponse = await geminiService.generateText(prompt);

      // 4. Processar resposta
      const analysis = this.parseAIResponse(aiResponse);

      return {
        climate,
        ...analysis,
        analyzedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Erro na análise:', error);
      throw new Error(
        'Não foi possível analisar a propriedade. Tente novamente.'
      );
    }
  },

  /**
   * Constrói prompt para análise da IA
   */
  buildAnalysisPrompt(
    climate: ClimateData,
    area: number,
    soilType: string
  ): string {
    return `Você é um especialista em agronomia e análise de propriedades rurais no Brasil.

Analise a seguinte propriedade rural:

**Localização:** ${climate.location}
**Área:** ${area} hectares
**Tipo de Solo:** ${soilType}

**Dados Climáticos (média anual):**
- Temperatura média: ${climate.avgTemp}°C
- Temperatura mínima: ${climate.minTemp}°C
- Temperatura máxima: ${climate.maxTemp}°C
- Precipitação total: ${climate.totalRainfall}mm/ano
- Precipitação média mensal: ${climate.avgRainfall}mm
- Umidade relativa: ${climate.humidity}%
- Clima: ${climate.season}

Com base nesses dados, forneça uma análise COMPLETA em formato JSON com a seguinte estrutura:

{
  "aptitude": {
    "cattle": {
      "score": <número de 1 a 10>,
      "type": [<tipos de gado recomendados: "Gado de Corte", "Gado Leiteiro", "Búfalos", "Equinos">],
      "notes": "<explicação breve sobre aptidão para pecuária>"
    },
    "agriculture": {
      "score": <número de 1 a 10>,
      "crops": [<lista de culturas recomendadas: "Soja", "Milho", "Café", "Cana", "Algodão", etc>],
      "notes": "<explicação breve sobre aptidão agrícola>"
    }
  },
  "risks": [<lista de riscos climáticos: "Seca", "Geada", "Excesso de chuva", etc>],
  "opportunities": [<lista de oportunidades: "Irrigação", "Pastagem rotacionada", etc>],
  "overallScore": <score geral de 1 a 10>,
  "aiInsights": "<análise narrativa em 2-3 parágrafos sobre o potencial da propriedade, recomendações de uso e considerações importantes>"
}

IMPORTANTE: Retorne APENAS o JSON válido, sem texto adicional antes ou depois.`;
  },

  /**
   * Processa resposta da IA
   */
  parseAIResponse(
    response: string
  ): Omit<PropertyAnalysis, 'climate' | 'analyzedAt'> {
    try {
      // Limpar resposta (remover markdown, etc)
      let cleaned = response.trim();

      // Remover ```json se existir
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }

      // Remover ``` se existir
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(cleaned);

      // Validar estrutura
      if (!parsed.aptitude || !parsed.risks || !parsed.aiInsights) {
        throw new Error('Resposta da IA incompleta');
      }

      return parsed;
    } catch (error) {
      logger.error('Erro ao processar resposta da IA:', error);
      logger.info('Resposta recebida:', response);

      // Retornar análise padrão em caso de erro
      return {
        aptitude: {
          cattle: {
            score: 7,
            type: ['Gado de Corte'],
            notes: 'Análise detalhada não disponível no momento',
          },
          agriculture: {
            score: 7,
            crops: ['Soja', 'Milho'],
            notes: 'Análise detalhada não disponível no momento',
          },
        },
        risks: ['Variação climática'],
        opportunities: ['Diversificação de culturas'],
        overallScore: 7,
        aiInsights:
          'A análise detalhada não pôde ser gerada no momento. Por favor, tente novamente.',
      };
    }
  },
};
