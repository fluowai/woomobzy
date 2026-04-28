import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseServer } from './supabase-server.js';

/**
 * AI Automation Engine
 * Handles message processing (text/audio) to automate Kanban actions.
 */
export class AIAutomationEngine {
  constructor(apiKey) {
    this.defaultApiKey = apiKey;
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model = this.genAI ? this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;
  }

  async _ensureModel(organizationId) {
    if (this.model && !organizationId) return this.model;

    // Se temos organizationId, tentamos carregar a chave específica do banco
    const supabase = getSupabaseServer();
    const { data: settings } = await supabase
      .from('site_settings')
      .select('integrations')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const dbKey = settings?.integrations?.gemini?.apiKey || settings?.integrations?.groq?.apiKey;
    const finalKey = dbKey || this.defaultApiKey;

    if (!finalKey) throw new Error('Nenhuma chave de API de IA configurada para esta organização.');

    const genAI = new GoogleGenerativeAI(finalKey);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  /**
   * Process a message to decide Kanban actions.
   * @param {Object} params 
   * @param {string} params.content Text content or transcription
   * @param {Buffer} params.audioData Optional audio buffer
   * @param {string} params.mimeType Optional audio mime type
   * @param {string} params.organizationId Optional for dynamic keys
   * @returns {Object} result { intent, suggestedStage, summary }
   */
  async processIntent({ content, audioData, mimeType, organizationId }) {
    try {
      const model = await this._ensureModel(organizationId);
      const parts = [];

      
      if (audioData) {
        parts.push({
          inlineData: {
            data: audioData.toString('base64'),
            mimeType: mimeType || 'audio/ogg; codecs=opus'
          }
        });
      }

      const prompt = `
        Analise a seguinte mensagem (texto ou áudio) de um cliente imobiliário.
        
        ${content ? `Texto: "${content}"` : 'A mensagem é um áudio.'}
        
        Identifique o status atual da conversa e sugira em qual etapa do Funil de Vendas o lead deve ser colocado.
        
        Etapas disponíveis:
        - "Novo": Iniciou o contato agora.
        - "Em Atendimento": Está conversando, tirando dúvidas.
        - "Visita": Manifestou interesse claro em visitar o imóvel ou agendou uma visita.
        - "Proposta": Mencionou valores, formas de pagamento ou interesse em fechar negócio.
        - "Fechado": Confirmou a compra/aluguel.
        - "Perdido": Desistiu ou não tem perfil.
        
        Responda APENAS um JSON (sem markdown) no seguinte formato:
        {
          "transcricao": "se for áudio, coloque a transcrição aqui",
          "intent": "resumo curto da intenção",
          "suggestedStage": "NOME_DO_ESTAGIO",
          "classification": "Alta Prioridade | Interessado | Curioso"
        }
      `;

      parts.push({ text: prompt });

      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();
      
      try {
        const cleanText = text.replace(/```json|```/g, '').trim();
        return JSON.parse(cleanText);
      } catch (e) {
        console.warn('[AIAutomation] Erro ao parsear JSON da IA:', text);
        return null;
      }
    } catch (err) {
      console.error('[AIAutomation] Erro no processamento Gemini:', err.message);
      return null;
    }
  }

  /**
   * Orchestrates the automation for an existing lead.
   */
  async handleLeadUpdate(organizationId, phone, messageParams) {
    const supabase = getSupabaseServer();
    
    // 1. Localizar o lead
    const { data: lead, error: findError } = await supabase
      .from('leads')
      .select('id, name, status, notes')
      .eq('organization_id', organizationId)
      .eq('phone', phone)
      .maybeSingle();

    if (findError || !lead) return;

    // 2. Processar a intenção via IA
    const aiResult = await this.processIntent({ ...messageParams, organizationId });
    
    if (!aiResult || !aiResult.suggestedStage) return;

    // 3. Decidir se deve mover
    // Só movemos para estágios "mais avançados" ou se houver mudança clara
    const stages = ['Novo', 'Em Atendimento', 'Visita', 'Proposta', 'Fechado', 'Perdido'];
    const currentIdx = stages.indexOf(lead.status);
    const suggestedIdx = stages.indexOf(aiResult.suggestedStage);

    const shouldUpdate = suggestedIdx > currentIdx || aiResult.suggestedStage === 'Perdido';

    if (shouldUpdate) {
      console.log(`[AIAutomation] Automovendo Lead ${lead.name} (${phone}) para ${aiResult.suggestedStage}`);
      
      await supabase
        .from('leads')
        .update({ 
          status: aiResult.suggestedStage,
          classification: aiResult.classification || lead.classification,
          notes: lead.notes + '\n\n' + `[IA AUTOMATION - ${new Date().toLocaleDateString()}]: ` + (aiResult.transcricao || aiResult.intent)
        })
        .eq('id', lead.id);
        
      return { moved: true, to: aiResult.suggestedStage };
    }
    
    return { moved: false };
  }
}
