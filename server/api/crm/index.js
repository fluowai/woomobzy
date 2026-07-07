import { Router } from 'express';
import { verifyAuth, verifyAdmin } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { matchLeadProperties } from '../../services/leadPropertyMatcher.js';

const router = Router();

const supabase = new Proxy({}, {
  get: (_, prop) => {
    const client = getSupabaseServer();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
const KANBAN_CARD_SELECT = `
  id,
  organization_id,
  name,
  email,
  phone,
  source,
  status,
  classification,
  lead_score,
  ai_next_action,
  next_follow_up_at,
  next_visit_at,
  chat_jid,
  campaign,
  property_id,
  created_at,
  properties(title, price, images),
  lead_tags(tag)
`;

function serializeKanbanLead(row) {
  if (!row) return row;
  const property = row.properties
    ? {
        title: row.properties.title,
        price: row.properties.price,
        thumbnail: Array.isArray(row.properties.images)
          ? row.properties.images[0] || null
          : null,
      }
    : null;

  return {
    ...row,
    properties: property,
  };
}

function normalizePhone(value = '') {
  let digits = String(value).replace(/\D/g, '').replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function phoneSearchTail(value = '') {
  const normalized = normalizePhone(value);
  return normalized.length >= 8 ? normalized.slice(-8) : normalized;
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
  const raw = String(value).trim();
  if (/^([A-Z]\.?\s*){1,4}$/.test(raw) || /^([A-Za-z]\.\s*){1,4}$/.test(raw)) return true;
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

async function findLeadByNormalizedPhone(organizationId, phone) {
  const normalizedPhone = normalizePhone(phone);
  const tail = phoneSearchTail(normalizedPhone);

  if (!tail) return null;

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .ilike('phone', `%${tail}%`)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error) throw error;

  return (data || []).find((lead) => normalizePhone(lead.phone) === normalizedPhone) || null;
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

  const existingLead = await findLeadByNormalizedPhone(organizationId, normalizedPhone);

  const displayName = resolveLeadName(name, existingLead?.name, normalizedPhone);
  if (existingLead) {
    const updates = {
      phone: normalizedPhone,
      chat_jid: chatJid || existingLead.chat_jid,
      last_contacted_at: new Date().toISOString(),
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

async function getAssignableUsers(organizationId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * GET /api/crm/leads
 * Lista leads da organização do usuário logado.
 */
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
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/crm/leads/:id
 * Retorna os dados pesados somente quando o usuario abre o lead.
 */
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

    const lead = await findLeadByNormalizedPhone(req.orgId, phone);

    const tags = lead ? await getLeadTags(req.orgId, lead.id) : [];
    res.json({ success: true, lead, tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/crm/whatsapp/assignees
 * Lista usuarios da organizacao que podem receber atendimento.
 */
router.get('/whatsapp/assignees', verifyAuth, requireTenant, async (req, res) => {
  try {
    const users = await getAssignableUsers(req.orgId);
    res.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Usuario',
        email: user.email || '',
        role: user.role || '',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/crm/whatsapp/contact-profile
 * Atualiza os dados editaveis do lead a partir do painel de conversa.
 */
router.patch('/whatsapp/contact-profile', verifyAuth, requireTenant, async (req, res) => {
  try {
    const lead = await findOrCreateWhatsAppLead({
      organizationId: req.orgId,
      phone: req.body.phone,
      name: req.body.name,
      chatJid: req.body.chat_jid,
      source: req.body.source || 'WhatsApp',
    });

    const updates = {
      last_contacted_at: new Date().toISOString(),
    };
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    if (name && !isPlaceholderLeadName(name)) updates.name = name;
    if (email) updates.email = email;
    if (req.body.chat_jid) updates.chat_jid = req.body.chat_jid;

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', lead.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: data.id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'WhatsApp',
      description: 'Dados do lead atualizados pelo painel de conversa',
      metadata: {
        chat_jid: req.body.chat_jid || data.chat_jid || null,
        fields: Object.keys(updates),
      },
    });

    res.json({ success: true, lead: data, tags: await getLeadTags(req.orgId, data.id) });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
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
 * POST /api/crm/whatsapp/transfer
 * Transfere o atendimento do lead WhatsApp para um usuario da organizacao.
 */
router.post('/whatsapp/transfer', verifyAuth, requireTenant, async (req, res) => {
  try {
    const assigneeId = String(req.body.assigned_to || '').trim();
    if (!assigneeId) return res.status(400).json({ error: 'Informe o responsavel pelo atendimento' });

    const { data: assignee, error: assigneeError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', assigneeId)
      .eq('organization_id', req.orgId)
      .maybeSingle();
    if (assigneeError) throw assigneeError;
    if (!assignee) return res.status(404).json({ error: 'Responsavel nao encontrado nesta organizacao' });

    const lead = await findOrCreateWhatsAppLead({
      organizationId: req.orgId,
      phone: req.body.phone,
      name: req.body.name,
      chatJid: req.body.chat_jid,
      source: req.body.source || 'WhatsApp',
    });

    const { data, error } = await supabase
      .from('leads')
      .update({
        assigned_to: assignee.id,
        status: 'Em Atendimento',
        last_contacted_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .eq('organization_id', req.orgId)
      .select()
      .single();
    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'Transferencia',
      description: `Atendimento transferido para ${assignee.name || assignee.email}`,
      metadata: {
        chat_jid: req.body.chat_jid || lead.chat_jid || null,
        assigned_to: assignee.id,
      },
    });

    res.json({
      success: true,
      lead: data,
      assignee: {
        id: assignee.id,
        name: assignee.name || assignee.email?.split('@')[0] || 'Usuario',
        email: assignee.email || '',
      },
      tags: await getLeadTags(req.orgId, data.id),
    });
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
 * POST /api/crm/whatsapp/task
 * Cria uma tarefa/follow-up real vinculada ao lead do contato WhatsApp.
 */
router.post('/whatsapp/task', verifyAuth, requireTenant, async (req, res) => {
  try {
    const lead = await findOrCreateWhatsAppLead({
      organizationId: req.orgId,
      phone: req.body.phone,
      name: req.body.name,
      chatJid: req.body.chat_jid,
      source: req.body.source || 'WhatsApp',
    });

    const dueAt = req.body.due_at ? new Date(req.body.due_at) : new Date(Date.now() + 24 * 60 * 60 * 1000);
    if (Number.isNaN(dueAt.getTime())) {
      return res.status(400).json({ error: 'Data da tarefa invalida' });
    }

    const title = String(req.body.title || `Retornar contato: ${lead.name || lead.phone}`).trim().slice(0, 180);
    const notes = String(req.body.notes || '').trim() || `Criado a partir da conversa WhatsApp ${req.body.chat_jid || lead.chat_jid || ''}`.trim();

    const { data: task, error } = await supabase
      .from('lead_followups')
      .insert({
        organization_id: req.orgId,
        lead_id: lead.id,
        title,
        notes,
        due_at: dueAt.toISOString(),
        status: 'pending',
        kind: 'task',
        metadata: {
          source: 'whatsapp',
          chat_jid: req.body.chat_jid || lead.chat_jid || null,
        },
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      organization_id: req.orgId,
      created_by: req.user.id,
      type: 'Tarefa',
      description: `Tarefa criada pelo WhatsApp: ${title}`,
      metadata: {
        task_id: task.id,
        chat_jid: req.body.chat_jid || lead.chat_jid || null,
      },
    });

    res.json({ success: true, lead, task, tags: await getLeadTags(req.orgId, lead.id) });
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
    const normalizedPhone = normalizePhone(phone);
    
    if (!name || !phone) {
      return res.status(400).json({ error: 'Nome e telefone são obrigatórios' });
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
