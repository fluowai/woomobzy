import { logger } from '@/utils/logger';
import { callApi } from '../src/lib/api';
import { Property, Lead } from '../types';

const callSecureAI = async (prompt: string, systemInstruction?: string, options: { temperature?: number; jsonMode?: boolean; organizationId?: string } = {}) => {
  try {
    const data = await callApi('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        systemInstruction,
        temperature: options.temperature ?? 0.7,
        jsonMode: options.jsonMode ?? false,
        organizationId: options.organizationId
      })
    });
    return data.text || '';
  } catch (error: any) {
    logger.error('Error calling Secure AI:', error.message);
    return '';
  }
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

  const response = await callSecureAI(prompt, 'Você é um mestre em copywriting imobiliário brasileiro.');
  return response || 'Descrição não gerada.';
};

export const matchLeadWithProperties = async (
  lead: Lead,
  properties: Property[]
) => {
  const propertySummary = properties.map((p) => ({
    id: p.id,
    title: p.title,
    price: p.price,
    type: p.type,
    location: `${p.location.city}, ${p.location.state}`,
    features: {
      area: p.features.areaHectares || p.features.areaM2,
      aptitude: p.aptitude,
      topography: p.features.topography,
      rooms: p.features.dormitorios,
      suites: p.features.suites,
      parking: p.features.vagas,
    }
  }));

  const prompt = `Analise o perfil do lead e recomende os 3 melhores imóveis da lista que mais se adequam às suas necessidades e potencial de investimento.

    DADOS DO LEAD:
    - Nome: ${lead.name}
    - Orçamento: R$ ${lead.budget || 'Não informado'}
    - Notas/Histórico: ${lead.notes || 'Sem notas'}
    - Preferências: ${JSON.stringify(lead.preferences || {})}
    - Interesse Atual: ${lead.property?.title || 'Nenhum imóvel específico'}
    
    LISTA DE IMÓVEIS DISPONÍVEIS:
    ${JSON.stringify(propertySummary)}
    
    Sua tarefa é:
    1. Entender o perfil do investidor/cliente com base nas notas e dados.
    2. Selecionar até 3 imóveis que fazem mais sentido.
    3. Para cada um, forneça uma justificativa curta e persuasiva (máximo 2 frases).
    
    Retorne a resposta EXCLUSIVAMENTE em formato JSON:
    {
      "profile_analysis": "Breve descrição do perfil identificado",
      "recommendations": [
        {
          "property_id": "id_do_imovel",
          "justification": "Sua justificativa aqui"
        }
      ]
    }`;

  const response = await callSecureAI(prompt, 'Você é um consultor imobiliário especialista em inteligência de mercado e matching de leads.', { 
    jsonMode: true,
    organizationId: lead.organization_id
  });
  try {
    const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    logger.error('Failed to parse AI response', e);
    return null;
  }
};

export const generateCollectionMessage = async (
  clientName: string,
  debtAmount: number,
  daysLate: number
) => {
  const prompt = `Crie uma mensagem de WhatsApp para o cliente ${clientName} que deve ${debtAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} e está com ${daysLate} dias de atraso. O tom deve ser profissional, empático e focado em negociação.`;
  return callSecureAI(prompt, 'Você é um assistente de cobrança especializado em imobiliárias e loteadoras 360.');
};

export const geminiService = {
  generateText: async (prompt: string) => {
    return callSecureAI(prompt, undefined, { temperature: 0.2 });
  },

  extractColorsFromLogo: async (base64Image: string, mimeType: string) => {
    try {
      // NOTE: For image analysis, the proxy needs to support multi-part or base64.
      // For now, we fallback to a smart guess based on the brand or standard palette
      // as image uploads to proxy require more complexity.
      // Alternatively, we could send the base64 in the JSON.
      
      const prompt = `Analise a marca descrita e sugira uma paleta de cores primária e secundária.
      Retorne APENAS um JSON no formato:
      {
        "primaryColor": "#HEX",
        "secondaryColor": "#HEX"
      }`;

      const response = await callSecureAI(prompt, 'Você é um designer especialista em branding imobiliário.', { jsonMode: true });
      const cleanJson = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson || '{}');

      return {
        primaryColor: parsed.primaryColor || '#2563eb',
        secondaryColor: parsed.secondaryColor || '#10b981',
      };
    } catch (error) {
      return { primaryColor: '#2563eb', secondaryColor: '#10b981' };
    }
  },
};
