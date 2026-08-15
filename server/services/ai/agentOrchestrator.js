import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import logger from '../../utils/logger.js';
import { buildAgentSystemPrompt } from './agentPrompt.js';
import {
  AGENT_RUNTIME_REGISTRY,
  TOOL_DEFINITIONS,
  DEFAULT_MAX_SPECIALIST_FAN_OUT,
  buildFunctionDeclarations,
  buildIdempotencyKey,
  createExecutionId,
  extractStructuredJson,
  getRequiredAutonomyLevel,
  getToolMode,
  inferIntentSignals,
  isToolAllowed,
  normalizeAiText,
  normalizeInternalResult,
  pickSpecialists,
  sanitizeExecutionMeta,
} from './agentOrchestrationRuntime.js';

const VALID_CRM_STAGES = [
  'Novo',
  'Em andamento',
  'Contato',
  'Agendado',
  'Proposta',
  'Fechado',
  'Perdido',
];

const VALID_LEAD_TEMPERATURES = new Set(['frio', 'morno', 'quente']);
const DEFAULT_TOOL_LOOP_LIMIT = 4;
const DEFAULT_AGENT_MODEL =
  process.env.GEMINI_AGENT_MODEL || 'gemini-3.6-flash';

function isMissingRelationError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    ['42p01', 'pgrst205'].includes(error?.code) ||
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('relation')
  );
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toIsoDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function formatTimePtBr(value) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export class AgentOrchestrator {
  constructor(apiKey, options = {}) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.maxSpecialistFanOut =
      Number(options.maxSpecialistFanOut) || DEFAULT_MAX_SPECIALIST_FAN_OUT;
    this.lastExecutionMeta = null;
    this._toolReplayCache = new Map();
  }

  getLastExecutionMeta() {
    return this.lastExecutionMeta;
  }

  async _ensureModel(agentToolsConfig) {
    const activeFunctionDeclarations = buildFunctionDeclarations(
      agentToolsConfig || []
    );
    const toolsConfig = activeFunctionDeclarations.length
      ? [{ functionDeclarations: activeFunctionDeclarations }]
      : undefined;

    if (this.genAI) {
      return this.genAI.getGenerativeModel({
        model: DEFAULT_AGENT_MODEL,
        ...(toolsConfig && { tools: toolsConfig }),
      });
    }

    const supabase = getSupabaseServer();
    const { data: saasSettings } = await supabase
      .from('saas_settings')
      .select('global_gemini_key')
      .single()
      .catch(() => ({ data: null }));

    const finalKey = saasSettings?.global_gemini_key;
    if (!finalKey) throw new Error('API Key nao configurada');

    const genAI = new GoogleGenerativeAI(finalKey);
    return genAI.getGenerativeModel({
      model: DEFAULT_AGENT_MODEL,
      ...(toolsConfig && { tools: toolsConfig }),
    });
  }

  _getOperationalConfig(agent = {}) {
    return agent?.handoff_rules?.__operational360 || {};
  }

  _getSpecialistIds(agent = {}) {
    const operational = this._getOperationalConfig(agent);
    return asArray(agent?.sub_agents).length
      ? asArray(agent.sub_agents)
      : asArray(operational.sub_agents);
  }

  _getSharePrompt(agent = {}) {
    const operational = this._getOperationalConfig(agent);
    return Boolean(
      agent?.share_prompt_with_subagents ??
      operational.share_prompt_with_subagents ??
      false
    );
  }

  _getAgentAutonomyLevel(agent = {}, override = null) {
    const operational = this._getOperationalConfig(agent);
    const agentLevel = Number(
      agent?.autonomy_level ?? operational.autonomy_level ?? 0
    );
    const explicitOverride = Number(override);
    if (!Number.isFinite(explicitOverride) || explicitOverride <= 0) {
      return agentLevel;
    }
    if (!Number.isFinite(agentLevel) || agentLevel <= 0) {
      return explicitOverride;
    }
    return Math.min(agentLevel, explicitOverride);
  }

  _resolveConversationState(agent, conversationState = null) {
    return (
      conversationState ||
      agent?.conversation_state ||
      agent?.conversationState ||
      null
    );
  }

  _buildConversationStateBlock(conversationState) {
    const state = conversationState || {};
    const facts =
      state.facts && typeof state.facts === 'object' ? state.facts : {};
    const answeredFields = asArray(
      state.answered_fields || state.answeredFields
    ).filter(Boolean);
    const askedQuestions = asArray(
      state.asked_questions || state.askedQuestions
    ).filter(Boolean);
    const summary = String(
      state.summary || state.conversation_summary || ''
    ).trim();

    const factEntries = Object.entries(facts)
      .filter(
        ([, value]) => value !== null && value !== undefined && value !== ''
      )
      .slice(0, 10)
      .map(([key, value]) => `${key}: ${String(value)}`);

    const parts = [];
    if (summary) parts.push(`- Resumo: ${summary}`);
    if (factEntries.length) parts.push(`- Facts: ${factEntries.join(' | ')}`);
    if (answeredFields.length)
      parts.push(
        `- Campos respondidos: ${answeredFields.slice(0, 12).join(', ')}`
      );
    if (askedQuestions.length)
      parts.push(
        `- Perguntas ja feitas: ${askedQuestions.slice(0, 10).join(' | ')}`
      );

    if (!parts.length) return '';

    return `ESTADO ATUAL DA CONVERSA:
${parts.join('\n')}
- REGRA FORTE: nunca pergunte novamente um campo listado em "Campos respondidos" ou claramente respondido nos facts/historico.
- Se faltar algo, faca somente a proxima pergunta realmente necessaria.`;
  }

  _composeSystemInstruction(agent, options = {}) {
    const {
      history = [],
      channel = 'WhatsApp',
      isSubAgent = false,
      conversationState = null,
      sharedPrompt = '',
      extraInstructions = '',
    } = options;

    const basePrompt = buildAgentSystemPrompt(agent, {
      history,
      channel,
      isSubAgent,
    });
    const resolvedConversationState = this._resolveConversationState(
      agent,
      conversationState
    );
    const conversationStateBlock = this._buildConversationStateBlock(
      resolvedConversationState
    );

    return [
      sharedPrompt
        ? `PROMPT DO ORQUESTRADOR PRINCIPAL:\n${sharedPrompt}`.trim()
        : '',
      basePrompt,
      conversationStateBlock,
      extraInstructions,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  _dedupeCurrentMessage(history = [], content = '') {
    if (!Array.isArray(history) || !history.length) return [];
    const lastEntry = history[history.length - 1];
    if (
      lastEntry?.role === 'user' &&
      normalizeAiText(lastEntry.content) === normalizeAiText(content)
    ) {
      return history.slice(0, -1);
    }
    return history;
  }

  _createExecutionMeta({
    agent,
    organizationId,
    leadId,
    requestId,
    sessionId,
    conversationState,
  }) {
    return {
      execution_id: createExecutionId(),
      organization_id: organizationId || null,
      agent_id: agent?.id || null,
      lead_id: leadId || null,
      request_id: requestId || null,
      session_id: sessionId || null,
      route_mode: 'single',
      specialists: [],
      toolCalls: [],
      fallback_used: false,
      started_at: new Date().toISOString(),
      finished_at: null,
      conversation_state_keys: conversationState
        ? Object.keys(conversationState).slice(0, 10)
        : [],
    };
  }

  _finalizeExecutionMeta(meta, patch = {}) {
    meta.finished_at = new Date().toISOString();
    Object.assign(meta, patch);
    this.lastExecutionMeta = sanitizeExecutionMeta(meta);
  }

  _recordToolTrace(meta, trace) {
    if (!meta || !trace) return;
    meta.toolCalls.push({
      name: trace.name,
      status: trace.status,
      actor_agent_id: trace.actor_agent_id,
      autonomy_level: trace.autonomy_level,
      side_effect: trace.side_effect,
      idempotency_key: trace.idempotency_key,
    });
  }

  async _loadSubAgents(supabase, organizationId, subAgentIds) {
    if (!Array.isArray(subAgentIds) || subAgentIds.length === 0) return [];

    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .in('id', subAgentIds)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (!error && Array.isArray(data) && data.length > 0) return data;

    if (error) {
      logger.warn(
        '[AgentOrchestrator] Falha ao carregar ai_agents, usando fallback.',
        error.message
      );
    }

    const fallback = await this._loadFallbackSubAgents(
      supabase,
      organizationId,
      subAgentIds
    );

    return fallback;
  }

  async _loadFallbackSubAgents(supabase, organizationId, subAgentIds) {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('integrations')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) return [];

      const integrations =
        data?.integrations && typeof data.integrations === 'object'
          ? data.integrations
          : {};

      return asArray(integrations.operationalAgents).filter(
        (agent) =>
          subAgentIds.includes(agent?.id) &&
          (agent?.is_active ?? agent?.status !== 'Pausado')
      );
    } catch (error) {
      logger.warn(
        '[AgentOrchestrator] Fallback de sub-agentes indisponivel:',
        error.message
      );
      return [];
    }
  }

  async _detectSpecialists(content, specialists, history = [], maxFanOut = 3) {
    if (!Array.isArray(specialists) || specialists.length === 0) return [];

    try {
      const model = await this._ensureModel([]);
      if (!model) return pickSpecialists(content, specialists, maxFanOut);

      const recentHistory = history
        .slice(-6)
        .map(
          (message) =>
            `[${String(message.role || 'user').toUpperCase()}]: ${message.content}`
        )
        .join('\n');

      const prompt = `Voce e um roteador interno de uma equipe imobiliaria.
Retorne JSON puro no formato {"specialist_ids":["id1"],"fallback_used":false}.
Selecione de 0 a ${Math.max(1, Math.min(Number(maxFanOut) || 1, 5))} especialistas para a ultima mensagem.
Escolha somente especialistas claramente relevantes.
Especialistas:
${specialists
  .map(
    (specialist) =>
      `- id=${specialist.id}; role=${specialist.role}; tools=${asArray(
        specialist.tools
      ).join(
        ', '
      )}; capabilities=${asArray(specialist.capabilities).join(', ')}`
  )
  .join('\n')}

Historico recente:
${recentHistory || '(sem historico)'}

Ultima mensagem:
${content}

Se nada for claramente delegado, retorne {"specialist_ids":[],"fallback_used":false}.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const parsed = extractStructuredJson(result.response.text());
      if (!parsed || !Array.isArray(parsed.specialist_ids)) {
        return pickSpecialists(content, specialists, maxFanOut).map((item) => ({
          specialist: item.specialist,
          score: item.score,
          matchedSignals: item.matchedSignals,
          fallback_used: true,
        }));
      }

      const selectedIds = parsed.specialist_ids
        .map((value) => String(value || '').trim())
        .filter(Boolean)
        .slice(0, Math.max(1, Math.min(Number(maxFanOut) || 1, 5)));

      const rankedFallback = pickSpecialists(content, specialists, maxFanOut);
      const byId = new Map(
        specialists.map((specialist) => [specialist.id, specialist])
      );
      const selected = selectedIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((specialist) => ({
          specialist,
          score: 10,
          matchedSignals: inferIntentSignals(content),
          fallback_used: false,
        }));

      if (selected.length) return selected;

      return rankedFallback.map((item) => ({
        ...item,
        fallback_used: true,
      }));
    } catch (error) {
      logger.warn(
        '[AgentOrchestrator] Erro no roteador semantico, usando fallback:',
        error.message
      );
      return pickSpecialists(content, specialists, maxFanOut).map((item) => ({
        ...item,
        fallback_used: true,
      }));
    }
  }

  async _runSpecialistConversation({
    content,
    organizationId,
    specialist,
    history,
    leadId,
    sharePrompt,
    orchestratorAgent,
    conversationState,
    requestId,
    sessionId,
    autonomyLevel,
    allowSideEffects,
    executionMeta,
  }) {
    const model = await this._ensureModel(specialist?.tools || []);
    if (!model) return null;

    const specialistInstruction = this._composeSystemInstruction(specialist, {
      history,
      channel: 'WhatsApp',
      isSubAgent: true,
      conversationState,
      sharedPrompt: sharePrompt
        ? String(orchestratorAgent?.instructions || '')
        : '',
      extraInstructions: `VOCE ESTA RESPONDENDO INTERNAMENTE PARA O ORQUESTRADOR.
- Nao fale diretamente com o cliente.
- Se usar ferramentas, use apenas o necessario.
- Ao final, retorne JSON puro com:
{
  "summary": "resumo interno curto",
  "customer_facing_guidance": "o que o orquestrador deve responder ao cliente",
  "recommended_actions": ["acao 1"],
  "unresolved_questions": ["pergunta faltante"],
  "confidence": 0.0
}
- Nunca inclua saudacao nova ou mencione outros agentes.`,
    });

    const delegated = await this._runReActLoop({
      model,
      systemInstruction: specialistInstruction,
      history,
      content,
      organizationId,
      leadId,
      actorAgent: specialist,
      outputMode: 'internal',
      sessionId,
      requestId,
      autonomyLevel,
      executionMeta,
      conversationState,
      allowSideEffects,
    });

    return normalizeInternalResult(
      delegated?.text || '',
      specialist,
      delegated || {}
    );
  }

  async _synthesizeSpecialistResults({
    content,
    agent,
    history,
    conversationState,
    specialistResults,
  }) {
    const model = await this._ensureModel([]);
    if (!model) {
      return specialistResults
        .map((result) => result.customer_facing_guidance)
        .filter(Boolean)
        .join('\n\n')
        .trim();
    }

    const systemInstruction = this._composeSystemInstruction(agent, {
      history,
      channel: 'WhatsApp',
      conversationState,
      extraInstructions: `VOCE E O UNICO AGENTE VISIVEL PARA O CLIENTE.
- Sintetize uma unica resposta coerente usando os insumos internos.
- Nunca mencione especialistas, roteamento interno, JSON ou ferramentas.
- Preserve identidade e tom do agente principal.
- Se houver uma pendencia real, faca no maximo uma pergunta objetiva.`,
    });

    const prompt = `Mensagem atual do cliente:
${content}

Insumos internos dos especialistas:
${JSON.stringify(
  specialistResults.map((result) => ({
    specialist_id: result.specialist_id,
    summary: result.summary,
    customer_facing_guidance: result.customer_facing_guidance,
    recommended_actions: result.recommended_actions,
    unresolved_questions: result.unresolved_questions,
    confidence: result.confidence,
  })),
  null,
  2
)}`;

    try {
      const result = await model.generateContent({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      return result.response.text().trim();
    } catch (error) {
      logger.warn(
        '[AgentOrchestrator] Falha na sintese final, usando fallback textual:',
        error.message
      );
      return specialistResults
        .map((result) => result.customer_facing_guidance)
        .filter(Boolean)
        .join('\n\n')
        .trim();
    }
  }

  async processAgentConversation({
    content,
    organizationId,
    agent,
    history = [],
    leadId,
    sessionId = null,
    conversationState = null,
    requestId = null,
    autonomyLevel = null,
    allowSideEffects = null,
  }) {
    const dedupedHistory = this._dedupeCurrentMessage(history, content);
    const resolvedConversationState = this._resolveConversationState(
      agent,
      conversationState
    );
    const supabase = getSupabaseServer();
    const executionMeta = this._createExecutionMeta({
      agent,
      organizationId,
      leadId,
      requestId,
      sessionId,
      conversationState: resolvedConversationState,
    });

    try {
      const subAgentIds = this._getSpecialistIds(agent);
      const sharePrompt = this._getSharePrompt(agent);

      if (subAgentIds.length) {
        const specialists = await this._loadSubAgents(
          supabase,
          organizationId,
          subAgentIds
        );
        const maxFanOut =
          Number(
            this._getOperationalConfig(agent)?.limits?.max_specialist_fan_out
          ) || this.maxSpecialistFanOut;
        const selectedSpecialists = await this._detectSpecialists(
          content,
          specialists,
          dedupedHistory,
          maxFanOut
        );

        if (selectedSpecialists.length) {
          executionMeta.route_mode =
            selectedSpecialists.length > 1 ? 'multi' : 'specialist';
          executionMeta.fallback_used = selectedSpecialists.some(
            (entry) => entry.fallback_used
          );

          const specialistResults = [];
          for (const entry of selectedSpecialists) {
            const specialistResult = await this._runSpecialistConversation({
              content,
              organizationId,
              specialist: entry.specialist,
              history: dedupedHistory,
              leadId,
              sharePrompt,
              orchestratorAgent: agent,
              conversationState: resolvedConversationState,
              requestId,
              sessionId,
              autonomyLevel,
              allowSideEffects,
              executionMeta,
            });

            if (specialistResult) {
              specialistResults.push(specialistResult);
              executionMeta.specialists.push({
                id: specialistResult.specialist_id,
                role: entry.specialist?.role || null,
                tool_count: specialistResult.tool_calls.length,
                fallback_used: entry.fallback_used,
              });
            }
          }

          if (specialistResults.length) {
            const synthesized = await this._synthesizeSpecialistResults({
              content,
              organizationId,
              agent,
              history: dedupedHistory,
              leadId,
              conversationState: resolvedConversationState,
              specialistResults,
            });
            await this._persistExecutionArtifacts(
              supabase,
              executionMeta,
              resolvedConversationState
            );
            this._finalizeExecutionMeta(executionMeta);
            return synthesized || null;
          }
        }
      }

      const model = await this._ensureModel(agent?.tools || []);
      if (!model) {
        executionMeta.route_mode = 'none';
        await this._persistExecutionArtifacts(
          supabase,
          executionMeta,
          resolvedConversationState
        );
        this._finalizeExecutionMeta(executionMeta, { route_mode: 'none' });
        return null;
      }

      const systemInstruction = this._composeSystemInstruction(agent, {
        history: dedupedHistory,
        channel: 'WhatsApp',
        conversationState: resolvedConversationState,
      });

      const result = await this._runReActLoop({
        model,
        systemInstruction,
        history: dedupedHistory,
        content,
        organizationId,
        leadId,
        actorAgent: agent,
        outputMode: 'external',
        sessionId,
        requestId,
        autonomyLevel,
        executionMeta,
        conversationState: resolvedConversationState,
        allowSideEffects,
      });

      await this._persistExecutionArtifacts(
        supabase,
        executionMeta,
        resolvedConversationState
      );
      this._finalizeExecutionMeta(executionMeta);
      return result?.text || null;
    } catch (error) {
      executionMeta.route_mode = 'error';
      executionMeta.fallback_used = true;
      await this._persistExecutionArtifacts(
        supabase,
        executionMeta,
        resolvedConversationState
      );
      this._finalizeExecutionMeta(executionMeta, {
        route_mode: 'error',
        fallback_used: true,
      });
      throw error;
    }
  }

  async _runReActLoop({
    model,
    systemInstruction,
    history,
    content,
    organizationId,
    leadId,
    actorAgent,
    outputMode = 'external',
    sessionId = null,
    requestId = null,
    autonomyLevel = null,
    executionMeta = null,
    conversationState = null,
    allowSideEffects = null,
  }) {
    const chat = model.startChat({
      history: asArray(history).map((message) => ({
        role: message.role === 'assistant' ? 'model' : message.role,
        parts: [{ text: message.content }],
      })),
      systemInstruction: {
        parts: [
          {
            text:
              systemInstruction +
              `

DIRETRIZES DE FERRAMENTAS:
- Use "buscar_imoveis" para verificar disponibilidade antes de oferecer um imovel.
- Use "agendar_visita" apenas quando o cliente confirmar o dia e o horario.
- Use "consultar_agenda_disponibilidade" antes de propor horarios para visita.
- Use "simular_financiamento" quando o cliente pedir valores, parcelas ou financiamento.
- Use "atualizar_etapa_crm" e "qualificar_lead" para manter o CRM atualizado.
- Use "notificar_corretor" quando o lead demonstrar alta intencao, pedir visita, negociar valores ou precisar de atencao humana.
- Use "criar_follow_up" para marcar retorno comercial com data/hora definida.
- Use "criar_tarefa" para delegar atividades ao corretor ou time.
- Nunca execute side effects se a ferramenta nao estiver explicitamente habilitada para este agente.
- Em modo interno, responda somente com JSON valido conforme instrucao recebida.
- Em modo externo, sempre resuma o resultado da ferramenta de forma natural e amigavel ao cliente, sem citar termos tecnicos internos.`,
          },
        ],
      },
    });

    let result = await chat.sendMessage([{ text: content }]);
    let functionCalls = result.response.functionCalls();
    const toolCalls = [];
    let iter = 0;

    while (functionCalls?.length && iter < DEFAULT_TOOL_LOOP_LIMIT) {
      const responses = [];
      for (const functionCall of functionCalls) {
        const toolResult = await this.executeToolCall(
          functionCall,
          organizationId,
          leadId,
          {
            actorAgent,
            outputMode,
            sessionId,
            requestId,
            autonomyLevel,
            executionMeta,
            conversationState,
            allowSideEffects,
          }
        );

        toolCalls.push(toolResult.__trace || {});
        responses.push({
          functionResponse: {
            name: functionCall.name,
            response: this._stripTrace(toolResult),
          },
        });
      }

      result = await chat.sendMessage(responses);
      functionCalls = result.response.functionCalls();
      iter += 1;
    }

    return {
      text: result.response.text().trim(),
      toolCalls,
      fallbackUsed: toolCalls.some(
        (toolCall) => toolCall?.status !== 'success'
      ),
    };
  }

  _stripTrace(toolResult) {
    if (!toolResult || typeof toolResult !== 'object') return toolResult;
    const { __trace, ...visible } = toolResult;
    return visible;
  }

  _buildToolTrace(functionCall, executionContext, actorAgent) {
    const args =
      functionCall?.args && typeof functionCall.args === 'object'
        ? functionCall.args
        : {};
    const idempotencyKey = buildIdempotencyKey({
      request_id: executionContext.requestId || null,
      session_id: executionContext.sessionId || null,
      organization_id: executionContext.organizationId || null,
      lead_id: executionContext.leadId || null,
      actor_agent_id: actorAgent?.id || null,
      tool_name: functionCall?.name || null,
      args,
    });
    const argumentsHash = buildIdempotencyKey({
      tool_name: functionCall?.name || null,
      args,
    });

    return {
      name: functionCall?.name || 'unknown',
      actor_agent_id: actorAgent?.id || null,
      autonomy_level: this._getAgentAutonomyLevel(
        actorAgent,
        executionContext.autonomyLevel
      ),
      model: DEFAULT_AGENT_MODEL,
      side_effect: getToolMode(functionCall?.name) === 'write',
      idempotency_key: idempotencyKey,
      arguments_hash: argumentsHash,
      status: 'started',
    };
  }

  _isAgentOperational(actorAgent = null) {
    if (!actorAgent) return false;
    const operational = this._getOperationalConfig(actorAgent);
    const status = String(
      actorAgent.status ||
        operational.status ||
        (actorAgent.is_active === false ? 'Pausado' : 'Ativo')
    ).trim();
    return (
      actorAgent.is_active !== false && ['Ativo', 'Em teste'].includes(status)
    );
  }

  _shouldAllowSideEffects(allowSideEffects, sessionId = null) {
    if (allowSideEffects === true) return true;
    if (allowSideEffects === false) return false;

    const normalizedSession = String(sessionId || '').toLowerCase();
    if (
      normalizedSession.startsWith('sim-') ||
      normalizedSession.startsWith('test-')
    ) {
      return false;
    }

    return true;
  }

  _authorizeToolCall(
    toolName,
    actorAgent,
    autonomyOverride,
    executionContext = {}
  ) {
    if (!toolName) {
      return { allowed: false, reason: 'Ferramenta nao informada.' };
    }

    if (!this._isAgentOperational(actorAgent)) {
      return {
        allowed: false,
        reason:
          'Agente inativo ou fora do status permitido para executar ferramentas.',
      };
    }

    if (!isToolAllowed(actorAgent?.tools || [], toolName)) {
      return {
        allowed: false,
        reason: `Ferramenta ${toolName} nao habilitada para este agente.`,
      };
    }

    const autonomyLevel = this._getAgentAutonomyLevel(
      actorAgent,
      autonomyOverride
    );
    const requiredLevel = getRequiredAutonomyLevel(toolName);
    const sideEffect = getToolMode(toolName) === 'write';

    if (autonomyLevel < requiredLevel) {
      return {
        allowed: false,
        reason: `Ferramenta ${toolName} requer autonomia ${requiredLevel}. Nivel atual: ${autonomyLevel}.`,
      };
    }

    if (
      sideEffect &&
      !this._shouldAllowSideEffects(
        executionContext.allowSideEffects,
        executionContext.sessionId
      )
    ) {
      return {
        allowed: false,
        reason: 'Side effects desabilitados para esta sessao.',
      };
    }

    return { allowed: true, autonomyLevel };
  }

  async executeToolCall(
    functionCall,
    organizationId,
    leadId,
    executionContext = {}
  ) {
    const supabase = getSupabaseServer();
    const { name, args = {} } = functionCall || {};
    const actorAgent = executionContext.actorAgent || null;
    const trace = this._buildToolTrace(
      functionCall,
      { ...executionContext, organizationId, leadId },
      actorAgent
    );

    try {
      if (!organizationId) {
        trace.status = 'blocked';
        const result = { erro: 'Organizacao nao identificada.' };
        return this._attachTrace(result, trace, executionContext.executionMeta);
      }

      const authorization = this._authorizeToolCall(
        name,
        actorAgent,
        executionContext.autonomyLevel,
        executionContext
      );
      if (!authorization.allowed) {
        trace.status = 'blocked';
        return this._attachTrace(
          { erro: authorization.reason, autorizado: false },
          trace,
          executionContext.executionMeta
        );
      }

      const replay = await this._readToolExecutionLedger(
        supabase,
        organizationId,
        trace.idempotency_key
      );
      if (replay) {
        trace.status = replay.__trace?.status || replay.status || 'replayed';
        trace.replayed = true;
        return this._attachTrace(
          this._stripTrace(replay),
          trace,
          executionContext.executionMeta,
          { persistLedger: false }
        );
      }

      if (
        getToolMode(name) === 'write' &&
        (leadId || name === 'enviar_audio_whatsapp')
      ) {
        const claim = await this._claimToolExecutionLedger(
          supabase,
          organizationId,
          trace,
          executionContext.executionMeta
        );
        if (!claim.acquired) {
          trace.status = claim.replay?.__trace?.status || 'blocked';
          trace.replayed = Boolean(claim.replay);
          return this._attachTrace(
            claim.replay
              ? this._stripTrace(claim.replay)
              : {
                  erro: 'Esta ação já está sendo processada. Aguarde a conclusão antes de tentar novamente.',
                  em_processamento: true,
                },
            trace,
            executionContext.executionMeta,
            { persistLedger: false }
          );
        }
      }

      if (name === 'buscar_imoveis') {
        let query = supabase
          .from('properties')
          .select(
            'id, title, price, city, state, property_type, purpose, description, total_area_ha, images, status, bedrooms'
          )
          .eq('organization_id', organizationId)
          .eq('status', 'ativo');

        if (args.tipo) query = query.ilike('property_type', `%${args.tipo}%`);
        if (args.cidade) query = query.ilike('city', `%${args.cidade}%`);
        if (args.orcamento_maximo)
          query = query.lte('price', Number(args.orcamento_maximo));
        if (args.quartos) query = query.gte('bedrooms', Number(args.quartos));

        const { data, error } = await query.limit(5);
        if (error) throw error;

        trace.status = 'success';
        return this._attachTrace(
          {
            resultado:
              data && data.length > 0
                ? data.map((property) => ({
                    id: property.id,
                    titulo: property.title,
                    preco: property.price,
                    cidade: property.city,
                    estado: property.state,
                    tipo: property.property_type,
                    finalidade: property.purpose,
                    descricao: property.description,
                    area_total_ha: property.total_area_ha,
                    imagem: property.images?.[0] || null,
                  }))
                : 'Nenhum imovel encontrado com essas caracteristicas.',
          },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'agendar_visita') {
        if (!leadId) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Lead nao identificado. Nao e possivel agendar visita sem um lead salvo.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const lead = await this._loadLeadRecord(
          supabase,
          organizationId,
          leadId
        );
        if (!lead) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Lead nao encontrado nesta organizacao.' },
            trace,
            executionContext.executionMeta
          );
        }

        const scheduledAt = this._parseFutureDateTime(args.data_hora);
        if (!scheduledAt) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Data e hora da visita sao obrigatorias e devem estar no futuro. Formato: 2026-08-20T14:30:00Z',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const property = args.property_id
          ? await this._loadPropertyRecord(
              supabase,
              organizationId,
              args.property_id
            )
          : null;
        if (args.property_id && !property) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Imovel informado nao pertence a esta organizacao.' },
            trace,
            executionContext.executionMeta
          );
        }

        const agenda = args.agenda_id
          ? await this._loadAgendaRecord(
              supabase,
              organizationId,
              args.agenda_id
            )
          : null;
        if (args.agenda_id && !agenda) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Agenda informada nao pertence a esta organizacao.' },
            trace,
            executionContext.executionMeta
          );
        }

        const existingConflict = await this._checkExactAppointmentConflict(
          supabase,
          organizationId,
          {
            leadId,
            appointmentDate: scheduledAt,
            propertyId: args.property_id || null,
            agendaId: args.agenda_id || null,
            brokerId: agenda?.broker_id || null,
          }
        );

        if (existingConflict) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: `Ja existe um agendamento conflitante exatamente em ${scheduledAt}.`,
              conflito: {
                id: existingConflict.id,
                titulo: existingConflict.title,
                data_hora: existingConflict.appointment_date,
              },
            },
            trace,
            executionContext.executionMeta
          );
        }

        const visitTitle = property?.title
          ? `Visita Agendada: ${property.title}`
          : `Visita Agendada: ${args.property_id || 'Imovel a definir'}`;
        const appointmentNotes = [
          args.notas || '',
          property?.title ? `Imovel: ${property.title}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        const appointmentPayload = {
          organization_id: organizationId,
          lead_id: leadId,
          agenda_id: args.agenda_id || null,
          property_id: args.property_id || null,
          user_id: agenda?.broker_id || null,
          title: visitTitle,
          appointment_date: scheduledAt,
          type: 'meeting',
          status: 'pending',
          notes: appointmentNotes,
        };

        const { data: appointment, error: appointmentError } = await supabase
          .from('lead_appointments')
          .insert(appointmentPayload)
          .select('id')
          .single();

        if (appointmentError) {
          trace.status = 'error';
          return this._attachTrace(
            { erro: 'Erro ao criar agendamento: ' + appointmentError.message },
            trace,
            executionContext.executionMeta
          );
        }

        const followUpPayload = {
          organization_id: organizationId,
          lead_id: leadId,
          title: visitTitle,
          notes: appointmentNotes,
          due_at: scheduledAt,
          kind: 'visit',
          status: 'pending',
          metadata: {
            source: 'ai_agent_tool',
            idempotency_key: trace.idempotency_key,
          },
        };

        const { error: followUpError } = await supabase
          .from('lead_followups')
          .insert(followUpPayload);

        if (followUpError) {
          await supabase
            .from('lead_appointments')
            .delete()
            .eq('organization_id', organizationId)
            .eq('id', appointment.id);
        }

        trace.status = followUpError ? 'partial' : 'success';
        return this._attachTrace(
          followUpError
            ? {
                erro: 'Agendamento revertido porque o follow-up complementar nao foi criado.',
                detalhe: followUpError.message,
              }
            : {
                sucesso: true,
                mensagem: 'Visita agendada com sucesso no sistema IMOBZY.',
              },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'simular_financiamento') {
        const principal =
          Number(args.valor_imovel || 0) - Number(args.valor_entrada || 0);
        if (principal <= 0) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Valor de entrada maior ou igual ao imovel. Nao ha necessidade de financiamento.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const prazoMeses = Number(args.prazo_meses || 0);
        if (!prazoMeses || prazoMeses <= 0) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Prazo do financiamento invalido.' },
            trace,
            executionContext.executionMeta
          );
        }

        const i = 0.0079;
        const parcela =
          (principal * (i * Math.pow(1 + i, prazoMeses))) /
          (Math.pow(1 + i, prazoMeses) - 1);

        trace.status = 'success';
        return this._attachTrace(
          {
            sucesso: true,
            valor_financiado: principal,
            parcela_aproximada: parseFloat(parcela.toFixed(2)),
            taxa_juros_anual: '9.5%',
            mensagem: 'Esta e uma simulacao aproximada (Tabela Price).',
          },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'atualizar_etapa_crm') {
        if (!leadId) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Lead nao identificado. Nao e possivel mover funil sem um lead salvo.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        if (!VALID_CRM_STAGES.includes(args.nova_etapa)) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: `Etapa invalida. Use uma das seguintes: ${VALID_CRM_STAGES.join(', ')}`,
            },
            trace,
            executionContext.executionMeta
          );
        }

        const { error } = await supabase
          .from('leads')
          .update({ status: args.nova_etapa })
          .eq('id', leadId)
          .eq('organization_id', organizationId);

        trace.status = error ? 'error' : 'success';
        return this._attachTrace(
          error
            ? { erro: 'Erro ao atualizar o CRM: ' + error.message }
            : {
                sucesso: true,
                mensagem: `Lead movido com sucesso para a etapa: ${args.nova_etapa}.`,
              },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'qualificar_lead') {
        if (!leadId) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Lead nao identificado. Impossivel salvar qualificacao.' },
            trace,
            executionContext.executionMeta
          );
        }

        const temperatura = normalizeAiText(args.temperatura);
        if (!VALID_LEAD_TEMPERATURES.has(temperatura)) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Temperatura invalida. Use frio, morno ou quente.' },
            trace,
            executionContext.executionMeta
          );
        }

        const lead = await this._loadLeadRecord(
          supabase,
          organizationId,
          leadId,
          'id, ai_profile'
        );
        if (!lead) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Lead nao encontrado nesta organizacao.' },
            trace,
            executionContext.executionMeta
          );
        }

        const currentProfile =
          lead.ai_profile && typeof lead.ai_profile === 'object'
            ? lead.ai_profile
            : {};

        const newProfile = {
          ...currentProfile,
          temperature: temperatura,
          qualification_reason: args.motivo,
          last_qualified_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from('leads')
          .update({ ai_profile: newProfile })
          .eq('id', leadId)
          .eq('organization_id', organizationId);

        trace.status = error ? 'error' : 'success';
        return this._attachTrace(
          error
            ? { erro: 'Erro ao atualizar perfil do lead: ' + error.message }
            : {
                sucesso: true,
                mensagem: `Lead qualificado como ${temperatura}. Motivo salvo.`,
              },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'enviar_audio_whatsapp') {
        trace.status = 'success';
        return this._attachTrace(
          {
            sucesso: true,
            instrucao_interna:
              'A infraestrutura processara isso em breve. Na sua resposta ao cliente, inclua a tag [VOICE_AI] seguida do texto que deve ser falado. Exemplo: [VOICE_AI]Ola, como posso ajudar?[/VOICE_AI]',
          },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'consultar_agenda_disponibilidade') {
        const parsedDate = toIsoDate(args.data);
        if (!parsedDate) {
          trace.status = 'blocked';
          return this._attachTrace(
            { erro: 'Informe a data no formato YYYY-MM-DD ou ISO 8601.' },
            trace,
            executionContext.executionMeta
          );
        }

        const exactTimeRequested = String(args.data || '').includes('T');
        const conflicts = await this._checkAgendaConflicts(
          supabase,
          organizationId,
          parsedDate,
          {
            excludeLeadId: leadId || null,
            exactTime: exactTimeRequested,
          }
        );

        if (!conflicts.length) {
          trace.status = 'success';
          return this._attachTrace(
            {
              sucesso: true,
              data: exactTimeRequested ? parsedDate : parsedDate.split('T')[0],
              disponivel: true,
              mensagem: exactTimeRequested
                ? `Nenhum conflito encontrado para ${parsedDate}. O horario esta disponivel.`
                : `Nenhum conflito encontrado para ${parsedDate.split('T')[0]}.`,
            },
            trace,
            executionContext.executionMeta
          );
        }

        const horariosOcupados = conflicts
          .map(
            (conflict) =>
              `- ${formatTimePtBr(conflict.appointment_date)}: ${conflict.title}`
          )
          .join('\n');

        trace.status = 'success';
        return this._attachTrace(
          {
            sucesso: true,
            data: exactTimeRequested ? parsedDate : parsedDate.split('T')[0],
            disponivel: false,
            conflitos: conflicts.length,
            horarios_ocupados: horariosOcupados,
            mensagem: exactTimeRequested
              ? `Ja existe conflito exato em ${parsedDate}: ${horariosOcupados}`
              : `Em ${parsedDate.split('T')[0]} ja existem ${conflicts.length} agendamento(s):\n${horariosOcupados}\nSugira outro horario para o cliente.`,
          },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'consultar_documentos') {
        const propertyId = args.property_id || null;
        const documentId = args.document_id || null;

        if (!propertyId && !documentId) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Informe property_id ou document_id para consultar documentos.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        let query = supabase
          .from('documents')
          .select(
            'id, property_id, document_type, status, validation_status, validation_score, created_at, extracted_data'
          )
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(documentId ? 1 : 10);

        if (documentId) query = query.eq('id', documentId);
        if (propertyId) query = query.eq('property_id', propertyId);

        const { data: documents, error: documentsError } = await query;
        if (documentsError) throw documentsError;

        if (!documents?.length) {
          trace.status = 'success';
          return this._attachTrace(
            {
              sucesso: true,
              resultado: 'Nenhum documento encontrado para esta consulta.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const documentIds = documents.map((document) => document.id);
        const { data: analyses, error: analysesError } = await supabase
          .from('document_analyses')
          .select(
            'document_id, analysis_type, provider, confidence, created_at, result'
          )
          .in('document_id', documentIds)
          .order('created_at', { ascending: false });

        if (analysesError && !isMissingRelationError(analysesError)) {
          throw analysesError;
        }

        const analysesByDocument = new Map();
        for (const analysis of analyses || []) {
          const list = analysesByDocument.get(analysis.document_id) || [];
          list.push({
            analysis_type: analysis.analysis_type,
            provider: analysis.provider,
            confidence: analysis.confidence,
            created_at: analysis.created_at,
            result:
              analysis.result && typeof analysis.result === 'object'
                ? analysis.result
                : {},
          });
          analysesByDocument.set(analysis.document_id, list);
        }

        trace.status = 'success';
        return this._attachTrace(
          {
            sucesso: true,
            documentos: documents.map((document) => ({
              id: document.id,
              property_id: document.property_id,
              document_type: document.document_type,
              status: document.status,
              validation_status: document.validation_status,
              validation_score: document.validation_score,
              created_at: document.created_at,
              extracted_data:
                document.extracted_data &&
                typeof document.extracted_data === 'object'
                  ? document.extracted_data
                  : {},
              analyses: analysesByDocument.get(document.id) || [],
            })),
          },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'notificar_corretor') {
        if (!leadId) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Lead nao identificado. Nao e possivel notificar corretor sem um lead salvo.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const broker = await this._resolveBrokerForNotification(
          supabase,
          organizationId,
          leadId,
          args.corretor_id || null
        );

        if (!broker) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Nenhum corretor encontrado nesta organizacao para notificar.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const prioridade = args.prioridade || 'media';
        const motivo = args.motivo || 'Lead requer atencao.';

        const activityPayload = {
          organization_id: organizationId,
          lead_id: leadId,
          type: 'notificar_corretor',
          description: `[${prioridade.toUpperCase()}] ${motivo}`,
          metadata: {
            broker_id: broker.id,
            assigned_broker: broker.name,
            priority: prioridade,
            source: 'ai_agent_tool',
            idempotency_key: trace.idempotency_key,
          },
        };

        const followUpPayload = {
          organization_id: organizationId,
          lead_id: leadId,
          title: `Notificacao: ${motivo}`,
          notes: `Agente IA solicitou contato do corretor. Prioridade: ${prioridade}.`,
          due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          kind: 'follow_up',
          status: 'pending',
          metadata: {
            broker_id: broker.id,
            source: 'ai_agent_tool',
            priority: prioridade,
            idempotency_key: trace.idempotency_key,
          },
        };

        const [activityResult, followUpResult] = await Promise.allSettled([
          supabase.from('lead_activities').insert(activityPayload),
          supabase.from('lead_followups').insert(followUpPayload),
        ]);

        const errors = [activityResult, followUpResult]
          .filter(
            (result) => result.status === 'fulfilled' && result.value?.error
          )
          .map((result) => result.value.error.message)
          .concat(
            [activityResult, followUpResult]
              .filter((result) => result.status === 'rejected')
              .map((result) => result.reason?.message || 'Erro desconhecido')
          );

        trace.status = errors.length ? 'partial' : 'success';
        return this._attachTrace(
          errors.length
            ? {
                sucesso: true,
                corretor: broker.name || broker.id,
                prioridade,
                aviso:
                  'Corretor localizado, mas nem todos os registros internos foram concluídos.',
                detalhe: errors.join(' | '),
              }
            : {
                sucesso: true,
                corretor: broker.name || broker.id,
                prioridade,
                mensagem: `Corretor ${broker.name || broker.id} notificado com sucesso.`,
              },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'criar_follow_up') {
        if (!leadId) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Lead nao identificado. Nao e possivel criar follow-up sem um lead salvo.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const dueAt = this._parseFutureDateTime(args.due_at);
        if (!dueAt) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Data de vencimento obrigatoria e deve estar no futuro. Formato: 2026-08-20T10:00:00Z',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const payload = {
          organization_id: organizationId,
          lead_id: leadId,
          title: args.titulo,
          notes: args.notas || '',
          due_at: dueAt,
          kind: args.kind || 'follow_up',
          status: 'pending',
          metadata: {
            source: 'ai_agent_tool',
            idempotency_key: trace.idempotency_key,
          },
        };

        const { error } = await supabase.from('lead_followups').insert(payload);

        trace.status = error ? 'error' : 'success';
        return this._attachTrace(
          error
            ? { erro: 'Erro ao criar follow-up: ' + error.message }
            : {
                sucesso: true,
                mensagem: `Follow-up "${args.titulo}" criado para ${new Date(dueAt).toLocaleDateString('pt-BR')}.`,
              },
          trace,
          executionContext.executionMeta
        );
      }

      if (name === 'criar_tarefa') {
        if (!leadId) {
          trace.status = 'blocked';
          return this._attachTrace(
            {
              erro: 'Lead nao identificado. Nao e possivel criar tarefa sem um lead salvo.',
            },
            trace,
            executionContext.executionMeta
          );
        }

        const dueAt =
          this._parseFutureDateTime(args.due_at) ||
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const assignee = args.corretor_id || null;

        if (assignee) {
          const { data: assigneeData } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('id', assignee)
            .eq('organization_id', organizationId)
            .maybeSingle();
          if (!assigneeData) {
            trace.status = 'blocked';
            return this._attachTrace(
              {
                erro: 'Corretor atribuido nao encontrado nesta organizacao.',
              },
              trace,
              executionContext.executionMeta
            );
          }
        }

        const { error } = await supabase.from('lead_activities').insert({
          organization_id: organizationId,
          lead_id: leadId,
          type: 'tarefa',
          description: args.descricao || args.titulo,
          created_by: assignee,
          metadata: {
            title: args.titulo,
            assigned_to: assignee,
            due_at: dueAt,
            source: 'ai_agent_tool',
            idempotency_key: trace.idempotency_key,
          },
        });

        if (error) {
          trace.status = 'error';
          return this._attachTrace(
            { erro: 'Erro ao criar tarefa: ' + error.message },
            trace,
            executionContext.executionMeta
          );
        }

        let message = `Tarefa "${args.titulo}" criada`;
        if (assignee) {
          const { data: brokerData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', assignee)
            .single();
          message += ` e atribuida a ${brokerData?.name || 'corretor'}`;
        }
        message += `. Vence em ${new Date(dueAt).toLocaleDateString('pt-BR')}.`;

        trace.status = 'success';
        return this._attachTrace(
          {
            sucesso: true,
            mensagem: message,
          },
          trace,
          executionContext.executionMeta
        );
      }

      trace.status = 'blocked';
      return this._attachTrace(
        { erro: `Ferramenta ${name} desconhecida.` },
        trace,
        executionContext.executionMeta
      );
    } catch (error) {
      logger.error('[AgentOrchestrator] Erro na tool:', name, error);
      trace.status = 'error';
      return this._attachTrace(
        { erro: error.message },
        trace,
        executionContext.executionMeta
      );
    }
  }

  _attachTrace(result, trace, executionMeta, options = {}) {
    const finalResult =
      result && typeof result === 'object'
        ? { ...result, __trace: trace }
        : { resultado: result, __trace: trace };
    this._recordToolTrace(executionMeta, trace);
    this._toolReplayCache.set(trace.idempotency_key, finalResult);

    if (options.persistLedger !== false) {
      const organizationId = executionMeta?.organization_id || null;
      if (organizationId) {
        this._persistToolExecutionLedger(
          getSupabaseServer(),
          organizationId,
          finalResult,
          executionMeta
        ).catch((error) => {
          logger.warn(
            '[AgentOrchestrator] Falha ao persistir ledger:',
            error.message
          );
        });
      }
    }

    return finalResult;
  }

  async _claimToolExecutionLedger(
    supabase,
    organizationId,
    trace,
    executionMeta = {}
  ) {
    const primaryAgentId = this._maybeUuid(executionMeta?.agent_id);
    const actorAgentId = this._maybeUuid(trace.actor_agent_id);
    const payload = {
      organization_id: organizationId,
      session_id: executionMeta?.session_id || null,
      primary_agent_id: primaryAgentId,
      specialist_agent_id:
        actorAgentId && actorAgentId !== primaryAgentId ? actorAgentId : null,
      lead_id: this._maybeUuid(executionMeta?.lead_id),
      tool_name: trace.name,
      idempotency_key: trace.idempotency_key,
      arguments_hash: trace.arguments_hash,
      status: 'started',
      result: {},
      started_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('ai_tool_executions')
        .insert(payload);
      if (!error) return { acquired: true, replay: null };
      if (isMissingRelationError(error))
        return { acquired: true, replay: null };
      if (error.code !== '23505') throw error;

      const replay = await this._readToolExecutionLedger(
        supabase,
        organizationId,
        trace.idempotency_key
      );
      return { acquired: false, replay };
    } catch (error) {
      if (isMissingRelationError(error))
        return { acquired: true, replay: null };
      logger.warn(
        '[AgentOrchestrator] Falha ao reservar execução idempotente:',
        error.message
      );
      throw error;
    }
  }

  async _readToolExecutionLedger(supabase, organizationId, idempotencyKey) {
    const cached = this._toolReplayCache.get(idempotencyKey);
    if (cached) return cached;

    try {
      const { data, error } = await supabase
        .from('ai_tool_executions')
        .select('status, result')
        .eq('organization_id', organizationId)
        .eq('idempotency_key', idempotencyKey)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (isMissingRelationError(error)) return null;
        throw error;
      }

      if (
        !data?.result ||
        !['completed', 'failed', 'denied'].includes(data.status)
      ) {
        return null;
      }

      const replayResult =
        data.result && typeof data.result === 'object'
          ? {
              ...data.result,
              __trace: {
                ...(data.result.__trace || {}),
                status: this._mapLedgerStatusToTraceStatus(data.status),
                replayed: true,
              },
            }
          : null;

      if (replayResult) {
        this._toolReplayCache.set(idempotencyKey, replayResult);
      }

      return replayResult;
    } catch (error) {
      logger.warn('[AgentOrchestrator] Falha ao ler ledger:', error.message);
      return null;
    }
  }

  _mapTraceStatusToLedgerStatus(status) {
    if (status === 'success' || status === 'replayed') return 'completed';
    if (status === 'blocked') return 'denied';
    return 'failed';
  }

  _mapLedgerStatusToTraceStatus(status) {
    if (status === 'completed') return 'success';
    if (status === 'denied') return 'blocked';
    return 'error';
  }

  _mapExecutionStatus(executionMeta) {
    if (executionMeta.route_mode === 'error') return 'failed';
    if (
      executionMeta.toolCalls.some((toolCall) => toolCall.status === 'blocked')
    ) {
      return 'denied';
    }
    if (
      executionMeta.toolCalls.some(
        (toolCall) =>
          toolCall.status === 'partial' || toolCall.status === 'error'
      )
    ) {
      return 'partial';
    }
    return 'completed';
  }

  _maybeUuid(value) {
    const normalized = String(value || '').trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      normalized
    )
      ? normalized
      : null;
  }

  async _persistToolExecutionLedger(
    supabase,
    organizationId,
    result,
    executionMeta
  ) {
    try {
      const trace = result?.__trace || {};
      const payload = {
        organization_id: organizationId,
        session_id: executionMeta?.session_id || null,
        primary_agent_id: this._maybeUuid(executionMeta?.agent_id),
        specialist_agent_id:
          this._maybeUuid(trace.actor_agent_id) !==
          this._maybeUuid(executionMeta?.agent_id)
            ? this._maybeUuid(trace.actor_agent_id)
            : null,
        lead_id: this._maybeUuid(executionMeta?.lead_id),
        tool_name: trace.name || null,
        idempotency_key: trace.idempotency_key || null,
        arguments_hash: trace.arguments_hash || trace.idempotency_key,
        status: this._mapTraceStatusToLedgerStatus(trace.status || 'success'),
        result,
        error_class: result?.erro ? 'tool_error' : null,
        started_at: executionMeta?.started_at || new Date().toISOString(),
        completed_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('ai_tool_executions')
        .upsert(payload, {
          onConflict: 'organization_id,idempotency_key',
        });
      if (error && !isMissingRelationError(error)) throw error;
    } catch (error) {
      if (!isMissingRelationError(error)) throw error;
    }
  }

  async _persistExecutionArtifacts(supabase, executionMeta, conversationState) {
    if (!executionMeta.finished_at) {
      executionMeta.finished_at = new Date().toISOString();
    }
    await Promise.allSettled([
      this._persistExecutionTrace(supabase, executionMeta),
      this._persistConversationState(
        supabase,
        executionMeta,
        conversationState
      ),
    ]);
  }

  async _persistExecutionTrace(supabase, executionMeta) {
    try {
      const payload = {
        organization_id: executionMeta.organization_id,
        ...(this._maybeUuid(executionMeta.request_id)
          ? { request_id: this._maybeUuid(executionMeta.request_id) }
          : {}),
        session_id: executionMeta.session_id,
        primary_agent_id: this._maybeUuid(executionMeta.agent_id),
        lead_id: this._maybeUuid(executionMeta.lead_id),
        provider: 'gemini',
        model: DEFAULT_AGENT_MODEL,
        status: this._mapExecutionStatus(executionMeta),
        route_plan: {
          route_mode: executionMeta.route_mode,
          fallback_used: executionMeta.fallback_used,
          specialists: executionMeta.specialists,
        },
        specialist_results: executionMeta.specialists || [],
        tool_events: executionMeta.toolCalls || [],
        latency_ms: Math.max(
          0,
          new Date(executionMeta.finished_at).getTime() -
            new Date(executionMeta.started_at).getTime()
        ),
        completed_at: executionMeta.finished_at,
        error_class:
          executionMeta.route_mode === 'error' ? 'orchestrator_error' : null,
      };
      const { error } = await supabase
        .from('ai_execution_traces')
        .insert(payload);
      if (error && !isMissingRelationError(error)) throw error;
    } catch (error) {
      if (!isMissingRelationError(error)) {
        logger.warn(
          '[AgentOrchestrator] Falha ao persistir trace:',
          error.message
        );
      }
    }
  }

  async _persistConversationState(supabase, executionMeta, conversationState) {
    if (!conversationState || !executionMeta?.session_id) return;

    try {
      const payload = {
        organization_id: executionMeta.organization_id,
        session_id: executionMeta.session_id,
        primary_agent_id: this._maybeUuid(executionMeta.agent_id),
        lead_id: this._maybeUuid(executionMeta.lead_id),
        conversation_summary:
          conversationState.summary ||
          conversationState.conversation_summary ||
          '',
        facts:
          conversationState.facts && typeof conversationState.facts === 'object'
            ? conversationState.facts
            : {},
        answered_fields:
          conversationState.answered_fields ||
          conversationState.answeredFields ||
          [],
        asked_questions:
          conversationState.asked_questions ||
          conversationState.askedQuestions ||
          [],
        active_intents:
          conversationState.active_intents ||
          conversationState.activeIntents ||
          [],
        version: Number(conversationState.version || 1),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('ai_conversation_states')
        .upsert(payload, {
          onConflict: 'organization_id,session_id',
        });
      if (error && !isMissingRelationError(error)) throw error;
    } catch (error) {
      if (!isMissingRelationError(error)) {
        logger.warn(
          '[AgentOrchestrator] Falha ao persistir conversation state:',
          error.message
        );
      }
    }
  }

  async _loadLeadRecord(
    supabase,
    organizationId,
    leadId,
    fields = 'id, assigned_to, ai_profile'
  ) {
    const { data } = await supabase
      .from('leads')
      .select(fields)
      .eq('id', leadId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    return data || null;
  }

  async _loadPropertyRecord(supabase, organizationId, propertyId) {
    const { data } = await supabase
      .from('properties')
      .select('id, title, status')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    return data || null;
  }

  async _loadAgendaRecord(supabase, organizationId, agendaId) {
    const { data, error } = await supabase
      .from('agendas')
      .select('id, name, broker_id')
      .eq('id', agendaId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error && !isMissingRelationError(error)) throw error;
    return data || null;
  }

  _parseFutureDateTime(value) {
    const iso = toIsoDate(value);
    if (!iso) return null;
    if (new Date(iso).getTime() <= Date.now()) return null;
    return iso;
  }

  async _checkExactAppointmentConflict(
    supabase,
    organizationId,
    {
      leadId,
      appointmentDate,
      propertyId = null,
      agendaId = null,
      brokerId = null,
    }
  ) {
    const { data, error } = await supabase
      .from('lead_appointments')
      .select(
        'id, lead_id, property_id, agenda_id, user_id, title, appointment_date, status'
      )
      .eq('organization_id', organizationId)
      .eq('appointment_date', appointmentDate)
      .neq('status', 'canceled');

    if (error) throw error;

    return (data || []).find((appointment) => {
      if (appointment.lead_id === leadId) return true;
      if (agendaId && appointment.agenda_id === agendaId) return true;
      if (brokerId && appointment.user_id === brokerId) return true;
      if (propertyId && appointment.property_id === propertyId) return true;
      return !agendaId && !propertyId;
    });
  }

  async _checkAgendaConflicts(
    supabase,
    organizationId,
    dateIso,
    { excludeLeadId = null, exactTime = false } = {}
  ) {
    let query = supabase
      .from('lead_appointments')
      .select('id, title, appointment_date, status, lead_id')
      .eq('organization_id', organizationId)
      .neq('status', 'canceled');

    if (exactTime) {
      query = query.eq('appointment_date', dateIso);
    } else {
      const startOfDay = new Date(dateIso);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateIso);
      endOfDay.setHours(23, 59, 59, 999);
      query = query
        .gte('appointment_date', startOfDay.toISOString())
        .lte('appointment_date', endOfDay.toISOString());
    }

    if (excludeLeadId) query = query.neq('lead_id', excludeLeadId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async _resolveBrokerForNotification(
    supabase,
    organizationId,
    leadId,
    explicitBrokerId = null
  ) {
    if (explicitBrokerId) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', explicitBrokerId)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (data) return data;
    }

    const assignedLead = await this._loadLeadRecord(
      supabase,
      organizationId,
      leadId,
      'id, assigned_to'
    );

    if (assignedLead?.assigned_to) {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', assignedLead.assigned_to)
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (data) return data;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('organization_id', organizationId)
      .in('role', ['broker', 'corretor', 'admin'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data || null;
  }
}

export { AGENT_RUNTIME_REGISTRY, TOOL_DEFINITIONS };
