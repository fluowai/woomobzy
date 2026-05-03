import { logger } from '@/utils/logger';
import { GoogleGenAI, Type } from '@google/genai';
import { Property, Lead } from '../types';

// Lazy initialization para evitar crash quando API key não está disponível
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai) {
    // @ts-ignore
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      logger.warn(
        '⚠️ VITE_GEMINI_API_KEY não configurada - funcionalidades de IA desabilitadas'
      );
      return null;
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const generateSmartDescription = async (property: Partial<Property>) => {
  const prompt = `Gere uma descrição atraente e profissional para um imóvel rural com as seguintes características:
    Tipo: ${property.type}
    Localização: ${property.location?.neighborhood}, ${property.location?.city}
    Área: ${property.features?.areaHectares} hectares
    Topografia: ${property.features?.topography || 'Não informada'}
    Solo: ${property.features?.soilTexture || 'Não informado'}
    Infraestrutura: ${property.features?.infra?.casaSede ? 'Possui Casa Sede' : ''}, ${property.features?.infra?.curral ? 'Possui Currais' : ''}
    Galpões: ${property.features?.infra?.galpaes || 0}
    Casas de Funcionários: ${property.features?.infra?.casasFuncionarios || 0}
    Recursos Hídricos: ${
      [
        property.features?.water?.rio ? 'Rio' : '',
        property.features?.water?.nascente ? 'Nascente' : '',
        property.features?.water?.represa ? 'Represa' : '',
      ]
        .filter(Boolean)
        .join(', ') || 'Não informado'
    }
    
    A descrição deve ser persuasiva, destacando os diferenciais rurais, o relevo, a qualidade do solo e o potencial produtivo.`;

  const client = getAI();
  if (!client) {
    return 'Funcionalidade de IA não disponível. Configure VITE_GEMINI_API_KEY.';
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Você é um mestre em copywriting imobiliário brasileiro.',
        temperature: 0.7,
      },
    });
    return response.text || 'Descrição não gerada.';
  } catch (error) {
    logger.error('Error generating description:', error);
    return 'Erro ao gerar descrição com IA.';
  }
};

export const matchLeadWithProperties = async (
  lead: Lead,
  properties: Property[]
) => {
  const propertySummary = properties.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    features: p.features,
    location: p.location.neighborhood,
  }));

  const prompt = `Analise o perfil do cliente abaixo e recomende os 3 melhores imóveis da lista fornecida que mais se adequam às suas necessidades.
    Cliente: ${lead.name}, Budget: R$ ${lead.budget}, Preferências: ${JSON.stringify(lead.preferences)}
    
    Imóveis: ${JSON.stringify(propertySummary)}
    
    Retorne uma justificativa para cada recomendação.`;

  const client = getAI();
  if (!client) {
    return 'Funcionalidade de IA não disponível. Configure VITE_GEMINI_API_KEY.';
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Você é um consultor imobiliário experiente que foca em matching de alta conversão.',
      },
    });
    return response.text || 'Nenhuma recomendação disponível.';
  } catch (error) {
    logger.error('Error matching lead:', error);
    return 'Erro ao processar recomendações com IA.';
  }
};

export const geminiService = {
  generateText: async (prompt: string) => {
    const client = getAI();
    if (!client) return '{}';

    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          temperature: 0.2, // Mais preciso para JSON
        },
      });
      return response.text || '{}';
    } catch (error) {
      logger.error('Error generating text:', error);
      return '{}';
    }
  },

  extractColorsFromLogo: async (base64Image: string, mimeType: string) => {
    const client = getAI();
    if (!client) {
      // Retorna uma paleta padrão fallback
      return { primaryColor: '#2563eb', secondaryColor: '#10b981' };
    }

    try {
      const prompt = `Analise a logomarca fornecida nesta imagem.
Extraia a cor principal (primaryColor) e a cor secundária (secondaryColor) dessa marca garantindo que haja um bom contraste caso as duas sejam usadas juntas.
Retorne APENAS um JSON no formato:
{
  "primaryColor": "#HEX",
  "secondaryColor": "#HEX"
}`;

      // Remove the data URL prefix if present
      const cleanBase64 = base64Image.replace(
        /^data:image\/[a-z]+;base64,/,
        ''
      );

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          prompt,
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType || 'image/png',
            },
          },
        ],
        config: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '{}';
      const cleanJson = text
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(cleanJson);

      return {
        primaryColor: parsed.primaryColor || '#2563eb',
        secondaryColor: parsed.secondaryColor || '#10b981',
      };
    } catch (error) {
      logger.error('Error extracting colors from logo via Gemini:', error);
      return { primaryColor: '#2563eb', secondaryColor: '#10b981' };
    }
  },
};
