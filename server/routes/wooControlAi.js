import express from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { canAccessWooControl } from '../lib/woo-control-access.js';
import { getLLMOrchestrator } from '../services/ai/llmProvider.js';

const router = express.Router();

async function requireWooAdmin(req, res, next) {
  try {
    const db = getSupabaseServer();
    const allowed = await canAccessWooControl(req, db);
    if (!allowed) {
      return res.status(403).json({ error: 'Acesso restrito ao WooControl Admin' });
    }
    return next();
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

router.use(verifyAuth, requireWooAdmin);

router.get('/status', async (req, res) => {
  try {
    const db = getSupabaseServer();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: settings }, { data: usageRows, error: usageErr }] =
      await Promise.all([
        db
          .from('saas_settings')
          .select(
            'global_openai_key, global_gemini_key, global_anthropic_key, global_groq_key, global_openrouter_key'
          )
          .eq('id', 1)
          .maybeSingle(),
        db
          .from('ai_llm_usage')
          .select('provider, model, total_tokens, cost_usd, created_at')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

    if (usageErr) throw usageErr;

    const totals = (usageRows || []).reduce(
      (acc, row) => {
        acc.requests += 1;
        acc.totalTokens += Number(row.total_tokens || 0);
        acc.costUsd += Number(row.cost_usd || 0);
        const prov = row.provider || 'unknown';
        acc.byProvider[prov] = (acc.byProvider[prov] || 0) + Number(row.total_tokens || 0);
        return acc;
      },
      { requests: 0, totalTokens: 0, costUsd: 0, byProvider: {} }
    );

    res.json({
      success: true,
      providers: {
        openai: Boolean(settings?.global_openai_key),
        gemini: Boolean(settings?.global_gemini_key),
        anthropic: Boolean(settings?.global_anthropic_key),
        groq: Boolean(settings?.global_groq_key),
        openrouter: Boolean(settings?.global_openrouter_key),
      },
      usage30d: totals,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/usage', async (req, res) => {
  try {
    const db = getSupabaseServer();
    const days = Math.min(Number(req.query.days || 30), 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await db
      .from('ai_llm_usage')
      .select('id, organization_id, task_type, provider, model, prompt_tokens, completion_tokens, total_tokens, cost_usd, is_fallback, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    res.json({ success: true, usage: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/config', async (req, res) => {
  try {
    const db = getSupabaseServer();
    const {
      global_openai_key,
      global_gemini_key,
      global_anthropic_key,
      global_groq_key,
      global_openrouter_key,
    } = req.body || {};

    const payload = { id: 1 };
    if (global_openai_key !== undefined) payload.global_openai_key = global_openai_key || null;
    if (global_gemini_key !== undefined) payload.global_gemini_key = global_gemini_key || null;
    if (global_anthropic_key !== undefined) payload.global_anthropic_key = global_anthropic_key || null;
    if (global_groq_key !== undefined) payload.global_groq_key = global_groq_key || null;
    if (global_openrouter_key !== undefined) payload.global_openrouter_key = global_openrouter_key || null;

    const { error } = await db
      .from('saas_settings')
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;

    getLLMOrchestrator().invalidateCache();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;