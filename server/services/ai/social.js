import { getLLMOrchestrator } from './llmProvider.js';
import logger from '../../utils/logger.js';

export async function generateSocialCaption(propertyData, platform = 'instagram') {
    try {
        const orchestrator = getLLMOrchestrator();
        
        const systemPrompt = `Você é um especialista em marketing digital e copywriter imobiliário.
        Crie uma legenda altamente engajadora para o seguinte imóvel, otimizada para ${platform}.
        Regras:
        - Use emojis adequados.
        - Inclua hashtags relevantes.
        - Se for Instagram, foque em gatilhos mentais visuais.
        - Se for Facebook, foque em storytelling.
        - Não coloque informações de contato placeholders (telefone, site), apenas o texto da legenda.
        `;

        const userPrompt = `Detalhes do imóvel:
        - Título: ${propertyData.title || 'Imóvel'}
        - Tipo: ${propertyData.property_type || 'Residencial'}
        - Quartos: ${propertyData.bedrooms || 0}
        - Banheiros: ${propertyData.bathrooms || 0}
        - Área: ${propertyData.area || 0} m²
        - Preço: R$ ${propertyData.price || 'Consulte'}
        - Descrição: ${propertyData.description || 'Ótima oportunidade!'}
        `;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ];

        // Usamos 'summarization' que cai no GPT-4o-mini ou Llama-3.1-70b
        const response = await orchestrator.chat(messages, 'summarization', { temperature: 0.7 });
        return response.content;
    } catch (error) {
        logger.error('Erro ao gerar legenda social via IA', { error: error.message });
        throw error;
    }
}
