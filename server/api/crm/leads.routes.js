import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { matchLeadProperties } from '../../services/leadPropertyMatcher.js';
import {
  supabase,
  KANBAN_CARD_SELECT,
  serializeKanbanLead,
  normalizePhone,
  isValidBRPhone,
  isPlaceholderLeadName,
  findLeadByNormalizedPhone,
  findOrCreateWhatsAppLead,
  getLeadTags,
} from './helpers.js';

const router = Router();

router.get('/leads', verifyAuth, requireTenant, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);
    const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
    const status = String(req.query.status || '').trim();
    const intent = String(req.query.intent || '').trim();
    const cursorCreatedAt = String(req.query.cursor_created_at || '').trim();
    const cursorId = String(req.query.cursor_id || '').trim();
    const includeCount = req.query.include_count !== 'false';

    let query = supabase
      .from('leads')
      .select(KANBAN_CARD_SELECT, { count: includeCount ? 'exact' : undefined })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false });

    if (status) query = query.eq('status', status);
    if (intent === 'comprador') query = query.eq('classification', 'Comprador Fazenda');
    if (intent === 'vendedor') query = query.eq('classification', 'Vendedor Fazenda');
    if (intent === 'parceria') query = query.eq('classification', 'Corretor/Parceria');

    if (cursorCreatedAt && cursorId) {
      query = query.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
      );
    } else if (page > 1) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit);
    } else {
      query = query.limit(limit + 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const hasMore = (data || []).length > limit;
    const leads = (hasMore ? data.slice(0, limit) : (data || []))
      .map(serializeKanbanLead);
    const lastLead = leads.at(-1);

    res.json({ 
      success: true, 
      leads,
      next_cursor: hasMore && lastLead
        ? { created_at: lastLead.created_at, id: lastLead.id }
        : null,
      pagination: {
        total: includeCount ? (count || 0) : undefined,
        page,
        limit,
        pages: includeCount ? Math.ceil((count || 0) / limit) : undefined,
        has_more: hasMore,
      }
    });
  } catch (err) {
    console.error('[Leads] List error:', err.message);
    res.status(500).json({ error: 'Erro ao listar leads' });
  }
});

router.get('/leads/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const activitiesLimit = Math.min(
      Math.max(Number.parseInt(req.query.activities_limit, 10) || 50, 1),
      100
    );

    const [{ data: lead, error: leadError }, { data: activities, error: activitiesError }] =
      await Promise.all([
        supabase
          .from('leads')
          .select('*, properties(title, price, images), lead_tags(tag)')
          .eq('id', req.params.id)
          .eq('organization_id', req.orgId)
          .single(),
        supabase
          .from('lead_activities')
          .select('id, lead_id, type, description, metadata, created_at, profiles(name)')
          .eq('lead_id', req.params.id)
          .eq('organization_id', req.orgId)
          .order('created_at', { ascending: false })
          .limit(activitiesLimit),
      ]);

    if (leadError || !lead) {
      return res.status(404).json({ error: 'Lead nao encontrado' });
    }
    if (activitiesError) throw activitiesError;

    res.json({ success: true, lead, activities: activities || [] });
  } catch (err) {
    console.error('[Leads] Get error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar lead' });
  }
});

router.post('/leads', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { name, phone, email, property_id, source } = req.body;
    const normalizedPhone = normalizePhone(phone);
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone sao obrigatorios' });
    }

    if (!isValidBRPhone(normalizedPhone)) {
      return res.status(400).json({ error: 'Telefone brasileiro valido e obrigatorio' });
    }

    const existingLead = await findLeadByNormalizedPhone(req.orgId, normalizedPhone);
    let data;
    if (existingLead) {
      const { data: updated, error } = await supabase
        .from('leads')
        .update({
          name: isPlaceholderLeadName(existingLead.name) ? name : existingLead.name,
          phone: normalizedPhone,
          email: email || existingLead.email,
          property_id: property_id || existingLead.property_id,
          source: existingLead.source || source || 'CRM / Manual',
          ad_reference: req.body.ad_reference || existingLead.ad_reference,
          organic_channel: req.body.organic_channel || existingLead.organic_channel,
          campaign: req.body.campaign || existingLead.campaign,
          notes: [existingLead.notes, req.body.notes].filter(Boolean).join('\n\n'),
          budget: req.body.budget || existingLead.budget,
          aptitude_interest: req.body.aptitude_interest || existingLead.aptitude_interest,
          last_contacted_at: new Date().toISOString(),
        })
        .eq('id', existingLead.id)
        .eq('organization_id', req.orgId)
        .select()
        .single();
      if (error) throw error;
      data = updated;
    } else {
      const { data: inserted, error } = await supabase
        .from('leads')
        .insert({
          organization_id: req.orgId,
          name,
          phone: normalizedPhone,
          email,
          property_id,
          source: source || 'CRM / Manual',
          ad_reference: req.body.ad_reference,
          organic_channel: req.body.organic_channel,
          campaign: req.body.campaign,
          notes: req.body.notes,
          budget: req.body.budget,
          aptitude_interest: req.body.aptitude_interest,
          status: 'Novo'
        })
        .select()
        .single();

      if (error) throw error;
      data = inserted;
    }

    const forcedProfile = ['urbano', 'rural'].includes(req.body.match_profile)
      ? req.body.match_profile
      : null;

    const matchedLead = await matchLeadProperties({
      supabase,
      lead: data,
      organizationId: req.orgId,
      createdBy: req.user.id,
      profileOverride: forcedProfile,
    });

    res.status(existingLead ? 200 : 201).json({ success: true, lead: matchedLead });
  } catch (err) {
    console.error('[Leads] Create/match error:', err.message);
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

router.patch('/leads/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.id;
    delete updates.organization_id;
    delete updates.created_at;

    const { data: lead, error: findError } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (findError || lead.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const shouldRematch = [
      'notes',
      'budget',
      'aptitude_interest',
      'preferences',
      'source',
      'ad_reference',
      'campaign',
    ].some((field) => Object.prototype.hasOwnProperty.call(updates, field));

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'Sistema',
      description: 'Dados do lead atualizados'
    });

    const matchedLead = shouldRematch
      ? await matchLeadProperties({
          supabase,
          lead: data,
          organizationId: req.orgId,
          createdBy: req.user.id,
        })
      : data;

    res.json({ success: true, lead: matchedLead });
  } catch (err) {
    console.error('[Leads] Update error:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar lead' });
  }
});

router.post('/leads/:id/match-properties', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .eq('organization_id', req.orgId)
      .single();

    if (error || !lead) {
      return res.status(404).json({ error: 'Lead nao encontrado' });
    }

    const forcedProfile = ['urbano', 'rural'].includes(req.body.match_profile)
      ? req.body.match_profile
      : null;

    const matchedLead = await matchLeadProperties({
      supabase,
      lead,
      organizationId: req.orgId,
      createdBy: req.user.id,
      profileOverride: forcedProfile,
    });

    res.json({ success: true, lead: matchedLead });
  } catch (err) {
    console.error('[Leads] Match properties error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar propriedades' });
  }
});

router.patch('/leads/:id/status', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const { data: lead, error: findError } = await supabase
      .from('leads')
      .select('organization_id, status')
      .eq('id', id)
      .single();

    if (findError || lead.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'Status',
      description: `Status alterado de ${lead.status} para ${status}`
    });

    res.json({ success: true, lead: data });
  } catch (err) {
    console.error('[Leads] Status update error:', err.message);
    res.status(500).json({ error: 'Erro ao alterar status' });
  }
});

router.get('/leads/:id/activities', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 100);

    const { data, error } = await supabase
      .from('lead_activities')
      .select('*, profiles(name)')
      .eq('lead_id', id)
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ success: true, activities: data });
  } catch (err) {
    console.error('[Leads] Activities error:', err.message);
    res.status(500).json({ error: 'Erro ao buscar atividades' });
  }
});

router.post('/leads/:id/activities', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, metadata } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: 'Tipo e descricao sao obrigatorios' });
    }

    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: id,
        organization_id: req.orgId,
        created_by: req.user.id,
        type,
        description,
        metadata: metadata || {}
      })
      .select()
      .single();

    if (error) throw error;

    const normalizedType = String(type)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    const isContactActivity = ['chamada', 'ligacao', 'whatsapp', 'email', 'visita'].includes(normalizedType);
    let updatedLead = null;

    if (isContactActivity) {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', id)
        .eq('organization_id', req.orgId)
        .select()
        .single();

      if (leadError) throw leadError;
      updatedLead = leadData;
    }

    res.status(201).json({ success: true, activity: data, lead: updatedLead });
  } catch (err) {
    console.error('[Leads] Create activity error:', err.message);
    res.status(500).json({ error: 'Erro ao registrar atividade' });
  }
});

router.delete('/leads/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: lead, error: findError } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (findError || lead.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Lead excluido com sucesso' });
  } catch (err) {
    console.error('[Leads] Delete error:', err.message);
    res.status(500).json({ error: 'Erro ao excluir lead' });
  }
});

router.post('/leads/bulk-delete', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs invalida' });
    }

    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ success: true, message: `${ids.length} leads excluidos com sucesso` });
  } catch (err) {
    console.error('[Leads] Bulk delete error:', err.message);
    res.status(500).json({ error: 'Erro ao excluir leads em massa' });
  }
});

export default router;
