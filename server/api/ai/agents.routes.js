import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import {
  isMissingRelationError,
  normalizeAgentPayload,
  hydrateAgent,
  listFallbackAgentsSafe,
  createFallbackAgent,
  updateFallbackAgent,
  deleteFallbackAgent,
} from './helpers.js';

const router = Router();

router.get('/agents', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn(
        '[AIAgents] Falha ao listar ai_agents, usando fallback:',
        error.message
      );
      const agents = await listFallbackAgentsSafe(supabase, req.orgId);
      return res.json({
        success: true,
        agents,
        setup_required: true,
        message: isMissingRelationError(error)
          ? 'Tabela ai_agents ainda nao foi criada. Salvando agentes temporariamente em site_settings.integrations.operationalAgents.'
          : 'Nao foi possivel consultar ai_agents. A tela foi carregada em modo seguro.',
      });
    }
    res.json({ success: true, agents: (data || []).map(hydrateAgent) });
  } catch (error) {
    console.error('[AIAgents] Erro ao carregar agentes:', error.message);
    res.json({
      success: true,
      agents: [],
      setup_required: true,
      message:
        'Nao foi possivel carregar agentes agora. A tela foi carregada em modo seguro.',
    });
  }
});

router.post('/agents', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const payload = normalizeAgentPayload(req.body);

    const { data, error } = await supabase
      .from('ai_agents')
      .insert({
        ...payload,
        organization_id: req.orgId,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        const agent = await createFallbackAgent(supabase, req.orgId, payload);
        return res
          .status(201)
          .json({ success: true, agent, setup_required: true });
      }
      throw error;
    }
    res.status(201).json({ success: true, agent: hydrateAgent(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/agents/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const payload = normalizeAgentPayload(req.body, true);

    const { data, error } = await supabase
      .from('ai_agents')
      .update(payload)
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        const agent = await updateFallbackAgent(
          supabase,
          req.orgId,
          req.params.id,
          payload
        );
        if (!agent)
          return res.status(404).json({ error: 'Agente nao encontrado' });
        return res.json({ success: true, agent, setup_required: true });
      }
      throw error;
    }
    res.json({ success: true, agent: hydrateAgent(data) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/agents/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('ai_agents')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId);

    if (error) {
      if (isMissingRelationError(error)) {
        await deleteFallbackAgent(supabase, req.orgId, req.params.id);
        return res.json({ success: true, setup_required: true });
      }
      throw error;
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
