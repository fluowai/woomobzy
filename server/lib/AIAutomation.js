import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseServer } from './supabase-server.js';
import { matchLeadProperties } from '../services/leadPropertyMatcher.js';

export class AIAutomationEngine {
  constructor(apiKey) {
    this.defaultApiKey = apiKey;
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model = this.genAI ? this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;
  }

  async _ensureModel(organizationId) {
    const supabase = getSupabaseServer();
    const { data: settings } = organizationId
      ? await supabase
          .from('site_settings')
          .select('integrations')
          .eq('organization_id', organizationId)
          .maybeSingle()
      : { data: null };

    const dbKey = settings?.integrations?.gemini?.apiKey || settings?.integrations?.groq?.apiKey;
    const finalKey = dbKey || this.defaultApiKey;

    if (!finalKey) throw new Error('Nenhuma chave de IA configurada para esta organizacao.');

    const genAI = new GoogleGenerativeAI(finalKey);
    return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  }

  async processIntent({ content, audioData, mimeType, organizationId, agent }) {
    try {
      const model = await this._ensureModel(organizationId);
      const parts = [];

      if (audioData) {
        parts.push({
          inlineData: {
            data: audioData.toString('base64'),
            mimeType: mimeType || 'audio/ogg; codecs=opus',
          },
        });
      }

      parts.push({
        text: `
Analise a mensagem de um cliente imobiliario e responda apenas JSON valido.

Mensagem:
${content || 'Midia sem texto.'}

Agente ativo:
- Nome: ${agent?.name || 'Agente IMOBZY'}
- Funcao: ${agent?.role || 'Atendimento imobiliario'}
- Personalidade: ${agent?.personality || 'consultiva, clara e objetiva'}
- Estilo: ${agent?.response_style || 'consultivo'}
- Capacidades: ${(agent?.capabilities || []).join(', ') || 'qualificar lead, criar kanban, etiquetar atendimento'}
- Ferramentas: ${(agent?.tools || []).join(', ') || 'whatsapp, kanban, follow-up'}
- Instrucoes: ${agent?.instructions || 'Atenda com foco em qualificar e avancar o cliente para o proximo passo comercial.'}

Etapas do kanban:
- Novo: primeiro contato ou saudacao.
- Qualificacao: precisa entender perfil, cidade, orcamento, urgencia, tipo de imovel.
- Visita: quer visitar, marcou horario ou pediu localizacao para visita.
- Simulacao: falou de proposta, financiamento, entrada, parcelas, negociacao ou valores.
- Documentacao: enviou/pediu RG, CPF, comprovante, matricula, contrato, PDF ou documento.
- Fechado: confirmou compra, aluguel ou aceite.
- Perdido: desistiu, nao tem perfil ou contato improdutivo.

Formato:
{
  "transcricao": "se for audio, transcreva aqui; senao vazio",
  "intent": "resumo curto",
  "suggestedStage": "Novo | Qualificacao | Visita | Simulacao | Documentacao | Fechado | Perdido",
  "classification": "Alta Prioridade | Interessado | Curioso | Documentacao | Financeiro",
  "tags": ["ate 3 etiquetas curtas"],
  "leadName": "nome identificado ou vazio",
  "budget": 0,
  "followUpAt": "data ISO se houver retorno/agendamento; senao vazio",
  "reply": "resposta curta, humana e comercial para o agente enviar"
}`,
      });

      const result = await model.generateContent(parts);
      const text = result.response.text();
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err) {
      console.error('[AIAutomation] Erro no processamento IA:', err.message);
      return null;
    }
  }

  async handleLeadUpdate(organizationId, phone, messageParams) {
    return this.handleWhatsAppMessage({
      tenant_id: organizationId,
      message: {
        sender_phone: phone,
        sender_name: phone,
        content: messageParams.content,
        type: messageParams.audioData ? 'audio' : 'text',
      },
      chat: {},
    });
  }

  async handleWhatsAppMessage(payload) {
    const supabase = getSupabaseServer();
    const organizationId = payload.tenant_id || (await this._resolveOrganizationId(payload.instance_id));
    const message = payload.message || {};
    const chat = payload.chat || {};

    if (!organizationId || message.is_from_me || !message.sender_phone) {
      return { skipped: true, reason: 'missing organization or sender' };
    }

    const normalizedPhone = String(message.sender_phone).replace(/\D/g, '');
    const mediaHint = this._buildMediaHint(message);
    const content = [message.content, mediaHint].filter(Boolean).join('\n');
    const agent = await this._loadActiveAgent(supabase, organizationId, message.type);
    const aiResult = await this.processIntent({
      content,
      organizationId,
      mimeType: message.media_mimetype,
      agent,
    });

    const stage = this._normalizeStage(aiResult?.suggestedStage, message.type);
    const name = aiResult?.leadName || message.sender_name || chat.name || normalizedPhone;
    const tags = this._normalizeTags(aiResult?.tags, message);
    const noteLine = this._buildNoteLine({ aiResult, message, chat, tags });

    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    let lead;
    if (existingLead) {
      const updates = {
        name: existingLead.name || name,
        status: this._shouldAdvance(existingLead.status, stage) ? stage : existingLead.status,
        classification: aiResult?.classification || existingLead.classification,
        notes: [existingLead.notes, noteLine].filter(Boolean).join('\n\n'),
        chat_jid: chat.chat_jid || existingLead.chat_jid,
        last_contacted_at: new Date().toISOString(),
      };

      if (aiResult?.budget && !existingLead.budget) updates.budget = aiResult.budget;

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', existingLead.id)
        .select()
        .single();
      if (error) throw error;
      lead = data;
    } else {
      const { data, error } = await supabase
        .from('leads')
        .insert({
          organization_id: organizationId,
          name,
          phone: normalizedPhone,
          source: 'WhatsApp IA',
          status: stage,
          classification: aiResult?.classification || 'Interessado',
          notes: noteLine,
          chat_jid: chat.chat_jid,
          budget: aiResult?.budget || null,
          last_contacted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      lead = data;
    }

    await this._insertActivity(supabase, {
      leadId: lead.id,
      organizationId,
      type: 'WhatsApp IA',
      description: aiResult?.intent || message.content || mediaHint || 'Mensagem recebida no WhatsApp',
      metadata: { tags, aiResult, agent_id: agent?.id, message_id: message.message_id, media_url: message.media_url },
    });

    await this._upsertTags(supabase, { leadId: lead.id, organizationId, tags });
    await this._upsertFollowUp(supabase, { leadId: lead.id, organizationId, aiResult });

    try {
      lead = await matchLeadProperties({ supabase, lead, organizationId });
    } catch (error) {
      console.warn('[AIAutomation] Matchmaking indisponivel:', error.message);
    }

    return { lead_id: lead.id, status: lead.status, tags };
  }

  async handleImportedWhatsAppConversations(payload = {}) {
    const supabase = getSupabaseServer();
    const instanceId = payload.instance_id;
    const organizationId = payload.tenant_id || (await this._resolveOrganizationId(instanceId));
    const limit = Math.min(Math.max(Number(payload.limit) || 100, 1), 200);
    const chatIds = Array.isArray(payload.chat_ids)
      ? payload.chat_ids.filter(Boolean).slice(0, limit)
      : [];

    if (!organizationId || !instanceId) {
      return { skipped: true, reason: 'missing organization or instance' };
    }

    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id, tenant_id')
      .eq('id', instanceId)
      .maybeSingle();

    if (!instance || instance.tenant_id !== organizationId) {
      return { skipped: true, reason: 'instance does not belong to organization' };
    }

    let query = supabase
      .from('whatsapp_chats')
      .select('id, instance_id, chat_jid, name, is_group, last_message_at')
      .eq('instance_id', instanceId)
      .eq('is_group', false)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (chatIds.length) {
      query = query.in('id', chatIds);
    }

    const { data: chats, error } = await query;
    if (error) throw error;

    const results = [];
    for (const chat of chats || []) {
      try {
        const result = await this._analyzeImportedChat({
          supabase,
          organizationId,
          instanceId,
          chat,
        });
        if (result) results.push(result);
      } catch (err) {
        console.warn('[AIAutomation] Falha ao analisar conversa importada:', chat.id, err.message);
        results.push({ chat_id: chat.id, error: err.message });
      }
    }

    return {
      analyzed: results.filter((item) => item?.lead_id).length,
      total: chats?.length || 0,
      results,
    };
  }

  async _analyzeImportedChat({ supabase, organizationId, instanceId, chat }) {
    const { data: recentMessages, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', instanceId)
      .eq('chat_id', chat.id)
      .order('timestamp', { ascending: false })
      .limit(80);

    if (error) throw error;

    const messages = (recentMessages || []).reverse();
    const inboundMessages = messages.filter((msg) => !msg.is_from_me && msg.sender_phone);
    if (!inboundMessages.length) {
      return { chat_id: chat.id, skipped: true, reason: 'no client messages' };
    }

    const normalizedPhone = String(
      inboundMessages[inboundMessages.length - 1]?.sender_phone || this._phoneFromChatJid(chat.chat_jid)
    ).replace(/\D/g, '');

    if (!normalizedPhone) {
      return { chat_id: chat.id, skipped: true, reason: 'missing phone' };
    }

    const transcript = messages
      .map((msg) => {
        const author = msg.is_from_me ? 'Atendente' : 'Cliente';
        const content = msg.content || this._buildMediaHint(msg) || `[${msg.type || 'mensagem'}]`;
        const when = msg.timestamp ? new Date(msg.timestamp).toLocaleString('pt-BR') : '';
        return `${when} - ${author}: ${content}`;
      })
      .join('\n')
      .slice(-12000);

    const aiResult = await this.processConversationImport({
      transcript,
      chat,
      organizationId,
    });

    const stage = this._normalizeStage(aiResult?.suggestedStage, 'text');
    const name = aiResult?.leadName || chat.name || inboundMessages[inboundMessages.length - 1]?.sender_name || normalizedPhone;
    const tags = this._normalizeTags(aiResult?.tags, {});
    const noteLine = this._buildImportNoteLine({ aiResult, chat, tags, transcript });

    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    let lead;
    if (existingLead) {
      const updates = {
        name: existingLead.name || name,
        status: this._shouldAdvance(existingLead.status, stage) ? stage : existingLead.status,
        classification: aiResult?.classification || existingLead.classification,
        notes: [existingLead.notes, noteLine].filter(Boolean).join('\n\n'),
        chat_jid: chat.chat_jid || existingLead.chat_jid,
        last_contacted_at: new Date().toISOString(),
      };
      if (aiResult?.budget && !existingLead.budget) updates.budget = aiResult.budget;

      const { data, error: updateError } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', existingLead.id)
        .select()
        .single();
      if (updateError) throw updateError;
      lead = data;
    } else {
      const { data, error: insertError } = await supabase
        .from('leads')
        .insert({
          organization_id: organizationId,
          name,
          phone: normalizedPhone,
          source: 'WhatsApp Importado IA',
          status: stage,
          classification: aiResult?.classification || 'Interessado',
          notes: noteLine,
          chat_jid: chat.chat_jid,
          budget: aiResult?.budget || null,
          last_contacted_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (insertError) throw insertError;
      lead = data;
    }

    await this._insertActivity(supabase, {
      leadId: lead.id,
      organizationId,
      type: 'WhatsApp Importado IA',
      description: aiResult?.intent || 'Conversa importada e analisada pela IA',
      metadata: {
        tags,
        aiResult,
        chat_id: chat.id,
        imported_message_count: messages.length,
      },
    });

    await this._upsertTags(supabase, { leadId: lead.id, organizationId, tags });
    await this._upsertFollowUp(supabase, { leadId: lead.id, organizationId, aiResult });

    try {
      lead = await matchLeadProperties({ supabase, lead, organizationId });
    } catch (error) {
      console.warn('[AIAutomation] Matchmaking da importacao indisponivel:', error.message);
    }

    return { chat_id: chat.id, lead_id: lead.id, status: lead.status, tags };
  }

  async processConversationImport({ transcript, chat, organizationId }) {
    try {
      const model = await this._ensureModel(organizationId);
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `
Analise esta conversa historica de WhatsApp de uma imobiliaria e responda apenas JSON valido.

Chat: ${chat?.name || chat?.chat_jid || 'sem nome'}

Conversa:
${transcript || 'Sem texto renderizavel.'}

Objetivo:
- Identificar ou atualizar o lead no CRM.
- Resumir necessidades, imovel desejado, cidade/regiao, orcamento, urgencia e proximas acoes.
- Escolher a etapa correta do funil.

Etapas do funil:
Novo, Qualificacao, Visita, Simulacao, Documentacao, Fechado, Perdido.

Formato:
{
  "intent": "resumo comercial curto da conversa",
  "suggestedStage": "Novo | Qualificacao | Visita | Simulacao | Documentacao | Fechado | Perdido",
  "classification": "Alta Prioridade | Interessado | Curioso | Documentacao | Financeiro",
  "tags": ["ate 6 etiquetas curtas"],
  "leadName": "nome identificado ou vazio",
  "budget": 0,
  "followUpAt": "data ISO se houver compromisso claro; senao vazio",
  "reply": "proxima resposta sugerida ao corretor"
}`,
              },
            ],
          },
        ],
      });
      const text = result.response.text();
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch (err) {
      console.error('[AIAutomation] Erro ao analisar conversa importada:', err.message);
      return {
        intent: 'Conversa importada do WhatsApp para organizacao do CRM.',
        suggestedStage: 'Novo',
        classification: 'Interessado',
        tags: ['whatsapp-importado'],
        leadName: '',
        budget: 0,
        followUpAt: '',
        reply: '',
      };
    }
  }

  async _loadActiveAgent(supabase, organizationId, messageType) {
    const preferredTool = messageType === 'audio' ? 'audio-stt' : messageType === 'document' ? 'pdf-reader' : 'whatsapp';
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.warn('[AIAutomation] Agentes nao carregados:', error.message);
      return null;
    }

    return (data || []).find((agent) => (agent.tools || []).includes(preferredTool)) || data?.[0] || null;
  }

  async _resolveOrganizationId(instanceId) {
    if (!instanceId) return null;
    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from('whatsapp_instances')
      .select('tenant_id')
      .eq('id', instanceId)
      .maybeSingle();
    return data?.tenant_id || null;
  }

  _normalizeStage(stage, messageType) {
    const raw = String(stage || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (messageType === 'document') return 'Documentação';
    if (raw.includes('document')) return 'Documentação';
    if (raw.includes('simul') || raw.includes('proposta') || raw.includes('finance')) return 'Simulação';
    if (raw.includes('visita')) return 'Visita';
    if (raw.includes('fechado')) return 'Fechado';
    if (raw.includes('perdido')) return 'Perdido';
    if (raw.includes('qual') || raw.includes('atendimento')) return 'Qualificação';
    return 'Novo';
  }

  _shouldAdvance(current, next) {
    const stages = ['Novo', 'Qualificação', 'Visita', 'Simulação', 'Documentação', 'Fechado', 'Perdido'];
    if (next === 'Perdido') return true;
    return stages.indexOf(next) > stages.indexOf(current);
  }

  _buildMediaHint(message) {
    if (!message?.type || message.type === 'text') return '';
    return {
      audio: 'Audio recebido para transcricao e qualificacao.',
      document: `Documento recebido: ${message.media_filename || 'arquivo'}.`,
      image: 'Imagem recebida no atendimento.',
      video: 'Video recebido no atendimento.',
    }[message.type] || `Midia recebida: ${message.type}.`;
  }

  _normalizeTags(tags = [], message = {}) {
    const base = Array.isArray(tags) ? tags : [];
    if (message.type === 'audio') base.push('audio');
    if (message.type === 'document') base.push('documento');
    if (message.media_mimetype?.includes('pdf')) base.push('pdf');
    return [...new Set(base.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 6);
  }

  _buildNoteLine({ aiResult, message, chat, tags }) {
    const text = aiResult?.transcricao || message.content || this._buildMediaHint(message) || 'Mensagem sem texto';
    return `[WhatsApp IA - ${new Date().toLocaleString('pt-BR')}]\nChat: ${chat.name || chat.chat_jid || 'sem nome'}\nResumo: ${aiResult?.intent || text}\nEtiquetas: ${tags.join(', ') || 'sem etiquetas'}\nResposta sugerida: ${aiResult?.reply || 'sem sugestao'}`;
  }

  _buildImportNoteLine({ aiResult, chat, tags, transcript }) {
    const fallback = transcript ? transcript.split('\n').slice(-5).join('\n') : 'Conversa sem texto renderizavel';
    return `[Importacao WhatsApp IA - ${new Date().toLocaleString('pt-BR')}]\nChat: ${chat.name || chat.chat_jid || 'sem nome'}\nResumo: ${aiResult?.intent || fallback}\nEtiquetas: ${tags.join(', ') || 'sem etiquetas'}\nProxima acao sugerida: ${aiResult?.reply || 'sem sugestao'}`;
  }

  _phoneFromChatJid(jid = '') {
    return String(jid).split('@')[0].replace(/\D/g, '');
  }

  async _insertActivity(supabase, activity) {
    const { error } = await supabase.from('lead_activities').insert({
      lead_id: activity.leadId,
      organization_id: activity.organizationId,
      type: activity.type,
      description: activity.description,
      metadata: activity.metadata || {},
    });
    if (error) console.warn('[AIAutomation] Atividade nao registrada:', error.message);
  }

  async _upsertTags(supabase, { leadId, organizationId, tags }) {
    if (!tags?.length) return;
    const rows = tags.map((tag) => ({ lead_id: leadId, organization_id: organizationId, tag }));
    const { error } = await supabase.from('lead_tags').upsert(rows, { onConflict: 'lead_id,tag' });
    if (error) console.warn('[AIAutomation] Tags nao registradas:', error.message);
  }

  async _upsertFollowUp(supabase, { leadId, organizationId, aiResult }) {
    if (!aiResult?.followUpAt) return;
    const dueAt = new Date(aiResult.followUpAt);
    if (Number.isNaN(dueAt.getTime())) return;
    const { error } = await supabase.from('lead_followups').insert({
      lead_id: leadId,
      organization_id: organizationId,
      due_at: dueAt.toISOString(),
      title: 'Retorno sugerido pela IA',
      notes: aiResult.intent || aiResult.reply || '',
      status: 'pending',
    });
    if (error) console.warn('[AIAutomation] Follow-up nao registrado:', error.message);
  }
}
