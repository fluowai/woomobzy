import express from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { AICoreService } from '../../services/aiCoreService.js';

const router = express.Router();

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

router.get('/models', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('ai_models')
      .select('*')
      .or(`organization_id.eq.${req.orgId},organization_id.is.null`)
      .order('purpose', { ascending: true })
      .order('priority', { ascending: true });

    if (error) throw error;
    res.json({ success: true, models: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/models', verifyAuth, requireTenant, async (req, res) => {
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

router.post('/models/:id/test', verifyAuth, requireTenant, async (req, res) => {
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

router.post('/chat', verifyAuth, requireTenant, async (req, res) => {
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

router.get('/usage', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const { data, error } = await supabase
      .from('ai_usage_logs')
      .select('id, model_name, engine, channel, operation, credits_used, latency_ms, status, error_message, created_at')
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ success: true, usage: data || [] });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/credits', verifyAuth, requireTenant, async (req, res) => {
  try {
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

export default router;

