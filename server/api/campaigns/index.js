/**
 * /api/campaigns
 * CRUD de campanhas de disparo WhatsApp
 */
import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

const campaignCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().optional(),
  message_template: z.string().optional(),
  message_variables: z
    .array(z.object({ name: z.string(), source: z.string() }))
    .optional(),
  ai_prompt: z.string().optional(),
  ai_provider: z.enum(['gemini', 'groq', 'openai']).optional(),
  dispatch_mode: z.enum(['sequential', 'round_robin', 'random']).optional(),
  min_delay_seconds: z.number().int().min(30).max(600).optional(),
  max_delay_seconds: z.number().int().min(60).max(1800).optional(),
  daily_limit_per_instance: z.number().int().min(1).max(500).optional(),
  working_hours_start: z.number().int().min(0).max(23).optional(),
  working_hours_end: z.number().int().min(0).max(23).optional(),
  scheduled_at: z.string().optional(),
});

const campaignUpdateSchema = campaignCreateSchema.partial();

// ─── GET /api/campaigns ─── Listar campanhas
router.get('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { status, page = 1, limit = 20 } = req.query;

    let query = supabase
      .from('campaigns')
      .select('*', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const offset = (Number(page) - 1) * Number(limit);
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ campaigns: data || [], total: count || 0 });
  } catch (err) {
    console.error('[Campaigns] Error listing:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/campaigns ─── Criar campanha
router.post('/', verifyAuth, requireTenant, async (req, res) => {
  try {
    const parsed = campaignCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        ...parsed.data,
        organization_id: req.orgId,
        created_by: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[Campaigns] Error creating:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/campaigns/:id ─── Detalhes da campanha
router.get('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ error: 'Campanha não encontrada' });
    }

    // Fetch contacts summary
    const { data: contacts } = await supabase
      .from('campaign_contacts')
      .select('status', { count: 'exact' })
      .eq('campaign_id', campaign.id);

    const contactSummary = { pending: 0, sent: 0, failed: 0, blacklisted: 0 };
    for (const c of contacts || []) {
      if (contactSummary[c.status] !== undefined) contactSummary[c.status]++;
    }

    // Fetch assigned instances
    const { data: instances } = await supabase
      .from('campaign_instances')
      .select('*, whatsapp_instances!inner(id, name, phone, status)')
      .eq('campaign_id', campaign.id);

    // Check if dispatcher is running
    const { isCampaignRunning, getCampaignProgress } =
      await import('../../services/campaign-dispatcher.js');
    const running = isCampaignRunning(campaign.id);
    const progress = getCampaignProgress(campaign.id);

    res.json({
      ...campaign,
      contacts_summary: contactSummary,
      instances: instances || [],
      dispatcher: running
        ? {
            running: true,
            sent: progress?.totalSent || 0,
            failed: progress?.totalFailed || 0,
          }
        : { running: false },
    });
  } catch (err) {
    console.error('[Campaigns] Error fetching:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/campaigns/:id ─── Atualizar campanha
router.put('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const parsed = campaignUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    }

    const supabase = getSupabaseServer();

    // Only allow editing draft/paused campaigns
    const { data: existing } = await supabase
      .from('campaigns')
      .select('status')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (!existing)
      return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!['draft', 'paused'].includes(existing.status)) {
      return res.status(400).json({
        error: 'Só é possível editar campanhas em rascunho ou pausadas',
      });
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Campaigns] Error updating:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/campaigns/:id ─── Deletar campanha
router.delete('/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { isCampaignRunning } =
      await import('../../services/campaign-dispatcher.js');
    if (isCampaignRunning(req.params.id)) {
      return res
        .status(400)
        .json({ error: 'Pare a campanha antes de excluir' });
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    console.error('[Campaigns] Error deleting:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/campaigns/:id/instances ─── Atribuir instância
router.post('/:id/instances', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { instance_id } = req.body;
    if (!instance_id)
      return res.status(400).json({ error: 'instance_id obrigatório' });

    const supabase = getSupabaseServer();

    // Verify instance belongs to org
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('id', instance_id)
      .eq('tenant_id', req.orgId)
      .maybeSingle();

    if (!instance)
      return res.status(404).json({ error: 'Instância não encontrada' });

    const { data, error } = await supabase
      .from('campaign_instances')
      .upsert(
        { campaign_id: req.params.id, instance_id, is_active: true },
        { onConflict: 'campaign_id,instance_id' }
      )
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[Campaigns] Error adding instance:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/campaigns/:id/instances/:instanceId ─── Remover instância
router.delete(
  '/:id/instances/:instanceId',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const supabase = getSupabaseServer();
      const { error } = await supabase
        .from('campaign_instances')
        .delete()
        .eq('campaign_id', req.params.id)
        .eq('instance_id', req.params.instanceId);

      if (error) throw error;
      res.json({ deleted: true });
    } catch (err) {
      console.error('[Campaigns] Error removing instance:', err.message);
      res.status(500).json({ error: err.message });
    }
  }
);

// ─── POST /api/campaigns/:id/dispatch/start ─── Iniciar disparo
router.post(
  '/:id/dispatch/start',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { startDispatch } =
        await import('../../services/campaign-dispatcher.js');
      const result = await startDispatch(req.params.id);
      res.json(result);
    } catch (err) {
      console.error('[Campaigns] Error starting dispatch:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
);

// ─── POST /api/campaigns/:id/dispatch/pause ─── Pausar disparo
router.post(
  '/:id/dispatch/pause',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { pauseDispatch } =
        await import('../../services/campaign-dispatcher.js');
      const result = await pauseDispatch(req.params.id);
      res.json(result);
    } catch (err) {
      console.error('[Campaigns] Error pausing dispatch:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
);

// ─── GET /api/campaigns/:id/dispatch/progress ─── Status do disparo
router.get(
  '/:id/dispatch/progress',
  verifyAuth,
  requireTenant,
  async (req, res) => {
    try {
      const { isCampaignRunning, getCampaignProgress } =
        await import('../../services/campaign-dispatcher.js');
      const running = isCampaignRunning(req.params.id);
      const progress = getCampaignProgress(req.params.id);

      res.json({
        running,
        sent: progress?.totalSent || 0,
        failed: progress?.totalFailed || 0,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

export default router;
