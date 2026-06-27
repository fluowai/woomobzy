import { getSupabaseServer } from '../lib/supabase-server.js';

const DEFAULT_OLLAMA_ENDPOINT = process.env.AI_CORE_OLLAMA_URL || 'http://ollama:11434';
const DEFAULT_LITELLM_ENDPOINT = process.env.AI_CORE_LITELLM_URL || 'http://litellm:4000';
const DEFAULT_CHAT_MODEL = process.env.AI_CORE_DEFAULT_CHAT_MODEL || 'qwen2.5:7b';
const DEFAULT_EMBEDDING_MODEL = process.env.AI_CORE_DEFAULT_EMBEDDING_MODEL || 'nomic-embed-text';
const ENFORCE_CREDITS = String(process.env.AI_CORE_ENFORCE_CREDITS || 'false').toLowerCase() === 'true';

export class AICoreService {
  constructor() {
    this.supabase = getSupabaseServer();
  }

  async chat({
    organizationId,
    userId = null,
    agentId = null,
    routeKey = 'default',
    channel = 'api',
    messages = [],
    prompt = '',
    systemInstruction = '',
    modelId = '',
    temperature,
    maxTokens,
    jsonMode = false,
    metadata = {},
  }) {
    const startedAt = Date.now();
    const normalizedMessages = normalizeMessages({ messages, prompt, systemInstruction });
    const inputText = normalizedMessages.map((message) => `${message.role}: ${message.content}`).join('\n').slice(0, 12000);

    let resolvedModel = null;
    let usageLogId = null;

    try {
      resolvedModel = await this.resolveModel({
        organizationId,
        agentId,
        routeKey,
        purpose: 'chat',
        requestedModel: modelId,
      });

      const creditPreview = estimateCredits({
        inputTokens: estimateTokens(inputText),
        outputTokens: maxTokens || 600,
        multiplier: resolvedModel.credit_multiplier,
      });

      await this.assertCreditsAvailable(organizationId, creditPreview);

      const effectiveTemperature = temperature ?? resolvedModel.route_temperature;
      const effectiveMaxTokens = maxTokens || resolvedModel.route_max_tokens;
      let callMetadata = metadata;
      let result;

      try {
        result = await this.callModel({
          model: resolvedModel,
          messages: normalizedMessages,
          temperature: effectiveTemperature,
          maxTokens: effectiveMaxTokens,
          jsonMode,
        });
      } catch (modelError) {
        const fallbackModel = await this.findModelByUuid(resolvedModel.route_fallback_model_id);
        if (!fallbackModel || modelId) throw modelError;

        const primaryModelId = resolvedModel.model_id;
        resolvedModel = fallbackModel;
        callMetadata = {
          ...metadata,
          fallback_from_model: primaryModelId,
          fallback_reason: modelError.message,
        };
        result = await this.callModel({
          model: resolvedModel,
          messages: normalizedMessages,
          temperature: effectiveTemperature,
          maxTokens: effectiveMaxTokens,
          jsonMode,
        });
      }

      const outputText = String(result.text || '');
      const inputTokens = result.inputTokens || estimateTokens(inputText);
      const outputTokens = result.outputTokens || estimateTokens(outputText);
      const creditsUsed = estimateCredits({
        inputTokens,
        outputTokens,
        multiplier: resolvedModel.credit_multiplier,
      });
      const latencyMs = Date.now() - startedAt;

      usageLogId = await this.logUsage({
        organizationId,
        userId,
        agentId,
        model: resolvedModel,
        routeKey,
        channel,
        operation: 'chat',
        inputText,
        outputText,
        inputTokens,
        outputTokens,
        creditsUsed,
        latencyMs,
        status: 'success',
        metadata: callMetadata,
      });

      await this.debitCredits({
        organizationId,
        usageLogId,
        amount: creditsUsed,
        reason: `AI chat using ${resolvedModel.model_id}`,
      });

      return {
        success: true,
        text: outputText,
        model: resolvedModel.model_id,
        provider: resolvedModel.provider,
        engine: resolvedModel.engine,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          credits: creditsUsed,
          latency_ms: latencyMs,
        },
        raw: result.raw,
      };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      await this.logUsage({
        organizationId,
        userId,
        agentId,
        model: resolvedModel,
        routeKey,
        channel,
        operation: 'chat',
        inputText,
        outputText: '',
        inputTokens: estimateTokens(inputText),
        outputTokens: 0,
        creditsUsed: 0,
        latencyMs,
        status: error.code === 'AI_CREDITS_BLOCKED' ? 'blocked' : 'error',
        errorMessage: error.message,
        metadata,
      });
      throw error;
    }
  }

  async generateJson(params) {
    const response = await this.chat({
      ...params,
      jsonMode: true,
      temperature: params.temperature ?? 0.2,
    });
    return parseJsonResponse(response.text);
  }

  async resolveModel({ organizationId, agentId, routeKey, purpose, requestedModel }) {
    if (requestedModel) {
      const model = await this.findModelByIdOrName(organizationId, requestedModel, purpose);
      if (model) return model;
    }

    const route = await this.findRoute({ organizationId, agentId, routeKey, purpose });
    if (route?.primary_model_id) {
      const model = await this.findModelByUuid(route.primary_model_id);
      if (model) return mergeRouteDefaults(model, route);
    }

    const model = await this.findDefaultModel(organizationId, purpose);
    if (model) return model;

    return {
      id: null,
      name: purpose === 'embedding' ? DEFAULT_EMBEDDING_MODEL : DEFAULT_CHAT_MODEL,
      provider: 'local',
      engine: 'ollama',
      endpoint: DEFAULT_OLLAMA_ENDPOINT,
      model_id: purpose === 'embedding' ? DEFAULT_EMBEDDING_MODEL : DEFAULT_CHAT_MODEL,
      purpose,
      context_window: 8192,
      credit_multiplier: 1,
      internal_cost_per_1k_tokens: 0,
      sale_price_per_1k_tokens: 0,
    };
  }

  async findRoute({ organizationId, agentId, routeKey, purpose }) {
    try {
      let query = this.supabase
        .from('ai_model_routes')
        .select('*')
        .eq('route_key', routeKey || 'default')
        .eq('purpose', purpose)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (organizationId) {
        query = query.or(`organization_id.eq.${organizationId},organization_id.is.null`);
      } else {
        query = query.is('organization_id', null);
      }

      if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      } else {
        query = query.is('agent_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const routes = data || [];
      return (
        routes.find((route) => route.organization_id === organizationId && route.agent_id === agentId) ||
        routes.find((route) => route.organization_id === organizationId && !route.agent_id) ||
        routes.find((route) => !route.organization_id && route.agent_id === agentId) ||
        routes.find((route) => !route.organization_id && !route.agent_id) ||
        null
      );
    } catch (error) {
      console.warn('[AICore] Route lookup skipped:', error.message);
      return null;
    }
  }

  async findModelByUuid(id) {
    if (!id) return null;
    try {
      const { data, error } = await this.supabase
        .from('ai_models')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    } catch (error) {
      console.warn('[AICore] Model lookup by id skipped:', error.message);
      return null;
    }
  }

  async findModelByIdOrName(organizationId, requestedModel, purpose) {
    try {
      const filters = [`model_id.eq.${requestedModel}`, `name.eq.${requestedModel}`];
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestedModel)) {
        filters.push(`id.eq.${requestedModel}`);
      }
      const { data, error } = await this.supabase
        .from('ai_models')
        .select('*')
        .or(filters.join(','))
        .eq('purpose', purpose)
        .in('status', ['active', 'available'])
        .order('priority', { ascending: true })
        .limit(10);

      if (error) throw error;
      return (data || []).find((model) => !model.organization_id || model.organization_id === organizationId) || null;
    } catch (error) {
      console.warn('[AICore] Requested model lookup skipped:', error.message);
      return null;
    }
  }

  async findDefaultModel(organizationId, purpose) {
    try {
      const { data, error } = await this.supabase
        .from('ai_models')
        .select('*')
        .eq('purpose', purpose)
        .eq('status', 'active')
        .order('priority', { ascending: true })
        .limit(25);

      if (error) throw error;
      return (data || []).find((model) => model.organization_id === organizationId)
        || (data || []).find((model) => !model.organization_id)
        || null;
    } catch (error) {
      console.warn('[AICore] Default model lookup skipped:', error.message);
      return null;
    }
  }

  async callModel({ model, messages, temperature, maxTokens, jsonMode }) {
    if (model.engine === 'litellm' || model.engine === 'vllm' || model.engine === 'external') {
      return this.callOpenAICompatible({ model, messages, temperature, maxTokens, jsonMode });
    }
    return this.callOllama({ model, messages, temperature, maxTokens, jsonMode });
  }

  async callOllama({ model, messages, temperature, maxTokens, jsonMode }) {
    const endpoint = stripTrailingSlash(model.endpoint || DEFAULT_OLLAMA_ENDPOINT);
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.model_id,
        messages,
        stream: false,
        format: jsonMode ? 'json' : undefined,
        options: {
          temperature: temperature ?? 0.7,
          num_predict: maxTokens || undefined,
        },
      }),
      signal: AbortSignal.timeout(Number(process.env.AI_CORE_TIMEOUT_MS || 120000)),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Ollama ${response.status}: ${body.slice(0, 500)}`);
    }

    const raw = await response.json();
    return {
      text: raw?.message?.content || raw?.response || '',
      inputTokens: raw?.prompt_eval_count || 0,
      outputTokens: raw?.eval_count || 0,
      raw,
    };
  }

  async callOpenAICompatible({ model, messages, temperature, maxTokens, jsonMode }) {
    const endpoint = stripTrailingSlash(model.endpoint || DEFAULT_LITELLM_ENDPOINT);
    const apiKey = process.env.LITELLM_MASTER_KEY || process.env.AI_CORE_OPENAI_COMPATIBLE_KEY || 'change-me';
    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.model_id,
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: maxTokens || undefined,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
      }),
      signal: AbortSignal.timeout(Number(process.env.AI_CORE_TIMEOUT_MS || 120000)),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI-compatible ${response.status}: ${body.slice(0, 500)}`);
    }

    const raw = await response.json();
    return {
      text: raw?.choices?.[0]?.message?.content || '',
      inputTokens: raw?.usage?.prompt_tokens || 0,
      outputTokens: raw?.usage?.completion_tokens || 0,
      raw,
    };
  }

  async assertCreditsAvailable(organizationId, estimatedCredits) {
    if (!ENFORCE_CREDITS || !organizationId) return true;

    try {
      const { data, error } = await this.supabase
        .from('ai_client_balances')
        .select('balance, blocked, hard_limit')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) throw error;
      if (data?.blocked) {
        const blocked = new Error('IA bloqueada para este cliente.');
        blocked.code = 'AI_CREDITS_BLOCKED';
        throw blocked;
      }
      if (data && Number(data.balance || 0) < estimatedCredits) {
        const insufficient = new Error('Saldo de creditos de IA insuficiente.');
        insufficient.code = 'AI_CREDITS_BLOCKED';
        throw insufficient;
      }
      return true;
    } catch (error) {
      if (error.code === 'AI_CREDITS_BLOCKED') throw error;
      console.warn('[AICore] Credit check skipped:', error.message);
      return true;
    }
  }

  async debitCredits({ organizationId, usageLogId, amount, reason }) {
    if (!organizationId || !amount) return null;

    try {
      const { data: balanceRow } = await this.supabase
        .from('ai_client_balances')
        .select('id, balance')
        .eq('organization_id', organizationId)
        .maybeSingle();

      let balanceAfter = null;
      if (balanceRow) {
        balanceAfter = Number(balanceRow.balance || 0) - Number(amount || 0);
        await this.supabase
          .from('ai_client_balances')
          .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
          .eq('id', balanceRow.id);
      }

      await this.supabase.from('ai_credit_transactions').insert({
        organization_id: organizationId,
        usage_log_id: usageLogId,
        type: 'debit',
        amount: Number(amount) * -1,
        balance_after: balanceAfter,
        reason,
      });
      return balanceAfter;
    } catch (error) {
      console.warn('[AICore] Credit debit skipped:', error.message);
      return null;
    }
  }

  async logUsage({
    organizationId,
    userId,
    agentId,
    model,
    routeKey,
    channel,
    operation,
    inputText,
    outputText,
    inputTokens,
    outputTokens,
    creditsUsed,
    latencyMs,
    status,
    errorMessage,
    metadata,
  }) {
    try {
      const internalCost = calculateMoney(inputTokens, outputTokens, model?.internal_cost_per_1k_tokens);
      const saleValue = calculateMoney(inputTokens, outputTokens, model?.sale_price_per_1k_tokens);
      const { data, error } = await this.supabase
        .from('ai_usage_logs')
        .insert({
          organization_id: organizationId || null,
          user_id: userId || null,
          agent_id: agentId || null,
          model_id: model?.id || null,
          provider: model?.provider || 'local',
          engine: model?.engine || 'ollama',
          endpoint: model?.endpoint || DEFAULT_OLLAMA_ENDPOINT,
          model_name: model?.model_id || DEFAULT_CHAT_MODEL,
          route_key: routeKey || 'default',
          channel,
          operation,
          input_text: inputText,
          output_text: outputText,
          input_tokens: inputTokens || 0,
          output_tokens: outputTokens || 0,
          credits_used: creditsUsed || 0,
          internal_cost: internalCost,
          sale_value: saleValue,
          latency_ms: latencyMs || 0,
          status,
          error_message: errorMessage || null,
          metadata: metadata || {},
        })
        .select('id')
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.warn('[AICore] Usage log skipped:', error.message);
      return null;
    }
  }
}

export function normalizeMessages({ messages = [], prompt = '', systemInstruction = '' }) {
  const normalized = [];
  if (systemInstruction) normalized.push({ role: 'system', content: String(systemInstruction) });

  for (const message of Array.isArray(messages) ? messages : []) {
    if (!message?.content) continue;
    const role = ['system', 'user', 'assistant', 'tool'].includes(message.role) ? message.role : 'user';
    normalized.push({ role, content: String(message.content) });
  }

  if (prompt) normalized.push({ role: 'user', content: String(prompt) });
  if (!normalized.length) throw new Error('Nenhuma mensagem enviada para a IA.');
  return normalized;
}

export function estimateTokens(text = '') {
  return Math.max(1, Math.ceil(String(text).length / 4));
}

export function estimateCredits({ inputTokens = 0, outputTokens = 0, multiplier = 1 }) {
  const tokenCredits = Math.ceil((Number(inputTokens || 0) + Number(outputTokens || 0)) / 1000);
  return Math.max(1, tokenCredits) * Number(multiplier || 1);
}

function mergeRouteDefaults(model, route) {
  return {
    ...model,
    route_temperature: route.temperature,
    route_max_tokens: route.max_tokens,
    route_fallback_model_id: route.fallback_model_id,
  };
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function calculateMoney(inputTokens, outputTokens, pricePer1k) {
  return Number((((Number(inputTokens || 0) + Number(outputTokens || 0)) / 1000) * Number(pricePer1k || 0)).toFixed(6));
}

function parseJsonResponse(text) {
  const clean = String(text || '').replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch (error) {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw error;
  }
}
