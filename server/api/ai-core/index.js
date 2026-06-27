import express from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { AICoreService } from '../../services/aiCoreService.js';

const router = express.Router();

function requireTenantUnlessSuperAdmin(req, res, next) {
  if (req.orgId || req.userRole === 'superadmin') return next();
  return requireTenant(req, res, next);
}

router.get('/health', async (req, res) => {
  const ollamaUrl = process.env.AI_CORE_OLLAMA_URL || 'http://ollama:11434';
  try {
    const response = await fetch(`${ollamaUrl.replace(/\/+$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.json({
      success: true,
      service: 'imobzy-ai-core',
      ollama: response.ok ? 'online' : 'unhealthy',
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      service: 'imobzy-ai-core',
      ollama: 'offline',
      error: error.message,
    });
  }
});

router.get('/models', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    let query = supabase
      .from('ai_models')
      .select('*')
      .order('purpose', { ascending: true })
      .order('priority', { ascending: true });

    if (req.orgId) {
      query = query.or(`organization_id.eq.${req.orgId},organization_id.is.null`);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, models: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/models', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const payload = normalizeModelPayload(req.body, req.orgId);
    const { data, error } = await supabase
      .from('ai_models')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, model: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/models/:id/test', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    const aiCore = new AICoreService();
    const result = await aiCore.chat({
      organizationId: req.orgId,
      userId: req.user?.id,
      modelId: req.params.id,
      channel: 'admin',
      prompt: req.body.prompt || 'Responda em uma frase: modelo local funcionando.',
      systemInstruction: 'Voce e um verificador tecnico da IMOBZY. Seja breve.',
      temperature: 0.2,
      maxTokens: 120,
      metadata: { test: true },
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/chat', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    const aiCore = new AICoreService();
    const result = await aiCore.chat({
      organizationId: req.orgId,
      userId: req.user?.id,
      agentId: req.body.agent_id || req.body.agentId || null,
      routeKey: req.body.route_key || req.body.routeKey || 'default',
      channel: req.body.channel || 'api',
      messages: req.body.messages || [],
      prompt: req.body.prompt || req.body.message || '',
      systemInstruction: req.body.systemInstruction || req.body.system_instruction || '',
      modelId: req.body.model || req.body.model_id || '',
      temperature: req.body.temperature,
      maxTokens: req.body.max_tokens || req.body.maxTokens,
      jsonMode: Boolean(req.body.jsonMode || req.body.json_mode),
      metadata: {
        source: 'api-ai-core',
        context: req.body.context || {},
      },
    });
    res.json(result);
  } catch (error) {
    const status = error.code === 'AI_CREDITS_BLOCKED' ? 402 : 500;
    res.status(status).json({ success: false, error: error.message, code: error.code || 'AI_CORE_ERROR' });
  }
});

router.get('/routes', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    let query = supabase
      .from('ai_model_routes')
      .select('*')
      .is('agent_id', null)
      .order('route_key', { ascending: true })
      .order('created_at', { ascending: false });

    if (req.orgId) {
      query = query.or(`organization_id.eq.${req.orgId},organization_id.is.null`);
    } else {
      query = query.is('organization_id', null);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, routes: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/routes', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const routes = Array.isArray(req.body?.routes) ? req.body.routes : [];
    if (routes.length === 0) {
      return res.status(400).json({ success: false, error: 'routes deve ser uma lista.' });
    }

    const saved = [];
    for (const routeBody of routes) {
      const payload = normalizeRoutePayload(routeBody, req.orgId);
      let lookup = supabase
        .from('ai_model_routes')
        .select('id')
        .eq('route_key', payload.route_key)
        .eq('purpose', payload.purpose)
        .is('agent_id', null)
        .limit(1);

      lookup = req.orgId ? lookup.eq('organization_id', req.orgId) : lookup.is('organization_id', null);
      const { data: existing, error: lookupError } = await lookup.maybeSingle();
      if (lookupError) throw lookupError;

      if (existing?.id) {
        const { data, error } = await supabase
          .from('ai_model_routes')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        saved.push(data);
      } else {
        const { data, error } = await supabase
          .from('ai_model_routes')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        saved.push(data);
      }
    }

    res.json({ success: true, routes: saved });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/usage', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    let query = supabase
      .from('ai_usage_logs')
      .select('id, organization_id, model_name, engine, channel, operation, credits_used, latency_ms, status, error_message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (req.orgId) query = query.eq('organization_id', req.orgId);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, usage: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/credits', verifyAuth, requireTenantUnlessSuperAdmin, async (req, res) => {
  try {
    if (!req.orgId) {
      return res.json({ success: true, balance: { organization_id: null, balance: 0, blocked: false } });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('ai_client_balances')
      .select('*')
      .eq('organization_id', req.orgId)
      .maybeSingle();

    if (error) throw error;
    res.json({ success: true, balance: data || { organization_id: req.orgId, balance: 0, blocked: false } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/credits/add', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const amount = Number(req.body.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'amount deve ser positivo.' });
    }

    const { data: current } = await supabase
      .from('ai_client_balances')
      .select('id, balance')
      .eq('organization_id', req.orgId)
      .maybeSingle();

    const balanceAfter = Number(current?.balance || 0) + amount;
    if (current?.id) {
      await supabase
        .from('ai_client_balances')
        .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
        .eq('id', current.id);
    } else {
      await supabase
        .from('ai_client_balances')
        .insert({ organization_id: req.orgId, balance: balanceAfter });
    }

    await supabase.from('ai_credit_transactions').insert({
      organization_id: req.orgId,
      type: 'grant',
      amount,
      balance_after: balanceAfter,
      reason: req.body.reason || 'Credito manual de IA',
      metadata: { user_id: req.user?.id || null },
    });

    res.json({ success: true, balance: balanceAfter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function normalizeModelPayload(body, organizationId) {
  if (!body?.model_id && !body?.modelId) throw new Error('model_id e obrigatorio.');

  return {
    organization_id: body.global ? null : organizationId,
    name: body.name || body.model_id || body.modelId,
    commercial_name: body.commercial_name || body.commercialName || body.name || body.model_id || body.modelId,
    provider: body.provider || 'local',
    engine: body.engine || 'ollama',
    endpoint: body.endpoint || process.env.AI_CORE_OLLAMA_URL || 'http://ollama:11434',
    model_id: body.model_id || body.modelId,
    purpose: body.purpose || 'chat',
    context_window: Number(body.context_window || body.contextWindow || 8192),
    supports_streaming: body.supports_streaming ?? body.supportsStreaming ?? true,
    supports_function_calling: body.supports_function_calling ?? body.supportsFunctionCalling ?? false,
    supports_vision: body.supports_vision ?? body.supportsVision ?? false,
    supports_audio: body.supports_audio ?? body.supportsAudio ?? false,
    supports_embeddings: body.supports_embeddings ?? body.supportsEmbeddings ?? false,
    requires_gpu: body.requires_gpu ?? body.requiresGpu ?? false,
    min_ram_gb: body.min_ram_gb || body.minRamGb || null,
    min_vram_gb: body.min_vram_gb || body.minVramGb || null,
    internal_cost_per_1k_tokens: body.internal_cost_per_1k_tokens || 0,
    sale_price_per_1k_tokens: body.sale_price_per_1k_tokens || 0,
    credit_multiplier: body.credit_multiplier || 1,
    status: body.status || 'active',
    priority: Number(body.priority || 100),
    metadata: body.metadata || {},
  };
}

function normalizeRoutePayload(body, organizationId) {
  const routeKey = body.route_key || body.routeKey || 'default';
  const purpose = body.purpose || 'chat';
  const temperature = Number(body.temperature ?? 0.7);
  const maxTokens = Number(body.max_tokens || body.maxTokens || 900);

  return {
    organization_id: body.global ? null : organizationId || null,
    agent_id: null,
    route_key: routeKey,
    purpose,
    primary_model_id: body.primary_model_id || body.primaryModelId || null,
    fallback_model_id: body.fallback_model_id || body.fallbackModelId || null,
    temperature: Number.isFinite(temperature) ? temperature : 0.7,
    max_tokens: Number.isFinite(maxTokens) ? maxTokens : 900,
    is_active: body.is_active ?? body.isActive ?? true,
    metadata: body.metadata || {},
  };
}

export default router;
