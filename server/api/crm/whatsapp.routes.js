import { Router } from 'express';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import {
  supabase,
  normalizePhone,
  isValidBRPhone,
  findLeadByNormalizedPhone,
  findOrCreateWhatsAppLead,
  isPlaceholderLeadName,
  getLeadTags,
  getAssignableUsers,
} from './helpers.js';

const router = Router();

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

export default router;
