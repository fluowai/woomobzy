import { getSupabaseServer } from '../supabase-server.js';
import { AutonomyPolicy } from './AutonomyPolicy.js';
import { AgentStateMachine } from './AgentStateMachine.js';
import { ToolRegistry } from './ToolRegistry.js';

export class AgentOrchestrator {
  constructor() {
    this.supabase = getSupabaseServer();
  }

  async resolveAgent(organizationId, channel = 'whatsapp', instanceId = null) {
    let query = this.supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (instanceId) {
      query = query.contains('instances', [instanceId]);
    }

    const { data: agents } = await query;
    if (!agents?.length) return null;

    if (agents.length === 1) return agents[0];

    const channelAgent = agents.find((a) => a.channel === channel || a.channels?.includes(channel));
    if (channelAgent) return channelAgent;

    return agents[0];
  }

  async processMessage({ organizationId, message, phone, sessionId, instanceId, instanceName }) {
    const agent = await this.resolveAgent(organizationId, 'whatsapp', instanceId);
    const policy = AutonomyPolicy.fromAgent(agent);
    const stateMachine = AgentStateMachine.fromAgent(agent);
    const toolCtx = ToolRegistry.createContext({
      organizationId,
      agent,
      sessionId,
      supabase: this.supabase,
    });

    const conversationHistory = await this._getMemory(organizationId, sessionId);
    const existingLead = await this._findLeadByPhone(organizationId, phone);
    const matchedStep = await stateMachine.evaluate(message, conversationHistory);
    stateMachine.updateContext({ lastMessage: message });

    const aiResult = await this._callAI(organizationId, agent, stateMachine, message, conversationHistory, existingLead);
    if (aiResult?.profile) stateMachine.updateContext(aiResult.profile);

    await this._saveStateMachine(agent?.id, organizationId, stateMachine);

    const actionPlan = this._buildActionPlan(aiResult, policy, stateMachine);

    const leadResult = await this._handleLead(organizationId, phone, existingLead, aiResult, actionPlan, message, agent);
    if (leadResult?.lead?.id) {
      toolCtx.lead = leadResult.lead;
      const consolidatedContext = this._buildConsolidatedContext(leadResult.lead, aiResult, message);
      stateMachine.updateContext({ memoria_contexto: consolidatedContext });
      await this._saveLeadContext(organizationId, leadResult.lead.id, consolidatedContext);
    }

    for (const action of actionPlan.actions) {
      const canDo = policy.canExecuteAction(action.type, { budget: aiResult?.budget });
      if (!canDo.allowed && canDo.reason?.startsWith('action_')) {
        actionPlan.handoffRequired = true;
        actionPlan.handoffReason = `Permissão negada: ${canDo.reason}`;
        continue;
      }
      if (policy.canUseTool(action.tool)) {
        const result = await ToolRegistry.execute(action.tool, toolCtx, action.params);
        actionPlan.executionResults.push(result);
      }
    }

    if (actionPlan.handoffRequired && policy.canUseTool('human_escalator')) {
      await ToolRegistry.execute('human_escalator', toolCtx, {
        leadId: leadResult?.lead?.id,
        reason: actionPlan.handoffReason || 'handoff_triggered',
        contextSnapshot: {
          profile: aiResult?.profile,
          intent: aiResult?.intent,
          conversationPreview: conversationHistory.slice(-5).map((m) => ({ role: m.role, content: m.content?.slice(0, 200) })),
        },
      });
    }

    await toolCtx.persistLogs();

    if (agent?.id) {
      await this._saveStateMachine(agent.id, organizationId, stateMachine);
    }

    const reply = actionPlan.reply || this._buildReply(actionPlan, aiResult, agent);

    return {
      agent: agent ? { id: agent.id, name: agent.name, role: agent.role } : null,
      reply,
      actionPlan,
      lead: leadResult?.lead || null,
      stateMachine: stateMachine.toJSON(),
    };
  }

  async _getMemory(organizationId, sessionId, limit = 20) {
    try {
      const { data } = await this.supabase
        .from('conversation_memory')
        .select('role, content')
        .eq('organization_id', organizationId)
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })
        .limit(limit);
      return data || [];
    } catch {
      return [];
    }
  }

  async _saveMemory(organizationId, agentId, sessionId, role, content) {
    try {
      await this.supabase.from('conversation_memory').insert({
        organization_id: organizationId,
        agent_id: agentId,
        session_id: sessionId,
        role,
        content: String(content).slice(0, 3000),
      });
    } catch (err) {
      console.warn('[Orchestrator] Memory save error:', err.message);
    }
  }

  async _saveStateMachine(agentId, organizationId, stateMachine) {
    if (!agentId) return;
    try {
      await this.supabase
        .from('ai_agents')
        .update({ state_machine: stateMachine.toJSON() })
        .eq('id', agentId)
        .eq('organization_id', organizationId);
    } catch (err) {
      console.warn('[Orchestrator] State machine save error:', err.message);
    }
  }

  async _findLeadByPhone(organizationId, phone) {
    try {
      const { data } = await this.supabase
        .from('leads')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('phone', phone)
        .maybeSingle();
      return data;
    } catch {
      return null;
    }
  }

  async _handleLead(organizationId, phone, existingLead, aiResult, actionPlan, message, agent) {
    if (!aiResult?.shouldCreateLead) return { lead: existingLead };

    try {
      if (existingLead) {
        const updates = {
          last_contacted_at: new Date().toISOString(),
          ...(aiResult.leadScore && { lead_score: aiResult.leadScore }),
          ...(aiResult.classification && { classification: aiResult.classification }),
          ...(aiResult.intent && { ai_last_intent: aiResult.intent }),
          ...(aiResult.nextAction?.type && { ai_next_action: aiResult.nextAction.type }),
        };
        const { data } = await this.supabase
          .from('leads')
          .update(updates)
          .eq('id', existingLead.id)
          .eq('organization_id', organizationId)
          .select()
          .single();
        return { lead: data || existingLead };
      }

      const { data } = await this.supabase
        .from('leads')
        .insert({
          organization_id: organizationId,
          name: aiResult.leadName || phone,
          phone,
          source: 'WhatsApp IA',
          status: aiResult.suggestedStage || 'Novo',
          classification: aiResult.classification || 'Interessado',
          lead_score: aiResult.leadScore || 0,
          ai_last_intent: aiResult.intent || '',
          notes: aiResult.intent || message?.slice(0, 500),
          last_contacted_at: new Date().toISOString(),
        })
        .select()
        .single();
      return { lead: data };
    } catch (err) {
      console.warn('[Orchestrator] Lead handle error:', err.message);
      return { lead: existingLead };
    }
  }

  _buildConsolidatedContext(lead, aiResult, message) {
    const current = lead?.ai_profile || {};
    const profile = aiResult?.profile || aiResult?.interestProfile || {};
    const nextAction = aiResult?.nextAction?.type || aiResult?.suggestedStage || current.proxima_acao || '';

    return {
      nome: aiResult?.leadName || current.nome || lead?.name || '',
      email: profile.email || aiResult?.email || current.email || '',
      interesse: profile.operation || profile.interesse || aiResult?.intent || current.interesse || '',
      cidade: profile.city || profile.cidade || current.cidade || '',
      bairro: profile.neighborhood || profile.bairro || current.bairro || '',
      orcamento: profile.budget || profile.orcamento || aiResult?.budget || current.orcamento || '',
      tipo_imovel: profile.propertyType || profile.tipo_imovel || current.tipo_imovel || '',
      quartos: profile.bedrooms || profile.quartos || current.quartos || '',
      prazo: profile.timeline || profile.prazo || current.prazo || '',
      forma_pagamento: profile.paymentMethod || profile.forma_pagamento || current.forma_pagamento || '',
      imoveis_enviados: current.imoveis_enviados || [],
      proxima_acao: nextAction,
      ultima_intencao: aiResult?.intent || current.ultima_intencao || '',
      temperatura: aiResult?.temperature || current.temperatura || '',
      resumo: aiResult?.summary || current.resumo || String(message || '').slice(0, 500),
      updated_at: new Date().toISOString(),
    };
  }

  async _saveLeadContext(organizationId, leadId, context) {
    try {
      await this.supabase
        .from('leads')
        .update({ ai_profile: context, updated_at: new Date().toISOString() })
        .eq('id', leadId)
        .eq('organization_id', organizationId);
    } catch (err) {
      console.warn('[Orchestrator] Lead context save error:', err.message);
    }
  }

  async _callAI(organizationId, agent, stateMachine, message, history, lead = null) {
    try {
      const { default: axios } = await import('axios');
      const flowContext = stateMachine.buildPromptContext();
      const leadContext = lead?.ai_profile ? JSON.stringify(lead.ai_profile) : '{}';

      const systemInstruction = `
Você é um agente imobiliário inteligente.

Nome: ${agent?.name || 'Agente IMOBZY'}
Função: ${agent?.role || 'Atendimento'}
Personalidade: ${agent?.personalidade || 'Consultiva, clara e objetiva'}
Estilo: ${agent?.response_style || 'consultivo'}
Instruções: ${agent?.instructions || 'Atenda com foco em qualificar o lead'}
Capacidades: ${(agent?.capabilities || []).join(', ')}
Ferramentas: ${(agent?.tools || []).join(', ')}

MEMORIA CONSOLIDADA DO LEAD:
${leadContext}

${flowContext}

REGRAS:
- Responda APENAS JSON válido, sem markdown
- Não repita perguntas já respondidas no histórico
- Seja humano, educado e direto, como um corretor faria no WhatsApp
- Uma ou duas perguntas por vez
- Extraia dados para o CRM, não apenas uma resposta de chat
`.trim();

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey.includes('YOUR_')) {
        return this._fallbackAI(message, history);
      }

      const historyBlock = history?.length
        ? `\nHistórico:\n${history.map((m) => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')}\n`
        : '';

      const prompt = `${historyBlock}\nMensagem do lead: ${message}\n\nAnalise e responda JSON:`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' },
          systemInstruction: { parts: [{ text: systemInstruction }] },
        }
      );

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return this._fallbackAI(message, history);
    }
  }

  _fallbackAI(message, history) {
    const text = (message || '').toLowerCase();
    const isVisit = /\b(visita|visitar|agendar|horario)\b/.test(text);
    const isBudget = /\b(valor|preco|r\$|custa|quanto)\b/.test(text);
    const isInterest = /\b(quero|busco|procuro|interesse|gostei)\b/.test(text);
    const propertyType = text.match(/\b(casa|apartamento|terreno|fazenda|sitio|chacara|comercial|sobrado)\b/i)?.[1] || null;
    const city = message?.match(/\bem\s+([^,.!?]{2,40})(?:[,.!?]|$)/i)?.[1]?.trim() || null;
    const operation = text.match(/\b(compra|comprar|venda|aluguel|alugar|locacao|locar)\b/i)?.[1] || null;
    const budgetMatch = message?.match(/(?:r\$\s*)?(\d{2,3}(?:[.\s]\d{3})*|\d+)\s*(mil|milhao|milhoes|mi)?/i);
    let budget = budgetMatch ? Number(budgetMatch[1].replace(/[.\s]/g, '')) : null;
    if (budget && budgetMatch?.[2]?.toLowerCase()?.startsWith('mil')) budget *= 1000;
    if (budget && budgetMatch?.[2]?.toLowerCase()?.startsWith('mi')) budget *= 1000000;
    const shouldMatch = Boolean(propertyType || city || budget || operation);

    return {
      shouldCreateLead: isVisit || isBudget || isInterest || shouldMatch,
      intent: isVisit ? 'solicitacao_visita' : shouldMatch ? 'busca_imovel' : isBudget ? 'consulta_preco' : isInterest ? 'demonstrou_interesse' : 'saudacao',
      leadScore: isVisit ? 80 : isBudget ? 60 : isInterest ? 50 : 10,
      classification: isVisit ? 'Alta Prioridade' : isBudget ? 'Financeiro' : isInterest ? 'Interessado' : 'Curioso',
      suggestedStage: isVisit ? 'Visita' : shouldMatch ? 'Qualificacao' : isBudget ? 'Simulacao' : isInterest ? 'Qualificacao' : 'Novo',
      temperature: isVisit ? 'quente' : isBudget || isInterest ? 'morno' : 'frio',
      profile: {
        city,
        budget,
        propertyType,
        operation,
        missingFields: shouldMatch ? ['city', 'budget', 'propertyType'].filter((field) => !{ city, budget, propertyType }[field]) : [],
      },
      nextAction: shouldMatch ? { type: 'match_properties' } : null,
      reply: isVisit
        ? 'Claro! Para agendar a visita, me confirme o imóvel desejado, melhor dia e horário para você.'
        : isBudget
          ? 'Vou verificar os valores disponíveis para você. Qual tipo de imóvel e região você prefere?'
          : isInterest
            ? 'Que bom que você tem interesse! Para encontrar as melhores opções, me conte: você busca comprar ou alugar? Qual cidade/região?'
            : 'Olá! Como posso ajudar você hoje? Estou aqui para encontrar o imóvel ideal para você.',
    };
  }

  _buildActionPlan(aiResult, policy, stateMachine) {
    const plan = {
      actions: [],
      handoffRequired: false,
      handoffReason: '',
      executionResults: [],
      reply: aiResult?.reply || '',
    };

    const nextStep = stateMachine.getCurrentStep();

    if (aiResult?.profile?.missingFields?.length > 0) {
      plan.actions.push({
        type: 'qualify_lead',
        tool: 'lead_qualifier',
        params: { conversationText: stateMachine.getContext().lastMessage || '', existingProfile: aiResult.profile },
      });
    }

    const propertyProfile = aiResult?.interestProfile || aiResult?.profile;
    const wantsPropertyMatch = /imovel|imovel_match|recomend|match|busca|consulta/i.test(
      `${aiResult?.nextAction?.type || ''} ${aiResult?.intent || ''} ${aiResult?.suggestedStage || ''}`
    );
    if (
      propertyProfile &&
      wantsPropertyMatch &&
      policy.canUseTool('property_matcher') &&
      policy.canExecuteAction('match_properties').allowed
    ) {
      plan.actions.push({
        type: 'match_properties',
        tool: 'property_matcher',
        params: { profile: propertyProfile, limit: 3 },
      });
    }

    if (aiResult?.suggestedStage && policy.canExecuteAction('move_kanban').allowed) {
      plan.actions.push({
        type: 'move_kanban',
        tool: 'kanban_mover',
        params: { stage: aiResult.suggestedStage, reason: aiResult.intent },
      });
    }

    if (aiResult?.handoffRequired || policy.getLevel() < 2 && aiResult?.leadScore > 70) {
      plan.handoffRequired = true;
      plan.handoffReason = aiResult.handoffReason || 'high_intent_lead';
    }

    return plan;
  }

  _buildReply(actionPlan, aiResult, agent) {
    if (aiResult?.reply) return aiResult.reply;
    const name = agent?.name || 'Agente';
    return `Olá, aqui é ${name}. Como posso ajudar você hoje?`;
  }
}
