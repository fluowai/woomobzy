import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseServer } from './supabase-server.js';
import { matchLeadProperties } from '../services/leadPropertyMatcher.js';

const ENHANCED_LEAD_COLUMNS = [
  'lead_score',
  'ai_profile',
  'ai_next_action',
  'ai_last_intent',
  'ai_last_confidence',
  'next_follow_up_at',
  'next_visit_at',
  'preferences',
  'aptitude_interest',
];

const PERSONAL_LEAD_TYPES = ['familia', 'amigo', 'fornecedor', 'interno', 'spam', 'pessoal', 'outro'];
const PERSONAL_STAGE = 'Pessoal';

export class AIAutomationEngine {
  constructor(apiKey) {
    const validKey = apiKey && !apiKey.includes('YOUR_') && apiKey.length > 20;
    this.defaultApiKey = validKey ? apiKey : null;
    this.genAI = validKey ? new GoogleGenerativeAI(apiKey) : null;
    this.model = this.genAI ? this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;
    if (!validKey) {
      console.warn('[AIAutomation] GEMINI_API_KEY inválida ou não configurada. Automação de IA desativada.');
    }
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

  async _getConversationMemory(organizationId, phone, limit = 10) {
    try {
      const supabase = getSupabaseServer();
      const sessionId = `whatsapp_${phone}`;

      const { data } = await supabase
        .from('conversation_memory')
        .select('role, content')
        .eq('organization_id', organizationId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (data || []).reverse();
    } catch (err) {
      console.warn('[Memory] Erro ao carregar memoria:', err.message);
      return [];
    }
  }

  async _saveConversationMemory(organizationId, agentId, phone, role, content) {
    try {
      const supabase = getSupabaseServer();
      const sessionId = `whatsapp_${phone}`;

      await supabase.from('conversation_memory').insert({
        organization_id: organizationId,
        agent_id: agentId || null,
        session_id: sessionId,
        role,
        content: String(content).slice(0, 3000),
      });
    } catch (err) {
      console.warn('[Memory] Erro ao salvar memoria:', err.message);
    }
  }

  async processIntent({ content, audioData, mimeType, organizationId, agent, phone }) {
    try {
      const model = await this._ensureModel(organizationId);
      const parts = [];

      const history = phone
        ? await this._getConversationMemory(organizationId, phone, 8)
        : [];

      if (audioData) {
        parts.push({
          inlineData: {
            data: audioData.toString('base64'),
            mimeType: mimeType || 'audio/ogg; codecs=opus',
          },
        });
      }

      const historyBlock = history.length
        ? `\nHISTORICO DA CONVERSA (NÃO repita perguntas ja respondidas aqui):\n${history.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')}\n`
        : '\n(Inicio da conversa)\n';

      parts.push({
        text: `
Analise a mensagem de um cliente imobiliario e responda apenas JSON valido.

Mensagem:
${content || 'Midia sem texto.'}
${historyBlock} 

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

Filtro obrigatorio:
- So marque shouldCreateLead=true quando a conversa for de cliente/prospect imobiliario ou lead ja qualificado.
- Familia, amigos, assuntos pessoais, fornecedores, spam, grupos, conversas internas, links soltos e mensagens sem intencao imobiliaria devem ser shouldCreateLead=false.
- Se for conversa pessoal, mantenha shouldCreateLead=false, classifique leadType e crie tags como pessoal/familia/amigo/fornecedor/interno.
- Se for apenas saudacao sem contexto, use shouldCreateLead=true somente se houver indicio comercial, nome de imovel, CAR, fazenda, casa, aluguel, compra, venda, visita, proposta ou pergunta imobiliaria.
- leadName deve ser nome por extenso quando houver nome no contato ou na conversa; nao use apenas iniciais.

Modo operacional:
- Atue primeiro como SDR imobiliario: recepcione, qualifique e avance o lead antes de vender o imovel.
- Descubra operacao, tipo de imovel, cidade/regiao, faixa de investimento, prazo, forma de pagamento e motivo da busca.
- Nao despeje lista de imoveis no primeiro contato se faltarem dados essenciais; faca no maximo 2 perguntas objetivas por mensagem.
- Recomende imoveis somente quando o lead pedir opcoes, citar um imovel especifico, demonstrar alta intencao ou ja tiver perfil minimo qualificado.
- Se houver imoveis aderentes, convide para proximo passo: detalhe, visita, simulacao ou corretor humano.
- Extraia dados para o CRM, nao apenas uma resposta de chat.
- leadScore deve ser 0-100, combinando urgencia, orcamento, clareza de interesse, visita/proposta e qualidade do contato.
- nextAction.type deve ser: qualify, recommend_property, schedule_visit, follow_up, collect_documents, notify_broker, close_deal, mark_lost.
- Se houver pedido de visita ou horario claro, preencha visit.requested=true e visit.scheduledAt.
- Se houver promessa de retorno, preencha nextAction.dueAt ou followUpAt em ISO.
- reply deve ser curta, humana e com postura de SDR. Quando faltarem dados, pergunte apenas os proximos dados mais importantes.

Formato:
{
  "shouldCreateLead": true,
  "leadType": "cliente | familia | amigo | fornecedor | interno | spam | outro",
  "confidence": 0.0,
  "transcricao": "se for audio, transcreva aqui; senao vazio",
  "intent": "resumo curto",
  "suggestedStage": "Novo | Qualificacao | Visita | Simulacao | Documentacao | Fechado | Perdido",
  "classification": "Alta Prioridade | Interessado | Curioso | Documentacao | Financeiro",
  "leadScore": 0,
  "temperature": "frio | morno | quente",
  "tags": ["ate 3 etiquetas curtas"],
  "leadName": "nome identificado ou vazio",
  "budget": 0,
  "interestProfile": {
    "operation": "compra | venda | aluguel | arrendamento | captacao | indefinido",
    "propertyType": "casa | apartamento | terreno | fazenda | sitio | chacara | comercial | indefinido",
    "city": "",
    "region": "",
    "payment": "vista | financiamento | parcelado | indefinido",
    "timeline": "imediato | 7_dias | 30_dias | 90_dias | indefinido",
    "missingFields": ["campos que faltam para qualificar"]
  },
  "nextAction": {
    "type": "qualify | recommend_property | schedule_visit | follow_up | collect_documents | notify_broker | close_deal | mark_lost",
    "title": "acao curta para o CRM",
    "dueAt": "data ISO se existir prazo",
    "reason": "por que esta acao e a proxima melhor"
  },
  "visit": {
    "requested": false,
    "scheduledAt": "data ISO se marcado",
    "propertyHint": "",
    "notes": ""
  },
  "handoffRequired": false,
  "handoffReason": "",
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

    if (message.is_group || chat.is_group || this._isGroupJid(chat.chat_jid)) {
      return { skipped: true, reason: 'group messages are not sent to CRM' };
    }

    const normalizedPhone = this._normalizeBRPhone(message.sender_phone);
    if (!normalizedPhone) {
      return { skipped: true, reason: 'invalid sender phone' };
    }

    const mediaHint = this._buildMediaHint(message);
    const content = [message.content, mediaHint].filter(Boolean).join('\n');
    const agent = await this._loadActiveAgent(supabase, organizationId, message.type, {
      instanceId: payload.instance_id,
      instanceName: payload.instance_name,
    });
    const audioData = message.type === 'audio' ? await this._downloadMediaForAI(message) : null;
    const aiResult = await this.processIntent({
      content,
      audioData,
      organizationId,
      mimeType: message.media_mimetype,
      agent,
      phone: normalizedPhone,
    });
    const actionPlan = this._buildActionPlan({ aiResult, text: content, messageType: message.type });

    await this._saveConversationMemory(organizationId, agent?.id, normalizedPhone, 'user', content);

    const existingLead = await this._findLeadByNormalizedPhone(supabase, organizationId, normalizedPhone);

    const isCommercialLead = this._shouldCreateLeadFromAI(actionPlan, content);
    const isPersonalConversation = this._isPersonalConversation(actionPlan, content);

    if (!isCommercialLead) {
      if (isPersonalConversation) {
        return {
          skipped: true,
          stopped: true,
          reason: actionPlan.leadType || 'personal conversation ignored',
          aiResult: actionPlan,
          should_reply: false,
        };
      }

      if (!existingLead) {
        return {
          skipped: true,
          reason: actionPlan.leadType || 'not a qualified client conversation',
          aiResult: actionPlan,
        };
      }

      return { skipped: true, reason: 'existing lead not updated by non-commercial message', aiResult: actionPlan };
    }

    const stage = actionPlan.stage;
    const name = this._resolveLeadName(actionPlan.leadName, message.sender_name, chat.name, normalizedPhone);
    const tags = this._normalizeTags(actionPlan.tags, message);
    const noteLine = this._buildNoteLine({ aiResult: actionPlan, message, chat, tags });
    const leadPatch = this._buildLeadAIPatch({
      actionPlan,
      stage,
      tags,
      existingLead,
      fallbackClassification: actionPlan.classification,
    });

    let lead;
    if (existingLead) {
      const updates = {
        name: existingLead.name || name,
        phone: normalizedPhone,
        status: this._shouldAdvance(existingLead.status, stage) ? stage : existingLead.status,
        classification: actionPlan.classification || existingLead.classification,
        notes: [existingLead.notes, noteLine].filter(Boolean).join('\n\n'),
        chat_jid: chat.chat_jid || existingLead.chat_jid,
        last_contacted_at: new Date().toISOString(),
        ...leadPatch,
      };

      if (actionPlan.budget && !existingLead.budget) updates.budget = actionPlan.budget;

      lead = await this._persistLeadUpdate(supabase, existingLead.id, updates);
    } else {
      lead = await this._persistLeadInsert(supabase, {
        organization_id: organizationId,
        name,
        phone: normalizedPhone,
        source: 'WhatsApp IA',
        status: stage,
        classification: actionPlan.classification || 'Interessado',
        notes: noteLine,
        chat_jid: chat.chat_jid,
        budget: actionPlan.budget || null,
        last_contacted_at: new Date().toISOString(),
        ...leadPatch,
      });
    }

    await this._insertActivity(supabase, {
      leadId: lead.id,
      organizationId,
      type: 'WhatsApp IA',
      description: actionPlan.intent || message.content || mediaHint || 'Mensagem recebida no WhatsApp',
      metadata: {
        tags,
        aiResult,
        actionPlan,
        agent_id: agent?.id,
        message_id: message.message_id,
        media_url: message.media_url,
        chat_id: chat.id,
        chat_jid: chat.chat_jid,
        chat_link: this._buildChatLink(chat),
      },
    });

    await this._upsertTags(supabase, { leadId: lead.id, organizationId, tags });
    await this._upsertFollowUp(supabase, { leadId: lead.id, organizationId, aiResult: actionPlan });

    let matchAvailable = false;
    try {
      lead = await matchLeadProperties({ supabase, lead, organizationId });
      matchAvailable = true;
    } catch (error) {
      console.warn('[AIAutomation] Matchmaking indisponivel:', error.message);
    }

    const reply = this._buildWhatsAppReply({ lead, actionPlan, content });
    if (reply) {
      await this._saveConversationMemory(organizationId, agent?.id, normalizedPhone, 'assistant', reply);
    }

    return {
      lead_id: lead.id,
      status: lead.status,
      tags,
      score: actionPlan.leadScore,
      next_action: actionPlan.nextAction,
      agent_id: agent?.id || null,
      agent_name: agent?.name || '',
      reply,
      opportunities: lead.matched_properties || [],
      match_summary: lead.match_summary || '',
      should_reply: this._canAutoReply(agent, { ...actionPlan, reply }, {
        allowHandoff: matchAvailable && this._hasPropertyMatches(lead) && this._shouldRecommendProperties({ actionPlan, text: content }),
      }),
    };
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

    if (chat.is_group || this._isGroupJid(chat.chat_jid)) {
      return { chat_id: chat.id, skipped: true, reason: 'group chat ignored' };
    }

    const normalizedPhone = this._normalizeBRPhone(
      inboundMessages[inboundMessages.length - 1]?.sender_phone || this._phoneFromChatJid(chat.chat_jid)
    );

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
    const actionPlan = this._buildActionPlan({ aiResult, text: transcript, messageType: 'text' });

    const existingLead = await this._findLeadByNormalizedPhone(supabase, organizationId, normalizedPhone);

    const isCommercialLead = this._shouldCreateLeadFromAI(actionPlan, transcript);
    const isPersonalConversation = this._isPersonalConversation(actionPlan, transcript);

    if (!isCommercialLead) {
      if (isPersonalConversation) {
        return {
          chat_id: chat.id,
          skipped: true,
          stopped: true,
          reason: actionPlan.leadType || 'personal conversation ignored',
        };
      }

      if (!existingLead) {
        return {
          chat_id: chat.id,
          skipped: true,
          reason: actionPlan.leadType || 'not a qualified client conversation',
        };
      }

      return { chat_id: chat.id, skipped: true, reason: 'existing lead not updated by non-commercial import' };
    }

    const stage = actionPlan.stage;
    const name = this._resolveLeadName(
      actionPlan.leadName,
      chat.name,
      inboundMessages[inboundMessages.length - 1]?.sender_name,
      normalizedPhone
    );
    const tags = this._normalizeTags(actionPlan.tags, {});
    const noteLine = this._buildImportNoteLine({ aiResult: actionPlan, chat, tags, transcript });
    const leadPatch = this._buildLeadAIPatch({
      actionPlan,
      stage,
      tags,
      existingLead,
      fallbackClassification: actionPlan.classification,
    });

    let lead;
    if (existingLead) {
      const updates = {
        name: existingLead.name || name,
        phone: normalizedPhone,
        status: this._shouldAdvance(existingLead.status, stage) ? stage : existingLead.status,
        classification: actionPlan.classification || existingLead.classification,
        notes: [existingLead.notes, noteLine].filter(Boolean).join('\n\n'),
        chat_jid: chat.chat_jid || existingLead.chat_jid,
        last_contacted_at: new Date().toISOString(),
        ...leadPatch,
      };
      if (actionPlan.budget && !existingLead.budget) updates.budget = actionPlan.budget;

      lead = await this._persistLeadUpdate(supabase, existingLead.id, updates);
    } else {
      lead = await this._persistLeadInsert(supabase, {
        organization_id: organizationId,
        name,
        phone: normalizedPhone,
        source: 'WhatsApp Importado IA',
        status: stage,
        classification: actionPlan.classification || 'Interessado',
        notes: noteLine,
        chat_jid: chat.chat_jid,
        budget: actionPlan.budget || null,
        last_contacted_at: new Date().toISOString(),
        ...leadPatch,
      });
    }

    await this._insertActivity(supabase, {
      leadId: lead.id,
      organizationId,
      type: 'WhatsApp Importado IA',
      description: actionPlan.intent || 'Conversa importada e analisada pela IA',
      metadata: {
        tags,
        aiResult,
        actionPlan,
        chat_id: chat.id,
        chat_jid: chat.chat_jid,
        chat_link: this._buildChatLink(chat),
        imported_message_count: messages.length,
      },
    });

    await this._upsertTags(supabase, { leadId: lead.id, organizationId, tags });
    await this._upsertFollowUp(supabase, { leadId: lead.id, organizationId, aiResult: actionPlan });

    try {
      lead = await matchLeadProperties({ supabase, lead, organizationId });
    } catch (error) {
      console.warn('[AIAutomation] Matchmaking da importacao indisponivel:', error.message);
    }

    return { chat_id: chat.id, lead_id: lead.id, status: lead.status, tags, score: actionPlan.leadScore };
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
- Filtrar conversas que nao sao clientes/prospects imobiliarios.
- Familia, amigos, fornecedores, assuntos pessoais, spam, grupos e conversas internas nao devem criar lead comercial.
- Se for conversa pessoal, mantenha shouldCreateLead=false, classifique leadType e crie tags como pessoal/familia/amigo/fornecedor/interno.
- leadName deve ser nome por extenso quando houver nome no contato ou na conversa; nao use apenas iniciais.

Etapas do funil:
Novo, Qualificacao, Visita, Simulacao, Documentacao, Fechado, Perdido.

Formato:
{
  "shouldCreateLead": true,
  "leadType": "cliente | familia | amigo | fornecedor | interno | spam | outro",
  "confidence": 0.0,
  "intent": "resumo comercial curto da conversa",
  "suggestedStage": "Novo | Qualificacao | Visita | Simulacao | Documentacao | Fechado | Perdido",
  "classification": "Alta Prioridade | Interessado | Curioso | Documentacao | Financeiro",
  "leadScore": 0,
  "temperature": "frio | morno | quente",
  "tags": ["ate 6 etiquetas curtas"],
  "leadName": "nome identificado ou vazio",
  "budget": 0,
  "interestProfile": {
    "operation": "compra | venda | aluguel | arrendamento | captacao | indefinido",
    "propertyType": "casa | apartamento | terreno | fazenda | sitio | chacara | comercial | indefinido",
    "city": "",
    "region": "",
    "payment": "vista | financiamento | parcelado | indefinido",
    "timeline": "imediato | 7_dias | 30_dias | 90_dias | indefinido",
    "missingFields": ["campos que faltam para qualificar"]
  },
  "nextAction": {
    "type": "qualify | recommend_property | schedule_visit | follow_up | collect_documents | notify_broker | close_deal | mark_lost",
    "title": "acao curta para o CRM",
    "dueAt": "data ISO se existir prazo",
    "reason": "por que esta acao e a proxima melhor"
  },
  "visit": {
    "requested": false,
    "scheduledAt": "data ISO se marcado",
    "propertyHint": "",
    "notes": ""
  },
  "handoffRequired": false,
  "handoffReason": "",
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
        shouldCreateLead: false,
        leadType: 'outro',
        confidence: 0,
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

  _buildActionPlan({ aiResult, text = '', messageType = 'text' }) {
    const stage = this._normalizeStage(aiResult?.suggestedStage || aiResult?.stage, messageType);
    const score = this._normalizeLeadScore(aiResult, text, stage);
    const visit = this._normalizeVisit(aiResult?.visit, aiResult?.followUpAt || aiResult?.nextAction?.dueAt, stage);
    const nextAction = this._normalizeNextAction(aiResult?.nextAction, {
      stage,
      visit,
      followUpAt: aiResult?.followUpAt,
      score,
    });
    const followUpAt = this._firstValidISO(
      visit.scheduledAt,
      nextAction.dueAt,
      aiResult?.followUpAt
    );

    return {
      ...(aiResult || {}),
      shouldCreateLead: aiResult?.shouldCreateLead,
      leadType: aiResult?.leadType || (this._hasRealEstateSignal(text) ? 'cliente' : 'outro'),
      confidence: this._clampDecimal(aiResult?.confidence, 0, 1, this._hasRealEstateSignal(text) ? 0.55 : 0),
      intent: String(aiResult?.intent || this._inferIntent(text, stage)).slice(0, 500),
      stage,
      suggestedStage: stage,
      classification: this._normalizeClassification(aiResult?.classification, score, stage),
      leadScore: score,
      temperature: aiResult?.temperature || (score >= 75 ? 'quente' : score >= 45 ? 'morno' : 'frio'),
      tags: this._enrichTags(aiResult?.tags, stage, score, visit),
      leadName: aiResult?.leadName || '',
      budget: this._normalizeMoney(aiResult?.budget),
      interestProfile: this._normalizeInterestProfile(aiResult?.interestProfile),
      nextAction,
      visit,
      followUpAt,
      handoffRequired: Boolean(aiResult?.handoffRequired || score >= 80 || visit.requested),
      handoffReason: aiResult?.handoffReason || (visit.requested ? 'Lead pediu visita' : score >= 80 ? 'Lead com alta intencao' : ''),
      reply: String(aiResult?.reply || nextAction.reason || '').slice(0, 1200),
    };
  }

  _buildLeadAIPatch({ actionPlan, stage, tags, existingLead }) {
    return {
      lead_score: actionPlan.leadScore,
      preferences: this._buildLeadPreferences(actionPlan, existingLead?.preferences),
      aptitude_interest: this._buildAptitudeInterest(actionPlan),
      ai_profile: {
        version: 'imobzy-agent-orchestrator-v1',
        temperature: actionPlan.temperature,
        stage,
        tags,
        intent: actionPlan.intent,
        confidence: actionPlan.confidence,
        interestProfile: actionPlan.interestProfile,
        nextAction: actionPlan.nextAction,
        visit: actionPlan.visit,
        handoffRequired: actionPlan.handoffRequired,
        handoffReason: actionPlan.handoffReason,
        updatedAt: new Date().toISOString(),
      },
      ai_next_action: actionPlan.nextAction?.title || actionPlan.nextAction?.type || null,
      ai_last_intent: actionPlan.intent,
      ai_last_confidence: actionPlan.confidence,
      next_follow_up_at: actionPlan.followUpAt || null,
      next_visit_at: actionPlan.visit?.scheduledAt || null,
    };
  }

  _buildLeadPreferences(actionPlan = {}, currentPreferences = {}) {
    const profile = actionPlan.interestProfile || {};
    return {
      ...(currentPreferences && typeof currentPreferences === 'object' ? currentPreferences : {}),
      operation: profile.operation || 'indefinido',
      type: profile.propertyType || 'indefinido',
      tipo: profile.propertyType || 'indefinido',
      city: profile.city || '',
      cidade: profile.city || '',
      region: profile.region || '',
      regiao: profile.region || '',
      payment: profile.payment || 'indefinido',
      timeline: profile.timeline || 'indefinido',
      budget: actionPlan.budget || 0,
      source: 'whatsapp-ai-agent',
      updatedAt: new Date().toISOString(),
    };
  }

  _buildAptitudeInterest(actionPlan = {}) {
    const profile = actionPlan.interestProfile || {};
    return [
      profile.operation,
      profile.propertyType,
      profile.city,
      profile.region,
      actionPlan.temperature,
    ].map((item) => String(item || '').trim().toLowerCase())
      .filter((item) => item && item !== 'indefinido')
      .slice(0, 8);
  }

  async _upsertPersonalConversationCard({
    supabase,
    organizationId,
    existingLead,
    actionPlan,
    message,
    chat,
    normalizedPhone,
    agent,
    tags,
    source,
    activityType,
    transcript = '',
  }) {
    const personalTags = this._normalizeTags([...tags, 'pessoal', actionPlan.leadType || 'outro'], message);
    const personalName = this._resolveLeadName(
      actionPlan.leadName,
      message.sender_name,
      chat.name,
      normalizedPhone
    );
    const noteLine = this._buildPersonalNoteLine({
      aiResult: actionPlan,
      message,
      chat,
      tags: personalTags,
      transcript,
    });
    const personalPatch = this._buildLeadAIPatch({
      actionPlan: {
        ...actionPlan,
        leadScore: Math.min(actionPlan.leadScore || 0, 35),
        nextAction: {
          type: 'follow_up',
          title: 'Conversa pessoal classificada',
          dueAt: '',
          reason: 'Contato separado do funil comercial para nao criar lead imobiliario indevido.',
        },
        followUpAt: '',
        visit: { requested: false, scheduledAt: '', propertyHint: '', notes: '' },
        handoffRequired: false,
      },
      stage: PERSONAL_STAGE,
      tags: personalTags,
    });

    const personalExisting = existingLead && this._isPersonalLead(existingLead)
      ? existingLead
      : await this._findPersonalLeadByPhone(supabase, organizationId, normalizedPhone);

    let lead;
    if (personalExisting) {
      lead = await this._persistLeadUpdate(supabase, personalExisting.id, {
        name: this._isPlaceholderName(personalExisting.name) ? personalName : personalExisting.name,
        status: PERSONAL_STAGE,
        source: personalExisting.source || source,
        classification: 'Pessoal',
        notes: [personalExisting.notes, noteLine].filter(Boolean).join('\n\n'),
        chat_jid: chat.chat_jid || personalExisting.chat_jid,
        last_contacted_at: new Date().toISOString(),
        ...personalPatch,
      });
    } else {
      lead = await this._persistLeadInsert(supabase, {
        organization_id: organizationId,
        name: personalName,
        phone: normalizedPhone,
        source,
        status: PERSONAL_STAGE,
        classification: 'Pessoal',
        notes: noteLine,
        chat_jid: chat.chat_jid,
        budget: null,
        last_contacted_at: new Date().toISOString(),
        ...personalPatch,
      });
    }

    await this._insertActivity(supabase, {
      leadId: lead.id,
      organizationId,
      type: activityType,
      description: actionPlan.intent || 'Conversa pessoal classificada pela IA',
      metadata: {
        tags: personalTags,
        aiResult: actionPlan,
        agent_id: agent?.id,
        message_id: message.message_id,
        chat_id: chat.id,
        chat_jid: chat.chat_jid,
        chat_link: this._buildChatLink(chat),
        lead_type: actionPlan.leadType || 'pessoal',
      },
    });

    await this._upsertTags(supabase, { leadId: lead.id, organizationId, tags: personalTags });

    return {
      chat_id: chat.id,
      lead_id: lead.id,
      status: lead.status,
      tags: personalTags,
      score: lead.lead_score || personalPatch.lead_score,
      personal: true,
    };
  }

  async _findPersonalLeadByPhone(supabase, organizationId, phone) {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('phone', phone)
      .or(`status.eq.${PERSONAL_STAGE},source.ilike.*Pessoal*`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  }

  async _findLeadByNormalizedPhone(supabase, organizationId, phone) {
    const normalizedPhone = this._normalizeBRPhone(phone);
    const tail = normalizedPhone.length >= 8 ? normalizedPhone.slice(-8) : normalizedPhone;
    if (!tail) return null;

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organizationId)
      .ilike('phone', `%${tail}%`)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) throw error;
    return (data || []).find((lead) => this._normalizeBRPhone(lead.phone) === normalizedPhone) || null;
  }

  _isPersonalLead(lead = {}) {
    return lead.status === PERSONAL_STAGE || String(lead.source || '').toLowerCase().includes('pessoal');
  }

  async _persistLeadUpdate(supabase, leadId, updates) {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId)
      .select()
      .single();

    if (!error) return data;
    if (!this._isMissingEnhancedLeadColumn(error)) throw error;

    const legacyUpdates = this._withoutEnhancedLeadColumns(updates);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('leads')
      .update(legacyUpdates)
      .eq('id', leadId)
      .select()
      .single();
    if (fallbackError) throw fallbackError;
    return { ...fallbackData, ...this._pickEnhancedLeadColumns(updates) };
  }

  async _persistLeadInsert(supabase, insert) {
    const { data, error } = await supabase
      .from('leads')
      .insert(insert)
      .select()
      .single();

    if (!error) return data;
    if (!this._isMissingEnhancedLeadColumn(error)) throw error;

    const legacyInsert = this._withoutEnhancedLeadColumns(insert);
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('leads')
      .insert(legacyInsert)
      .select()
      .single();
    if (fallbackError) throw fallbackError;
    return { ...fallbackData, ...this._pickEnhancedLeadColumns(insert) };
  }

  _withoutEnhancedLeadColumns(payload = {}) {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => !ENHANCED_LEAD_COLUMNS.includes(key)));
  }

  _pickEnhancedLeadColumns(payload = {}) {
    return Object.fromEntries(Object.entries(payload).filter(([key]) => ENHANCED_LEAD_COLUMNS.includes(key)));
  }

  _isMissingEnhancedLeadColumn(error) {
    const message = String(error?.message || error?.details || '').toLowerCase();
    return error?.code === 'pgrst204'
      || message.includes('schema cache')
      || ENHANCED_LEAD_COLUMNS.some((column) => message.includes(column));
  }

  async _loadActiveAgent(supabase, organizationId, messageType, instanceContext = {}) {
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

    const candidates = data || [];
    const toolCandidates = candidates.filter((agent) => (agent.tools || []).includes(preferredTool));
    const exactCandidate = toolCandidates.find((agent) => this._agentInstanceScope(agent, instanceContext) === 'exact');
    const globalCandidate = toolCandidates.find((agent) => this._agentInstanceScope(agent, instanceContext) === 'global');
    const exactFallback = candidates.find((agent) => this._agentInstanceScope(agent, instanceContext) === 'exact');
    const globalFallback = candidates.find((agent) => this._agentInstanceScope(agent, instanceContext) === 'global');
    return exactCandidate || globalCandidate || exactFallback || globalFallback || null;
  }

  _agentInstanceScope(agent, { instanceId, instanceName } = {}) {
    const config = agent?.handoff_rules?.__operational360 || {};
    const configuredInstances = Array.isArray(config.instances) ? config.instances.filter(Boolean) : [];
    if (!configuredInstances.length) return 'global';

    const accepted = new Set([
      String(instanceId || '').trim(),
      String(instanceName || '').trim(),
    ].filter(Boolean));

    return configuredInstances.some((instance) => accepted.has(String(instance).trim())) ? 'exact' : 'none';
  }

  _canAutoReply(agent, actionPlan, options = {}) {
    if (!agent || !actionPlan?.reply) return false;
    if (actionPlan.handoffRequired && !options.allowHandoff) return false;

    const config = agent?.handoff_rules?.__operational360 || {};
    const status = config.status || (agent.is_active ? 'Ativo' : 'Pausado');
    const autonomyLevel = Number(config.autonomy_level || 0);
    const channels = Array.isArray(config.channels) && config.channels.length
      ? config.channels
      : [agent.channel || 'whatsapp'];

    return status === 'Ativo'
      && autonomyLevel >= 3
      && channels.includes('whatsapp')
      && (agent.tools || []).includes('whatsapp');
  }

  _hasPropertyMatches(lead = {}) {
    return Array.isArray(lead.matched_properties) && lead.matched_properties.length > 0;
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

  _shouldCreateLeadFromAI(aiResult, text = '') {
    if (!aiResult) return this._hasRealEstateSignal(text);

    const type = String(aiResult.leadType || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (PERSONAL_LEAD_TYPES.includes(type) && type !== 'outro') return false;
    if (aiResult.shouldCreateLead === false) return false;

    const confidence = Number(aiResult.confidence);
    if (Number.isFinite(confidence) && confidence > 0 && confidence < 0.35 && !this._hasRealEstateSignal(text)) {
      return false;
    }

    if (type === 'cliente') return true;
    if (aiResult.shouldCreateLead === true) {
      return this._hasRealEstateSignal(text) || (Number.isFinite(confidence) && confidence >= 0.65);
    }
    return this._hasRealEstateSignal(text);
  }

  _isPersonalConversation(aiResult, text = '') {
    if (!aiResult) return false;
    const type = String(aiResult.leadType || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (PERSONAL_LEAD_TYPES.includes(type)) return true;
    if (aiResult.shouldCreateLead === false && !this._hasRealEstateSignal(text)) return true;
    return false;
  }

  _normalizeLeadScore(aiResult = {}, text = '', stage = 'Novo') {
    const explicit = this._clampNumber(aiResult?.leadScore ?? aiResult?.score, 0, 100, null);
    if (explicit !== null) return explicit;

    let score = this._hasRealEstateSignal(text) ? 35 : 10;
    const normalized = String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const stageBoosts = {
      Novo: 5,
      'QualificaÃ§Ã£o': 18,
      Visita: 32,
      'SimulaÃ§Ã£o': 35,
      'DocumentaÃ§Ã£o': 38,
      Fechado: 100,
      Perdido: 0,
    };

    score += stageBoosts[stage] || 0;
    if (aiResult?.budget || /\b(r\$|orcamento|entrada|financiamento|parcela|a vista|avista)\b/.test(normalized)) score += 12;
    if (/\b(hoje|amanha|essa semana|urgente|agora|imediato|quanto antes)\b/.test(normalized)) score += 12;
    if (/\b(visita|visitar|conhecer|ver o imovel|agendar|horario)\b/.test(normalized)) score += 18;
    if (/\b(proposta|fechar|contrato|sinal|documentacao|cpf|rg|matricula)\b/.test(normalized)) score += 18;

    return this._clampNumber(score, 0, 100, 0);
  }

  _normalizeClassification(classification, score, stage) {
    const clean = String(classification || '').trim();
    if (clean) return clean;
    if (stage === 'Perdido') return 'Desqualificado';
    if (stage === 'DocumentaÃ§Ã£o') return 'Documentacao';
    if (stage === 'SimulaÃ§Ã£o') return 'Financeiro';
    if (score >= 75) return 'Alta Prioridade';
    if (score >= 45) return 'Interessado';
    return 'Curioso';
  }

  _normalizeNextAction(nextAction = {}, context = {}) {
    const type = String(nextAction?.type || '').trim() || this._inferNextActionType(context);
    const dueAt = this._firstValidISO(nextAction?.dueAt, context.visit?.scheduledAt, context.followUpAt);
    return {
      type,
      title: String(nextAction?.title || this._defaultActionTitle(type)).slice(0, 160),
      dueAt,
      reason: String(nextAction?.reason || this._defaultActionReason(type, context)).slice(0, 500),
    };
  }

  _inferNextActionType({ stage, visit, score }) {
    if (stage === 'Perdido') return 'mark_lost';
    if (stage === 'Fechado') return 'close_deal';
    if (stage === 'DocumentaÃ§Ã£o') return 'collect_documents';
    if (visit?.requested || stage === 'Visita') return 'schedule_visit';
    if (stage === 'SimulaÃ§Ã£o' || score >= 80) return 'notify_broker';
    if (stage === 'QualificaÃ§Ã£o') return 'qualify';
    return 'follow_up';
  }

  _defaultActionTitle(type) {
    return {
      qualify: 'Qualificar perfil do lead',
      recommend_property: 'Recomendar imoveis aderentes',
      schedule_visit: 'Agendar visita',
      follow_up: 'Criar retorno comercial',
      collect_documents: 'Coletar documentos',
      notify_broker: 'Acionar corretor responsavel',
      close_deal: 'Conduzir fechamento',
      mark_lost: 'Marcar oportunidade como perdida',
    }[type] || 'Proxima acao comercial';
  }

  _defaultActionReason(type, { score }) {
    if (type === 'schedule_visit') return 'Lead demonstrou interesse em visita ou etapa de visita foi detectada.';
    if (type === 'notify_broker') return `Lead com score ${score}/100 precisa de acao humana rapida.`;
    if (type === 'qualify') return 'Ainda faltam dados para recomendar imoveis com precisao.';
    return 'Manter cadencia comercial com contexto da conversa.';
  }

  _normalizeVisit(visit = {}, fallbackDate, stage) {
    const scheduledAt = this._firstValidISO(visit?.scheduledAt, stage === 'Visita' ? fallbackDate : '');
    return {
      requested: Boolean(visit?.requested || scheduledAt || stage === 'Visita'),
      scheduledAt,
      propertyHint: String(visit?.propertyHint || '').slice(0, 180),
      notes: String(visit?.notes || '').slice(0, 500),
    };
  }

  _normalizeInterestProfile(profile = {}) {
    return {
      operation: profile?.operation || 'indefinido',
      propertyType: profile?.propertyType || 'indefinido',
      city: profile?.city || '',
      region: profile?.region || '',
      payment: profile?.payment || 'indefinido',
      timeline: profile?.timeline || 'indefinido',
      missingFields: Array.isArray(profile?.missingFields) ? profile.missingFields.slice(0, 8) : [],
    };
  }

  _enrichTags(tags = [], stage, score, visit) {
    const base = Array.isArray(tags) ? tags : [];
    if (score >= 75) base.push('quente');
    if (visit?.requested) base.push('visita');
    if (stage) base.push(stage.toLowerCase());
    return [...new Set(base.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))].slice(0, 8);
  }

  _inferIntent(text = '', stage) {
    if (stage === 'Visita') return 'Lead demonstrou interesse em visita.';
    if (stage === 'SimulaÃ§Ã£o') return 'Lead demonstrou interesse financeiro ou proposta.';
    if (stage === 'DocumentaÃ§Ã£o') return 'Lead trouxe ou solicitou documentos.';
    return this._hasRealEstateSignal(text) ? 'Lead com interesse imobiliario identificado.' : 'Mensagem sem intencao imobiliaria clara.';
  }

  _normalizeMoney(value) {
    const number = Number(value || 0);
    return Number.isFinite(number) && number > 0 ? number : 0;
  }

  _clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, Math.round(number)));
  }

  _clampDecimal(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  _firstValidISO(...values) {
    for (const value of values) {
      if (!value) continue;
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    return '';
  }

  _hasRealEstateSignal(text = '') {
    const normalized = String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return /\b(imovel|casa|apartamento|terreno|fazenda|sitio|chacara|area|hectare|ha\b|alqueire|comprar|vender|alugar|locacao|arrendar|visita|proposta|financiamento|entrada|parcela|car\b|matricula|ccir|incra|geo|itr|contrato)\b/.test(normalized);
  }

  _resolveLeadName(...values) {
    let phoneFallback = '';
    for (const value of values) {
      const clean = String(value || '').trim();
      if (/^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''))) {
        phoneFallback = clean;
      }
      if (!clean || this._isPlaceholderName(clean)) continue;
      return clean;
    }
    return phoneFallback || 'Lead WhatsApp';
  }

  _isPlaceholderName(value = '') {
    const clean = String(value).trim().toLowerCase();
    if (!clean || clean === '~' || clean === 'me' || clean === 'contato sem telefone') return true;
    const raw = String(value).trim();
    if (/^([A-Z]\.?\s*){1,4}$/.test(raw) || /^([A-Za-z]\.\s*){1,4}$/.test(raw)) return true;
    return /^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''));
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
      audio: 'Audio recebido para transcricao e qualificacao, sem criar texto generico no chat.',
      document: `Documento recebido${message.media_mimetype?.includes('pdf') ? ' em PDF' : ''} para analise, sem criar texto generico no chat.`,
      image: 'Imagem recebida no atendimento, sem criar texto generico no chat.',
      video: 'Video recebido no atendimento, sem criar texto generico no chat.',
    }[message.type] || `Midia recebida: ${message.type}.`;
  }

  async _downloadMediaForAI(message) {
    if (!message?.media_url) return null;

    try {
      const response = await fetch(message.media_url, {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) return null;
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > 12 * 1024 * 1024) return null;

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 12 * 1024 * 1024) return null;
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.warn('[AIAutomation] Midia nao baixada para IA:', error.message);
      return null;
    }
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
    return [
      `[WhatsApp IA - ${new Date().toLocaleString('pt-BR')}]`,
      `Chat: ${chat.name || chat.chat_jid || 'sem nome'}`,
      `Link da conversa: ${this._buildChatLink(chat)}`,
      `Score: ${aiResult?.leadScore ?? 0}/100`,
      `Resumo: ${aiResult?.intent || text}`,
      `Perfil buscado: ${this._formatInterestProfile(aiResult?.interestProfile)}`,
      `Etiquetas: ${tags.join(', ') || 'sem etiquetas'}`,
      `Resposta sugerida: ${aiResult?.reply || 'sem sugestao'}`,
    ].join('\n');
  }

  _buildImportNoteLine({ aiResult, chat, tags, transcript }) {
    const fallback = transcript ? transcript.split('\n').slice(-5).join('\n') : 'Conversa sem texto renderizavel';
    return [
      `[Importacao WhatsApp IA - ${new Date().toLocaleString('pt-BR')}]`,
      `Chat: ${chat.name || chat.chat_jid || 'sem nome'}`,
      `Link da conversa: ${this._buildChatLink(chat)}`,
      `Score: ${aiResult?.leadScore ?? 0}/100`,
      `Resumo: ${aiResult?.intent || fallback}`,
      `Perfil buscado: ${this._formatInterestProfile(aiResult?.interestProfile)}`,
      `Etiquetas: ${tags.join(', ') || 'sem etiquetas'}`,
      `Proxima acao sugerida: ${aiResult?.reply || 'sem sugestao'}`,
    ].join('\n');
  }

  _buildPersonalNoteLine({ aiResult, message, chat, tags, transcript }) {
    const fallback = transcript
      ? transcript.split('\n').slice(-5).join('\n')
      : (message.content || this._buildMediaHint(message) || 'Conversa pessoal sem texto renderizavel');
    return [
      `[WhatsApp Pessoal IA - ${new Date().toLocaleString('pt-BR')}]`,
      `Chat: ${chat.name || chat.chat_jid || 'sem nome'}`,
      `Link da conversa: ${this._buildChatLink(chat)}`,
      `Tipo: ${aiResult?.leadType || 'pessoal'}`,
      `Score: ${Math.min(aiResult?.leadScore || 0, 35)}/100`,
      `Resumo: ${aiResult?.intent || fallback}`,
      `Etiquetas: ${tags.join(', ') || 'sem etiquetas'}`,
    ].join('\n');
  }

  _formatInterestProfile(profile = {}) {
    const parts = [
      profile.operation && profile.operation !== 'indefinido' ? `operacao ${profile.operation}` : '',
      profile.propertyType && profile.propertyType !== 'indefinido' ? `tipo ${profile.propertyType}` : '',
      profile.city ? `cidade ${profile.city}` : '',
      profile.region ? `regiao ${profile.region}` : '',
      profile.payment && profile.payment !== 'indefinido' ? `pagamento ${profile.payment}` : '',
      profile.timeline && profile.timeline !== 'indefinido' ? `prazo ${profile.timeline}` : '',
    ].filter(Boolean);
    return parts.length ? parts.join('; ') : 'nao identificado';
  }

  _buildWhatsAppReply({ lead, actionPlan, content = '' }) {
    const matchMessage = String(lead?.match_whatsapp_message || '').trim();
    const shouldRecommend = this._shouldRecommendProperties({ actionPlan, text: content });

    if (matchMessage && this._hasPropertyMatches(lead) && shouldRecommend) {
      return matchMessage.slice(0, 2500);
    }

    const matches = Array.isArray(lead?.matched_properties) ? lead.matched_properties : [];
    if (matches.length && shouldRecommend) {
      const firstName = String(lead?.name || '').split(' ')[0] || 'tudo bem';
      const lines = [
        `Ola ${firstName}, encontrei algumas oportunidades que combinam com o seu perfil:`,
        '',
        ...matches.slice(0, 3).flatMap((property, index) => [
          `${index + 1}. ${property.title || 'Imovel selecionado'}`,
          property.city || property.state ? `- ${[property.city, property.state].filter(Boolean).join(' / ')}` : '',
          property.price ? `- ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}` : '',
          ...(Array.isArray(property.reasons) ? property.reasons.slice(0, 2).map((reason) => `- ${reason}`) : []),
          '',
        ].filter(Boolean)),
        'Quer que eu te envie mais detalhes ou prefere agendar uma visita?',
      ];
      return lines.join('\n').slice(0, 2500);
    }

    return (String(actionPlan?.reply || '').trim() || this._buildSdrQualificationReply(actionPlan)).slice(0, 1200);
  }

  _buildSdrQualificationReply(actionPlan = {}) {
    const profile = actionPlan.interestProfile || {};
    const missing = Array.isArray(profile.missingFields) ? profile.missingFields : [];
    const questions = [];

    if ((!profile.propertyType || profile.propertyType === 'indefinido') || missing.includes('propertyType')) {
      questions.push('qual tipo de imovel voce procura');
    }
    if ((!profile.city && !profile.region) || missing.includes('city') || missing.includes('region')) {
      questions.push('em qual cidade ou regiao');
    }
    if (!actionPlan.budget || missing.includes('budget')) {
      questions.push('qual faixa de investimento');
    }
    if ((!profile.timeline || profile.timeline === 'indefinido') || missing.includes('timeline')) {
      questions.push('para quando voce pretende avancar');
    }

    const selected = questions.slice(0, 2);
    if (!selected.length) {
      return 'Perfeito. Vou cruzar seu perfil com as melhores oportunidades e ja te retorno com as opcoes mais aderentes.';
    }

    return `Perfeito, vou te ajudar. Para filtrar boas oportunidades, me confirma ${selected.join(' e ')}?`;
  }

  _shouldRecommendProperties({ actionPlan = {}, text = '' }) {
    const normalizedText = String(text)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const requestedOptions = /\b(opcoes|oportunidades|imoveis|tem algo|me envia|manda|quais|catalogo|lista|disponiveis|visita|visitar|conhecer)\b/.test(normalizedText);
    const profile = actionPlan.interestProfile || {};
    const missing = Array.isArray(profile.missingFields) ? profile.missingFields.filter(Boolean) : [];
    const hasMinimumProfile = Boolean(
      profile.propertyType && profile.propertyType !== 'indefinido'
      && (profile.city || profile.region)
      && (actionPlan.budget || profile.payment !== 'indefinido' || profile.timeline !== 'indefinido')
    );

    return actionPlan.nextAction?.type === 'recommend_property'
      || actionPlan.visit?.requested
      || requestedOptions
      || (hasMinimumProfile && missing.length <= 2)
      || Number(actionPlan.leadScore || 0) >= 70;
  }

  _buildChatLink(chat = {}) {
    const params = new URLSearchParams();
    if (chat.instance_id) params.set('instanceId', chat.instance_id);
    if (chat.id) params.set('chatId', chat.id);
    if (chat.chat_jid) params.set('chatJid', chat.chat_jid);
    const query = params.toString();
    return query ? `/whatsapp?${query}` : '/whatsapp';
  }

  _phoneFromChatJid(jid = '') {
    return String(jid).split('@')[0].replace(/\D/g, '');
  }

  _isGroupJid(jid = '') {
    return String(jid).includes('@g.us');
  }

  _normalizeBRPhone(value = '') {
    let digits = String(value).replace(/\D/g, '').replace(/^0+/, '');
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    if (!digits.startsWith('55')) return '';
    if (digits.length !== 12 && digits.length !== 13) return '';
    return digits;
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
    const dueAtValue = aiResult?.visit?.scheduledAt || aiResult?.nextAction?.dueAt || aiResult?.followUpAt;
    if (!dueAtValue) return;
    const dueAt = new Date(dueAtValue);
    if (Number.isNaN(dueAt.getTime())) return;
    const isVisit = aiResult?.visit?.requested || aiResult?.nextAction?.type === 'schedule_visit';
    const { error } = await supabase.from('lead_followups').insert({
      lead_id: leadId,
      organization_id: organizationId,
      due_at: dueAt.toISOString(),
      title: isVisit ? 'Visita sugerida pela IA' : (aiResult?.nextAction?.title || 'Retorno sugerido pela IA'),
      notes: [
        aiResult.intent,
        aiResult?.nextAction?.reason,
        aiResult?.visit?.propertyHint ? `Imovel: ${aiResult.visit.propertyHint}` : '',
        aiResult?.reply ? `Resposta sugerida: ${aiResult.reply}` : '',
      ].filter(Boolean).join('\n'),
      status: 'pending',
    });
    if (error) console.warn('[AIAutomation] Follow-up nao registrado:', error.message);
  }
}
