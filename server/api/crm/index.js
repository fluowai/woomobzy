import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { matchLeadProperties } from '../../services/leadPropertyMatcher.js';

const router = Router();

const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function isValidBRPhone(value = '') {
  const phone = normalizePhone(value);
  return phone.startsWith('55') && (phone.length === 12 || phone.length === 13);
}

function isGroupChatJid(value = '') {
  return String(value).includes('@g.us');
}

function isPlaceholderLeadName(value = '') {
  const clean = String(value).trim().toLowerCase();
  if (!clean || clean === '~' || clean === 'me' || clean === 'contato sem telefone') return true;
  return /^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''));
}

function resolveLeadName(...values) {
  let phoneFallback = '';
  for (const value of values) {
    const clean = String(value || '').trim();
    if (/^\+?\d{8,15}$/.test(clean.replace(/\s/g, ''))) phoneFallback = clean;
    if (!clean || isPlaceholderLeadName(clean)) continue;
    return clean;
  }
  return phoneFallback || 'Lead WhatsApp';
}

async function findOrCreateWhatsAppLead({ organizationId, phone, name, chatJid, source = 'WhatsApp' }) {
  const normalizedPhone = normalizePhone(phone);
  if (isGroupChatJid(chatJid)) {
    const error = new Error('Conversas de grupo nao criam lead no Kanban');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidBRPhone(normalizedPhone)) {
    const error = new Error('Telefone individual do WhatsApp e obrigatorio');
    error.statusCode = 400;
    throw error;
  }

  const { data: existingLead, error: findError } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('phone', normalizedPhone)
    .maybeSingle();

  if (findError) throw findError;

  const displayName = resolveLeadName(name, existingLead?.name, normalizedPhone);
  if (existingLead) {
    const updates = {
      chat_jid: chatJid || existingLead.chat_jid,
    };

    if (isPlaceholderLeadName(existingLead.name)) updates.name = displayName;
    if (!existingLead.source) updates.source = source;

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', existingLead.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      organization_id: organizationId,
      name: displayName,
      phone: normalizedPhone,
      source,
      status: 'Novo',
      classification: 'Interessado',
      chat_jid: chatJid || null,
      last_contacted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getLeadTags(organizationId, leadId) {
  const { data, error } = await supabase
    .from('lead_tags')
    .select('tag')
    .eq('organization_id', organizationId)
    .eq('lead_id', leadId)
    .order('tag', { ascending: true });
  if (error) throw error;
  return (data || []).map((item) => item.tag);
}

/**
 * GET /api/crm/leads
 * Lista leads da organização do usuário logado.
 */
router.get('/leads', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('leads')
      .select('*, properties(title, price, images), lead_tags(tag)', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.json({ 
      success: true, 
      leads: data,
      pagination: {
        total: count,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/crm/whatsapp/contact
 * Retorna o lead e tags vinculados a um contato do WhatsApp.
 */
router.get('/whatsapp/contact', verifyAuth, requireTenant, async (req, res) => {
  try {
    const phone = normalizePhone(req.query.phone);
    if (!isValidBRPhone(phone)) return res.status(400).json({ error: 'Telefone individual e obrigatorio' });

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', req.orgId)
      .eq('phone', phone)
      .maybeSingle();

    if (error) throw error;

    const tags = lead ? await getLeadTags(req.orgId, lead.id) : [];
    res.json({ success: true, lead, tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/whatsapp/link-contact
 * Vincula uma conversa individual do WhatsApp ao CRM, criando o lead se preciso.
 */
router.post('/whatsapp/link-contact', verifyAuth, requireTenant, async (req, res) => {
  try {
    const lead = await findOrCreateWhatsAppLead({
      organizationId: req.orgId,
      phone: req.body.phone,
      name: req.body.name,
      chatJid: req.body.chat_jid,
      source: req.body.source || 'WhatsApp',
    });

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'WhatsApp',
      description: 'Contato do WhatsApp vinculado ao CRM',
      metadata: { chat_jid: req.body.chat_jid || lead.chat_jid || null },
    });

    res.json({ success: true, lead, tags: await getLeadTags(req.orgId, lead.id) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/whatsapp/contact-tags
 * Adiciona tags ao lead vinculado ao contato do WhatsApp.
 */
router.post('/whatsapp/contact-tags', verifyAuth, requireTenant, async (req, res) => {
  try {
    const rawTags = Array.isArray(req.body.tags) ? req.body.tags : [req.body.tag];
    const tags = [...new Set(rawTags.map((tag) => String(tag || '').trim().toLowerCase()).filter(Boolean))].slice(0, 8);
    if (!tags.length) return res.status(400).json({ error: 'Informe ao menos uma tag' });

    const lead = await findOrCreateWhatsAppLead({
      organizationId: req.orgId,
      phone: req.body.phone,
      name: req.body.name,
      chatJid: req.body.chat_jid,
      source: req.body.source || 'WhatsApp',
    });

    const rows = tags.map((tag) => ({ lead_id: lead.id, organization_id: req.orgId, tag }));
    const { error } = await supabase.from('lead_tags').upsert(rows, { onConflict: 'lead_id,tag' });
    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'Tag',
      description: `Tags adicionadas pelo WhatsApp: ${tags.join(', ')}`,
    });

    res.json({ success: true, lead, tags: await getLeadTags(req.orgId, lead.id) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/whatsapp/priority
 * Marca o contato do WhatsApp como alta prioridade no CRM.
 */
router.post('/whatsapp/priority', verifyAuth, requireTenant, async (req, res) => {
  try {
    const lead = await findOrCreateWhatsAppLead({
      organizationId: req.orgId,
      phone: req.body.phone,
      name: req.body.name,
      chatJid: req.body.chat_jid,
      source: req.body.source || 'WhatsApp',
    });

    const { data, error } = await supabase
      .from('leads')
      .update({ classification: 'Alta Prioridade', last_contacted_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'Prioridade',
      description: 'Contato marcado como alta prioridade pelo WhatsApp',
    });

    res.json({ success: true, lead: data, tags: await getLeadTags(req.orgId, data.id) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/leads
 * Cria um lead garantindo que pertença ao tenant correto.
 */
router.post('/leads', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { name, phone, email, property_id, source } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('leads')
      .insert({
        organization_id: req.orgId, 
        name,
        phone,
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

    res.status(201).json({ success: true, lead: matchedLead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/crm/leads/:id
 * Atualiza detalhes do lead.
 */
router.patch('/leads/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remover campos que não devem ser editados diretamente
    delete updates.id;
    delete updates.organization_id;
    delete updates.created_at;

    // Verificar ownership
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

    // Registrar atividade de atualização
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
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/leads/:id/match-properties
 * Recalcula as sugestÃµes de imÃ³veis para o lead.
 */
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
      return res.status(404).json({ error: 'Lead nÃ£o encontrado' });
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
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/crm/leads/:id/status
 */
router.patch('/leads/:id/status', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    // Verificar ownership
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

    // Registrar mudança de status na timeline
    await supabase.from('lead_activities').insert({
      lead_id: id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'Status',
      description: `Status alterado de ${lead.status} para ${status}`
    });

    res.json({ success: true, lead: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/crm/leads/:id/activities
 * Lista histórico de atividades do lead.
 */
router.get('/leads/:id/activities', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('lead_activities')
      .select('*, profiles(name)')
      .eq('lead_id', id)
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, activities: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/leads/:id/activities
 * Adiciona uma nova atividade/interação.
 */
router.post('/leads/:id/activities', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;
    const { type, description, metadata } = req.body;

    if (!type || !description) {
      return res.status(400).json({ error: 'Tipo e descrição são obrigatórios' });
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

    // Se for uma interação de contato, atualizar o last_contacted_at do lead
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
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/crm/leads/:id
 */
router.delete('/leads/:id', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar ownership
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
    res.json({ success: true, message: 'Lead excluído com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/crm/leads/bulk-delete
 * Exclui múltiplos leads da organização.
 */
router.post('/leads/bulk-delete', verifyAuth, requireTenant, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Lista de IDs inválida' });
    }

    // Excluir apenas os que pertencem à organização (filtro automático via eq)
    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', ids)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ success: true, message: `${ids.length} leads excluídos com sucesso` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
