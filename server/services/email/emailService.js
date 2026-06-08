import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sanitizeHtml from 'sanitize-html';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { decryptEmailSecret } from './crypto.js';
import { emitEmailEvent } from './events.js';

const activeSyncs = new Set();

const allowedHtmlTags = sanitizeHtml.defaults.allowedTags.concat([
  'img',
  'span',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'br',
]);

const allowedHtmlAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  a: ['href', 'name', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height'],
  '*': ['style'],
};

export function sanitizeEmailHtml(html = '') {
  return sanitizeHtml(String(html || ''), {
    allowedTags: allowedHtmlTags,
    allowedAttributes: allowedHtmlAttributes,
    allowedSchemes: ['http', 'https', 'mailto', 'cid', 'data'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
    },
  });
}

export function normalizeEmailAddress(value = '') {
  return String(value || '').trim().toLowerCase();
}

function isImplicitTlsPort(port, implicitTlsPort) {
  return Number(port) === implicitTlsPort;
}

export function normalizeEmailConnectionConfig(account = {}) {
  const imapPort = Number(account.imap_port || 993);
  const smtpPort = Number(account.smtp_port || 465);

  return {
    ...account,
    imap_port: imapPort,
    smtp_port: smtpPort,
    imap_secure: isImplicitTlsPort(imapPort, 993),
    smtp_secure: isImplicitTlsPort(smtpPort, 465),
  };
}

function textPreview(html = '', text = '') {
  const source = text || String(html || '').replace(/<[^>]+>/g, ' ');
  return source.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function addressesToArray(addresses) {
  if (!addresses) return [];
  const list = Array.isArray(addresses) ? addresses : addresses.value || [];
  return list
    .map((item) => normalizeEmailAddress(item.address || item.email || item))
    .filter(Boolean);
}

function firstAddress(addresses) {
  const list = Array.isArray(addresses) ? addresses : addresses?.value || [];
  const item = list[0] || {};
  return {
    name: item.name || '',
    email: normalizeEmailAddress(item.address || item.email || item),
  };
}

function createThreadId({ messageId, inReplyTo, references = [], subject = '', fromEmail = '' }) {
  const root = references?.[0] || inReplyTo || messageId || `${subject}:${fromEmail}`;
  return crypto.createHash('sha256').update(String(root || crypto.randomUUID())).digest('hex');
}

function headersToJson(headers) {
  const result = {};
  for (const [key, value] of headers || []) {
    if (value == null) {
      result[key] = null;
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (value instanceof Date) {
      result[key] = value.toISOString();
    } else {
      result[key] = JSON.stringify(value);
    }
  }
  return result;
}

async function findLeadByEmail(supabase, organizationId, email) {
  const clean = normalizeEmailAddress(email);
  if (!clean) return null;

  const { data, error } = await supabase
    .from('leads')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .ilike('email', clean)
    .maybeSingle();

  if (error) {
    console.warn('[Email] Falha ao buscar lead por email:', error.message);
    return null;
  }

  return data;
}

export function createImapClient(account, password) {
  const config = normalizeEmailConnectionConfig(account);
  return new ImapFlow({
    host: config.imap_host,
    port: config.imap_port,
    secure: config.imap_secure,
    auth: {
      user: config.email,
      pass: password,
    },
    logger: false,
  });
}

function createSmtpTransport(account, password) {
  const config = normalizeEmailConnectionConfig(account);
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_secure,
    requireTLS: !config.smtp_secure,
    auth: {
      user: config.email,
      pass: password,
    },
  });
}

export async function testEmailConnection(accountConfig) {
  const config = normalizeEmailConnectionConfig(accountConfig);

  try {
    const imapClient = createImapClient(config, config.password);
    await imapClient.connect();
    await imapClient.logout();

    const smtpTransport = createSmtpTransport(config, config.password);
    await smtpTransport.verify();
  } catch (error) {
    if (String(error?.message || '').includes('wrong version number')) {
      const friendly = new Error('Falha SSL/TLS: use porta 465 para SMTP SSL direto ou porta 587 com STARTTLS. Para IMAP, use 993 com SSL direto ou 143 sem SSL direto.');
      friendly.statusCode = 400;
      throw friendly;
    }
    throw error;
  }
}

export async function syncEmailAccount({ accountId, organizationId, userId, limit = 50 }) {
  const syncKey = `${organizationId}:${accountId}`;
  if (activeSyncs.has(syncKey)) {
    const error = new Error('Sincronizacao ja em andamento para esta conta.');
    error.statusCode = 409;
    throw error;
  }

  activeSyncs.add(syncKey);
  const supabase = getSupabaseServer();

  try {
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (accountError || !account) {
      const error = new Error('Conta de email nao encontrada.');
      error.statusCode = 404;
      throw error;
    }

    await supabase.from('email_accounts').update({ sync_status: 'syncing', sync_error: null }).eq('id', accountId);

    const client = createImapClient(account, decryptEmailSecret(account.encrypted_password));
    await client.connect();

    let maxUid = Number(account.last_inbox_uid || 0);
    let synced = 0;
    const range = maxUid > 0 ? `${maxUid + 1}:*` : '1:*';

    const lock = await client.getMailboxLock('INBOX');
    try {
      for await (const message of client.fetch(range, {
        uid: true,
        flags: true,
        source: true,
        envelope: true,
        internalDate: true,
      }, { uid: true })) {
        if (synced >= Number(limit)) break;

        const parsed = await simpleParser(message.source);
        const parsedHtml = typeof parsed.html === 'string' ? parsed.html : '';
        const from = firstAddress(parsed.from);
        const to = addressesToArray(parsed.to);
        const cc = addressesToArray(parsed.cc);
        const references = Array.isArray(parsed.references)
          ? parsed.references
          : String(parsed.references || '').split(/\s+/).filter(Boolean);
        const messageId = parsed.messageId || message.envelope?.messageId || null;
        const inReplyTo = parsed.inReplyTo || message.envelope?.inReplyTo || null;
        const threadId = createThreadId({
          messageId,
          inReplyTo,
          references,
          subject: parsed.subject,
          fromEmail: from.email,
        });
        const lead = await findLeadByEmail(supabase, organizationId, from.email);

        const row = {
          organization_id: organizationId,
          account_id: account.id,
          folder: 'inbox',
          direction: 'incoming',
          subject: parsed.subject || '(sem assunto)',
          from_name: from.name || null,
          from_email: from.email,
          to_email: to,
          cc_email: cc,
          body_html: sanitizeEmailHtml(parsedHtml),
          body_text: parsed.text || '',
          preview: textPreview(parsedHtml, parsed.text),
          date: (parsed.date || message.internalDate || new Date()).toISOString(),
          is_read: Boolean(message.flags?.has('\\Seen')),
          is_archived: false,
          message_id: messageId,
          in_reply_to: inReplyTo,
          references_ids: references,
          thread_id: threadId,
          imap_uid: message.uid,
          lead_id: lead?.id || null,
          raw_headers: headersToJson(parsed.headers),
        };

        const { data: saved, error: saveError } = await supabase
          .from('emails')
          .upsert(row, { onConflict: 'account_id,folder,imap_uid' })
          .select('id, subject, from_email, lead_id')
          .single();

        if (saveError) throw saveError;

        await emitEmailEvent({
          organizationId,
          userId,
          accountId: account.id,
          emailId: saved.id,
          eventType: 'email_received',
          payload: { from_email: saved.from_email, subject: saved.subject, lead_id: saved.lead_id },
        });

        maxUid = Math.max(maxUid, Number(message.uid || 0));
        synced += 1;
      }
    } finally {
      lock.release();
      await client.logout().catch(() => {});
    }

    await supabase
      .from('email_accounts')
      .update({
        last_inbox_uid: maxUid,
        last_synced_at: new Date().toISOString(),
        sync_status: 'idle',
        sync_error: null,
      })
      .eq('id', account.id);

    return { synced, last_uid: maxUid };
  } catch (error) {
    await supabase
      .from('email_accounts')
      .update({ sync_status: 'error', sync_error: error.message })
      .eq('id', accountId)
      .eq('organization_id', organizationId);
    throw error;
  } finally {
    activeSyncs.delete(syncKey);
  }
}

export async function sendEmail({ organizationId, userId, accountId, to, subject, html, inReplyTo = null, references = [], leadId = null }) {
  const supabase = getSupabaseServer();
  const query = supabase
    .from('email_accounts')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  const { data: account, error: accountError } = accountId
    ? await query.eq('id', accountId).single()
    : await query.eq('user_id', userId).order('created_at', { ascending: true }).limit(1).single();

  if (accountError || !account) {
    const error = new Error('Conta de email nao encontrada para envio.');
    error.statusCode = 404;
    throw error;
  }

  const cleanTo = Array.isArray(to)
    ? to.map(normalizeEmailAddress).filter(Boolean)
    : String(to || '').split(',').map(normalizeEmailAddress).filter(Boolean);
  if (!cleanTo.length) {
    const error = new Error('Informe ao menos um destinatario.');
    error.statusCode = 400;
    throw error;
  }

  const cleanHtml = sanitizeEmailHtml(html);
  const transport = createSmtpTransport(account, decryptEmailSecret(account.encrypted_password));
  const info = await transport.sendMail({
    from: account.email,
    to: cleanTo,
    subject: String(subject || '(sem assunto)').trim(),
    html: cleanHtml,
    inReplyTo: inReplyTo || undefined,
    references: references?.length ? references : undefined,
  });

  const messageId = info.messageId || `<${crypto.randomUUID()}@imobfluow.local>`;
  const threadId = createThreadId({
    messageId,
    inReplyTo,
    references,
    subject,
    fromEmail: account.email,
  });

  const { data: saved, error: saveError } = await supabase
    .from('emails')
    .insert({
      organization_id: organizationId,
      account_id: account.id,
      folder: 'sent',
      direction: 'outgoing',
      subject: String(subject || '(sem assunto)').trim(),
      from_name: null,
      from_email: normalizeEmailAddress(account.email),
      to_email: cleanTo,
      body_html: cleanHtml,
      body_text: cleanHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      preview: textPreview(cleanHtml),
      date: new Date().toISOString(),
      is_read: true,
      message_id: messageId,
      in_reply_to: inReplyTo,
      references_ids: references || [],
      thread_id: threadId,
      lead_id: leadId,
      raw_headers: { smtp_response: info.response || null },
    })
    .select('*')
    .single();

  if (saveError) throw saveError;

  await emitEmailEvent({
    organizationId,
    userId,
    accountId: account.id,
    emailId: saved.id,
    eventType: 'email_sent',
    payload: { to: cleanTo, subject: saved.subject, lead_id: saved.lead_id },
  });

  return saved;
}
