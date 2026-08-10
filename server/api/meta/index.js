/**
 * Admin API for Meta Lead Ads configuration.
 *
 * Endpoints:
 *  GET /api/meta/lead-ads/config
 *  POST /api/meta/lead-ads/config
 *  PATCH /api/meta/lead-ads/config/:id
 *  DELETE /api/meta/lead-ads/config/:id
 *  GET /api/meta/lead-ads/webhooks/events
 */

import { Router } from 'express';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';

const router = Router();

function toUuid(value) {
  if (!value || value === 'null' || value === 'undefined') return null;
  return value;
}

router.get('/lead-ads/agents', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('organization_id', req.orgId)
      .in('role', ['BROKER', 'ADMIN'])
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({ success: true, agents: data || [] });
  } catch (error) {
    console.error('[Meta] List agents error:', error.message);
    res.status(500).json({ error: 'Erro ao carregar agentes' });
  }
});

router.get('/lead-ads/config', verifyAuth, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('meta_lead_ads_config')
      .select('id, meta_form_id, meta_campaign_id, meta_ad_id, assigned_agent_id, priority, active, created_at, updated_at')
      .eq('organization_id', req.orgId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: agents } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('organization_id', req.orgId)
      .in('role', ['BROKER', 'ADMIN'])
      .order('name', { ascending: true });

    res.json({
      success: true,
      config: data || [],
      agents: agents || [],
    });
  } catch (error) {
    console.error('[Meta] List config error:', error.message);
    res.status(500).json({ error: 'Erro ao carregar configuração Meta' });
  }
});

router.post('/lead-ads/config', verifyAuth, verifyAdmin, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const {
      meta_form_id,
      meta_campaign_id,
      meta_ad_id,
      assigned_agent_id,
      priority,
      active,
    } = req.body;

    const formId = String(meta_form_id || '').trim();
    const campaignId = String(meta_campaign_id || '').trim();
    const adId = String(meta_ad_id || '').trim();

    if (!formId && !campaignId && !adId) {
      return res.status(400).json({ error: 'Informe ao menos um identificador: form_id, campaign_id ou ad_id' });
    }

    const targetCount = [formId, campaignId, adId].filter(Boolean).length;
    if (targetCount > 1) {
      return res.status(400).json({ error: 'Informe apenas um identificador por vez: form_id, campaign_id ou ad_id' });
    }

    const metaFormId = formId || null;
    const metaCampaignId = campaignId || null;
    const metaAdId = adId || null;

    const { data: existing } = await supabase
      .from('meta_lead_ads_config')
      .select('id')
      .eq('organization_id', req.orgId)
      .or(`meta_form_id.${metaFormId || 'null'},meta_campaign_id.${metaCampaignId || 'null'},meta_ad_id.${metaAdId || 'null'}`)
      .maybeSingle();

    if (existing?.id) {
      return res.status(409).json({ error: 'Já existe uma regra para este identificador Meta', existing_id: existing.id });
    }

    const { data, error } = await supabase
      .from('meta_lead_ads_config')
      .insert({
        organization_id: req.orgId,
        meta_form_id: metaFormId,
        meta_campaign_id: metaCampaignId,
        meta_ad_id: metaAdId,
        assigned_agent_id: toUuid(assigned_agent_id),
        priority: Number.isFinite(priority) ? priority : 0,
        active: active !== false,
      })
      .select('id, meta_form_id, meta_campaign_id, meta_ad_id, assigned_agent_id, priority, active, created_at, updated_at')
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, config: data });
  } catch (error) {
    console.error('[Meta] Create config error:', error.message);
    res.status(500).json({ error: 'Erro ao salvar configuração Meta' });
  }
});

router.patch('/lead-ads/config/:id', verifyAuth, verifyAdmin, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;

    const allowedFields = ['meta_form_id', 'meta_campaign_id', 'meta_ad_id', 'assigned_agent_id', 'priority', 'active'];
    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'meta_form_id' || field === 'meta_campaign_id' || field === 'meta_ad_id') {
          updates[field] = String(req.body[field] || '').trim() || null;
        } else if (field === 'assigned_agent_id') {
          updates[field] = toUuid(req.body[field]);
        } else if (field === 'active') {
          updates[field] = Boolean(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('meta_lead_ads_config')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .select('id, meta_form_id, meta_campaign_id, meta_ad_id, assigned_agent_id, priority, active, created_at, updated_at')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Configuração não encontrada' });

    res.json({ success: true, config: data });
  } catch (error) {
    console.error('[Meta] Update config error:', error.message);
    res.status(500).json({ error: 'Erro ao atualizar configuração Meta' });
  }
});

router.delete('/lead-ads/config/:id', verifyAuth, verifyAdmin, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { id } = req.params;

    const { error } = await supabase
      .from('meta_lead_ads_config')
      .delete()
      .eq('id', id)
      .eq('organization_id', req.orgId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('[Meta] Delete config error:', error.message);
    res.status(500).json({ error: 'Erro ao remover configuração Meta' });
  }
});

router.get('/lead-ads/webhooks/events', verifyAuth, verifyAdmin, requireTenant, async (req, res) => {
  try {
    const supabase = getSupabaseServer();
    const { status, meta_lead_id } = req.query;

    let query = supabase
      .from('meta_webhook_events')
      .select('id, meta_lead_id, event_type, status, error_message, processed_at, payload')
      .eq('organization_id', req.orgId)
      .order('processed_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') {
      query = query.eq('status', String(status));
    }

    if (meta_lead_id) {
      query = query.eq('meta_lead_id', String(meta_lead_id));
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, events: data || [] });
  } catch (error) {
    console.error('[Meta] List webhook events error:', error.message);
    res.status(500).json({ error: 'Erro ao carregar eventos do webhook' });
  }
});

export default router;
