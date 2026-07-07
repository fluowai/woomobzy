import { Router } from 'express';
import { z } from 'zod';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { verifyAuth } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { encryptEmailSecret, maskEmailSecret } from '../../services/email/crypto.js';
import {
  normalizeEmailAddress,
  normalizeEmailConnectionConfig,
  sanitizeEmailHtml,
  sendEmail,
  syncEmailAccount,
  testEmailConnection,
} from '../../services/email/emailService.js';

const router = Router();
const supabase = new Proxy({}, {
  get: (_, prop) => {
    const client = getSupabaseServer();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

const accountSchema = z.object({
  email: z.string().email().transform(normalizeEmailAddress),
  password: z.string().min(1).max(500),
  imap_host: z.string().trim().min(2).max(255),
  imap_port: z.coerce.number().int().min(1).max(65535).default(993),
  imap_secure: z.boolean().default(true),
  smtp_host: z.string().trim().min(2).max(255),
  smtp_port: z.coerce.number().int().min(1).max(65535).default(465),
  smtp_secure: z.boolean().default(true),
});

const sendSchema = z.object({
  account_id: z.string().uuid().optional(),
  to: z.union([z.string(), z.array(z.string().email())]),
  subject: z.string().trim().min(1).max(500),
  body_html: z.string().min(1).max(200000),
  lead_id: z.string().uuid().nullable().optional(),
});

router.use(verifyAuth, requireTenant);

router.get('/accounts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('email_accounts')
      .select('id, email, imap_host, imap_port, imap_secure, smtp_host, smtp_port, smtp_secure, auth_method, oauth_provider, last_inbox_uid, last_synced_at, sync_status, sync_error, is_active, created_at')
      .eq('organization_id', req.orgId)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ success: true, accounts: data || [], password: maskEmailSecret() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/accounts/test', async (req, res) => {
  try {
    const account = normalizeEmailConnectionConfig(accountSchema.parse(req.body));
    await testEmailConnection(account);
    res.json({ success: true, message: 'Conexao IMAP/SMTP validada com sucesso.' });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const account = normalizeEmailConnectionConfig(accountSchema.parse(req.body));
    await testEmailConnection(account);

    const accountPayload = {
      organization_id: req.orgId,
      user_id: req.user.id,
      email: account.email,
      encrypted_password: encryptEmailSecret(account.password),
      imap_host: account.imap_host,
      imap_port: account.imap_port,
      imap_secure: account.imap_secure,
      smtp_host: account.smtp_host,
      smtp_port: account.smtp_port,
      smtp_secure: account.smtp_secure,
      auth_method: 'password',
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: findError } = await supabase
      .from('email_accounts')
      .select('id')
      .eq('organization_id', req.orgId)
      .eq('user_id', req.user.id)
      .eq('email', account.email)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    const query = existing
      ? supabase
          .from('email_accounts')
          .update(accountPayload)
          .eq('id', existing.id)
          .eq('organization_id', req.orgId)
          .eq('user_id', req.user.id)
      : supabase.from('email_accounts').insert(accountPayload);

    const { data, error } = await query
      .select('id, email, imap_host, imap_port, smtp_host, smtp_port, last_synced_at, sync_status, created_at')
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, account: data });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('email_accounts')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sync', async (req, res) => {
  try {
    const accountId = z.string().uuid().parse(req.body.account_id);
    const limit = z.coerce.number().int().min(1).max(200).default(50).parse(req.body.limit ?? 50);
    const result = await syncEmailAccount({
      accountId,
      organizationId: req.orgId,
      userId: req.user.id,
      limit,
    });
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.get('/agenda', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lead_activities')
      .select('id, type, description, metadata, created_at, leads(id, name, email, phone, status)')
      .eq('organization_id', req.orgId)
      .contains('metadata', { source: 'email_agent' })
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const activities = (data || []).map((activity) => ({
      ...activity,
      priority: activity.metadata?.priority || 'medium',
      title: activity.metadata?.title || activity.type || 'Atividade de email',
      email_id: activity.metadata?.email_id || null,
      subject: activity.metadata?.subject || '',
      from_email: activity.metadata?.from_email || '',
      status: activity.metadata?.status || 'pending',
    }));

    res.json({ success: true, activities });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/emails', async (req, res) => {
  try {
    const folder = String(req.query.folder || 'inbox').toLowerCase();
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 25), 1), 100);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();

    let query = supabase
      .from('emails')
      .select('id, account_id, folder, direction, subject, from_name, from_email, to_email, preview, date, is_read, is_archived, message_id, in_reply_to, thread_id, lead_id, leads(id, name, email)', { count: 'exact' })
      .eq('organization_id', req.orgId)
      .order('date', { ascending: false, nullsFirst: false })
      .range(offset, offset + limit - 1);

    if (folder === 'archived') {
      query = query.eq('is_archived', true);
    } else {
      query = query.eq('folder', folder).eq('is_archived', false);
    }

    if (search) {
      const clean = search.replace(/[,%_().]/g, ' ').replace(/\s+/g, ' ').trim();
      query = query.or(`subject.ilike.%${clean}%,from_email.ilike.%${clean}%,body_text.ilike.%${clean}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      emails: data || [],
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/emails/:id/thread', async (req, res) => {
  try {
    const { data: email, error: findError } = await supabase
      .from('emails')
      .select('thread_id')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (findError || !email) return res.status(404).json({ error: 'Email nao encontrado.' });

    const { data, error } = await supabase
      .from('emails')
      .select('*, leads(id, name, email)')
      .eq('organization_id', req.orgId)
      .eq('thread_id', email.thread_id)
      .order('date', { ascending: true });

    if (error) throw error;
    res.json({ success: true, thread: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-email', async (req, res) => {
  try {
    const body = sendSchema.parse(req.body);
    const saved = await sendEmail({
      organizationId: req.orgId,
      userId: req.user.id,
      accountId: body.account_id,
      to: body.to,
      subject: body.subject,
      html: sanitizeEmailHtml(body.body_html),
      leadId: body.lead_id || null,
    });

    res.status(201).json({ success: true, email: saved });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.post('/emails/:id/reply', async (req, res) => {
  try {
    const html = z.string().min(1).max(200000).parse(req.body.body_html);
    const { data: original, error: findError } = await supabase
      .from('emails')
      .select('account_id, subject, from_email, message_id, references_ids, thread_id, lead_id')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (findError || !original) return res.status(404).json({ error: 'Email original nao encontrado.' });

    const subject = String(original.subject || '').toLowerCase().startsWith('re:')
      ? original.subject
      : `Re: ${original.subject || '(sem assunto)'}`;

    const saved = await sendEmail({
      organizationId: req.orgId,
      userId: req.user.id,
      accountId: original.account_id,
      to: original.from_email,
      subject,
      html,
      inReplyTo: original.message_id,
      references: [...(original.references_ids || []), original.message_id].filter(Boolean),
      leadId: original.lead_id || null,
    });

    await supabase.from('emails').update({ thread_id: original.thread_id }).eq('id', saved.id);
    res.status(201).json({ success: true, email: { ...saved, thread_id: original.thread_id } });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

router.patch('/emails/:id', async (req, res) => {
  try {
    const patchSchema = z.object({
      is_read: z.boolean().optional(),
      is_archived: z.boolean().optional(),
      lead_id: z.string().uuid().nullable().optional(),
    });
    const updates = patchSchema.parse(req.body);

    if (updates.lead_id) {
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('id')
        .eq('id', updates.lead_id)
        .eq('organization_id', req.orgId)
        .maybeSingle();
      if (leadError || !lead) return res.status(404).json({ error: 'Lead nao encontrado.' });
    }

    const { data, error } = await supabase
      .from('emails')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .select('*')
      .single();

    if (error) throw error;
    res.json({ success: true, email: data });
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

export default router;
