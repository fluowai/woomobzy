import { Router } from 'express';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { getSupabaseServer } from '../../../lib/supabase-server.js';
import { WahaClient } from './waha-client.js';
import { getWhatsAppProviderConfig } from './provider-config.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export function createWahaRouter({
  verifyAuth,
  requireTenant,
  applyCorsHeaders,
}) {
  const router = Router();
  const config = getWhatsAppProviderConfig();
  const client = new WahaClient(config);

  router.use((req, res, next) => {
    applyCorsHeaders(req, res);
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  router.post('/internal/waha/webhook', async (req, res) => {
    const expected =
      process.env.WAHA_API_KEY ||
      process.env.ARRAPHA_API_KEY ||
      process.env.WHATSAPP_INTERNAL_TOKEN ||
      '';
    const received =
      req.query.token ||
      req.headers['x-api-key'] ||
      req.headers['x-whatsapp-internal-token'] ||
      String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

    if (expected && received !== expected) {
      return res.status(401).json({ error: 'Webhook nao autorizado' });
    }

    try {
      const result = await ingestWahaWebhook(req.body);
      res.status(202).json({ ok: true, ...result });
    } catch (error) {
      console.error('[WAHA] Webhook failed:', error.message);
      res.status(500).json({
        error: 'Falha ao processar webhook WAHA',
        message: error.message,
      });
    }
  });

  router.get('/health', async (req, res) => {
    const service = await client
      .health()
      .catch((error) => ({ ok: false, status: 503, error: error.message }));
    res.status(service.ok ? 200 : 503).json({
      ok: service.ok,
      version: '2.0',
      provider: 'WAHA',
      engine: config.engine || 'noweb',
      service,
      node: { ok: true, uptime: process.uptime() },
    });
  });

  router.get('/status', verifyAuth, requireTenant, async (req, res) => {
    const service = await client
      .health()
      .catch((error) => ({ ok: false, status: 503, error: error.message }));
    res.status(service.ok ? 200 : 503).json({
      ok: service.ok,
      service: { ok: service.ok, status: service.status },
      provider: config.publicName,
      engine: 'waha',
      hint: service.ok
        ? 'WAHA esta respondendo.'
        : 'O servico WAHA esta temporariamente indisponivel.',
    });
  });

  router.get('/provider', verifyAuth, requireTenant, (req, res) => {
    res.json({
      name: config.publicName,
      version: '2.0',
      engine: config.engine || 'noweb',
      white_label: true,
      tenant_id: req.orgId,
    });
  });

  router.post(
    ['/socket-token', '/ws-token'],
    verifyAuth,
    requireTenant,
    (req, res) => {
      const secret = process.env.WHATSAPP_WS_JWT_SECRET || '';
      if (!secret) {
        return res.status(503).json({ error: 'WebSocket token indisponivel' });
      }

      const token = jwt.sign(
        {
          sub: req.user.id,
          org_id: req.orgId,
          purpose: 'whatsapp_ws',
          provider: 'waha',
        },
        secret,
        {
          expiresIn: '5m',
          issuer: 'imobzy-api',
          audience: 'imobzy-whatsapp-ws',
        }
      );

      res.json({ token, expires_in: 300 });
    }
  );

  router.get('/instances', verifyAuth, requireTenant, async (req, res) => {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select(
        'id, tenant_id, name, status, qr_code, phone, jid, created_at, updated_at'
      )
      .eq('tenant_id', req.orgId)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(normalizeInstanceRow));
  });

  router.post('/instances', verifyAuth, requireTenant, async (req, res) => {
    const name = String(req.body?.name || 'WhatsApp').trim() || 'WhatsApp';
    const supabase = getSupabaseServer();
    const { data: instance, error } = await supabase
      .from('whatsapp_instances')
      .insert({ tenant_id: req.orgId, name, status: 'connecting' })
      .select(
        'id, tenant_id, name, status, qr_code, phone, jid, created_at, updated_at'
      )
      .single();

    if (error) return res.status(500).json({ error: error.message });

    try {
      await client.ensureSession(instance);
      await updateInstance(instance.id, req.orgId, { status: 'qr_pending' });
      return res
        .status(201)
        .json({ ...normalizeInstanceRow(instance), status: 'qr_pending' });
    } catch (providerError) {
      await updateInstance(instance.id, req.orgId, { status: 'disconnected' });
      return res.status(502).json({
        error: 'Motor WAHA indisponivel',
        code: 'WHATSAPP_PROVIDER_UNREACHABLE',
        message: providerError.message,
        instance: normalizeInstanceRow({ ...instance, status: 'disconnected' }),
      });
    }
  });

  router.get('/instances/:id', verifyAuth, requireTenant, async (req, res) => {
    const instance = await getInstance(req.params.id, req.orgId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const status = await client.getSessionStatus(instance).catch(() => null);
    if (status?.me) {
      await updateInstance(instance.id, req.orgId, {
        phone: status.me.id ? status.me.id.split('@')[0] : instance.phone,
        jid: status.me.id || instance.jid,
      });
    }

    res.json(normalizeInstanceRow(instance));
  });

  router.post(
    '/instances/:id/connect',
    verifyAuth,
    requireTenant,
    async (req, res) => {
      const instance = await getInstance(req.params.id, req.orgId);
      if (!instance)
        return res.status(404).json({ error: 'Instance not found' });

      try {
        await client.ensureSession(instance);
        await updateInstance(instance.id, req.orgId, { status: 'qr_pending' });
        res.json({ message: 'Connection initiated' });
      } catch (error) {
        res
          .status(502)
          .json({ error: 'Falha ao iniciar WAHA', message: error.message });
      }
    }
  );

  router.get(
    '/instances/:id/qrcode',
    verifyAuth,
    requireTenant,
    async (req, res) => {
      const instance = await getInstance(req.params.id, req.orgId);
      if (!instance)
        return res.status(404).json({ error: 'Instance not found' });

      try {
        const qrCode = await client.getQRCode(instance);
        if (!qrCode) {
          return res
            .status(202)
            .json({ message: 'QR code generating', status: 'pending' });
        }
        await updateInstance(instance.id, req.orgId, {
          status: 'qr_pending',
          qr_code: qrCode,
        });
        res.json({ qr_code: qrCode, status: 'ready' });
      } catch (error) {
        res
          .status(502)
          .json({ error: 'QR code not available', message: error.message });
      }
    }
  );

  router.post(
    '/instances/:id/pair-code',
    verifyAuth,
    requireTenant,
    async (req, res) => {
      const instance = await getInstance(req.params.id, req.orgId);
      if (!instance)
        return res.status(404).json({ error: 'Instance not found' });

      const phone = String(req.body?.phone || '').replace(/\D/g, '');
      if (!phone) return res.status(400).json({ error: 'Phone is required' });

      try {
        await client.ensureSession(instance);
        const result = await client.requestPairingCode(instance, phone);
        res.json({
          pairing_code: result.code || result.pairingCode || '',
          phone: result.phone || phone,
          expires_in: result.expiresIn || result.expires_in || 120,
          message: 'Pairing code generated',
        });
      } catch (error) {
        res.status(502).json({
          error: 'Pairing code not available',
          message: error.message,
        });
      }
    }
  );

  router.post(
    '/instances/:id/logout',
    verifyAuth,
    requireTenant,
    async (req, res) => {
      const instance = await getInstance(req.params.id, req.orgId);
      if (!instance)
        return res.status(404).json({ error: 'Instance not found' });

      await client.logout(instance).catch(() => null);
      await updateInstance(instance.id, req.orgId, {
        status: 'disconnected',
        qr_code: null,
      });
      res.json({ message: 'Instance disconnected' });
    }
  );

  router.delete(
    '/instances/:id',
    verifyAuth,
    requireTenant,
    async (req, res) => {
      const instance = await getInstance(req.params.id, req.orgId);
      if (!instance)
        return res.status(404).json({ error: 'Instance not found' });

      await client.deleteSession(instance).catch(() => null);
      const supabase = getSupabaseServer();
      const { error } = await supabase
        .from('whatsapp_instances')
        .delete()
        .eq('id', instance.id)
        .eq('tenant_id', req.orgId);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ message: 'Instance deleted' });
    }
  );

  router.get('/chats', verifyAuth, requireTenant, async (req, res) => {
    const instanceId = req.query.instance_id;
    const instance = await getInstance(instanceId, req.orgId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('whatsapp_chats')
      .select(
        'id, instance_id, chat_jid, name, is_group, last_message, last_message_at, unread_count, avatar_url, created_at, updated_at'
      )
      .eq('instance_id', instance.id)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  });

  router.post('/chats/ensure', verifyAuth, requireTenant, async (req, res) => {
    const instance = await getInstance(req.query.instance_id, req.orgId);
    if (!instance) return res.status(404).json({ error: 'Instance not found' });

    const phone = String(req.body?.phone || '').replace(/\D/g, '');
    if (!phone) return res.status(400).json({ error: 'Phone is required' });

    const chatJid = `${phone}@s.whatsapp.net`;
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from('whatsapp_chats')
      .upsert(
        {
          instance_id: instance.id,
          chat_jid: chatJid,
          name: req.body?.name || phone,
          is_group: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'instance_id,chat_jid' }
      )
      .select(
        'id, instance_id, chat_jid, name, is_group, last_message, last_message_at, unread_count, avatar_url, created_at, updated_at'
      )
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  router.get(
    '/messages/:chatId',
    verifyAuth,
    requireTenant,
    async (req, res) => {
      const chat = await getChat(
        req.params.chatId,
        req.query.instance_id,
        req.orgId
      );
      if (!chat) return res.status(404).json({ error: 'Chat not found' });

      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const offset = Math.max(Number(req.query.offset) || 0, 0);
      const supabase = getSupabaseServer();
      const { data, error, count } = await supabase
        .from('whatsapp_messages')
        .select('*', { count: 'exact' })
        .eq('chat_id', chat.id)
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ messages: data || [], total: count || 0, limit, offset });
    }
  );

  router.post(
    '/messages/:chatId/send',
    verifyAuth,
    requireTenant,
    async (req, res) => {
      const chat = await getChat(
        req.params.chatId,
        req.query.instance_id,
        req.orgId
      );
      if (!chat) return res.status(404).json({ error: 'Chat not found' });

      const instance = await getInstance(chat.instance_id, req.orgId);
      const content = String(req.body?.content || '').trim();
      if (!content)
        return res.status(400).json({ error: 'Message content is required' });

      try {
        const providerMessage = await client.sendText(
          instance,
          chat.chat_jid,
          content
        );
        const messageId =
          providerMessage.id ||
          providerMessage.message_id ||
          providerMessage.key?.id ||
          randomUUID();
        const now = new Date().toISOString();
        const supabase = getSupabaseServer();
        const { data, error } = await supabase
          .from('whatsapp_messages')
          .insert({
            instance_id: instance.id,
            chat_id: chat.id,
            message_id: String(messageId),
            sender_phone: instance.phone || '',
            sender_name: instance.name || '',
            is_from_me: true,
            is_group: Boolean(chat.is_group),
            type: 'text',
            content,
            timestamp: now,
          })
          .select('*')
          .single();

        if (error) return res.status(500).json({ error: error.message });
        await touchChat(chat.id, content, now);
        res.json(data);
      } catch (error) {
        res.status(502).json({
          error: 'Falha ao enviar mensagem pelo WAHA',
          message: error.message,
        });
      }
    }
  );

  router.post(
    '/messages/:chatId/send-media',
    verifyAuth,
    requireTenant,
    upload.single('file'),
    async (req, res) => {
      const chat = await getChat(
        req.params.chatId,
        req.query.instance_id,
        req.orgId
      );
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
      if (!req.file?.buffer?.length)
        return res.status(400).json({ error: 'file is required' });

      const instance = await getInstance(chat.instance_id, req.orgId);
      const content = String(req.body?.content || '').trim();
      const msgType = normalizeMediaType(req.body?.type || req.file.mimetype);

      try {
        const providerMessage = await client.sendMedia(
          instance,
          chat.chat_jid,
          {
            type: msgType,
            data: req.file.buffer,
            mimeType: req.file.mimetype,
            fileName: req.file.originalname,
            caption: content,
          }
        );
        const messageId =
          providerMessage.id ||
          providerMessage.message_id ||
          providerMessage.key?.id ||
          randomUUID();
        const now = new Date().toISOString();
        const preview = content || mediaPreview(msgType);
        const supabase = getSupabaseServer();
        const { data, error } = await supabase
          .from('whatsapp_messages')
          .insert({
            instance_id: instance.id,
            chat_id: chat.id,
            message_id: String(messageId),
            sender_phone: instance.phone || '',
            sender_name: instance.name || '',
            is_from_me: true,
            is_group: Boolean(chat.is_group),
            type: msgType,
            content,
            media_mimetype: req.file.mimetype,
            media_filename: req.file.originalname,
            media_status: 'pending',
            timestamp: now,
          })
          .select('*')
          .single();

        if (error) return res.status(500).json({ error: error.message });
        await touchChat(chat.id, preview, now);
        res.json({ message: 'Media sent', data });
      } catch (error) {
        res.status(502).json({
          error: 'Falha ao enviar midia pelo WAHA',
          message: error.message,
        });
      }
    }
  );

  router.post(
    '/instances/:id/import-history',
    verifyAuth,
    requireTenant,
    (req, res) => {
      res.status(202).json({
        message: 'Importacao de historico sera tratada pelo pipeline WAHA.',
        requested: 0,
        analyzing: false,
        since_days: req.body?.since_days,
      });
    }
  );

  router.all('/ws', verifyAuth, requireTenant, (req, res) => {
    res.status(501).json({
      error:
        'WebSocket WAHA ainda nao esta habilitado; use webhooks para eventos.',
      code: 'WAHA_WS_NOT_IMPLEMENTED',
    });
  });

  return router;
}

async function getInstance(id, tenantId) {
  if (!id) return null;
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select(
      'id, tenant_id, name, status, qr_code, phone, jid, created_at, updated_at'
    )
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function getInstanceBySession(session) {
  const clean = String(session || '').trim();
  if (!clean) return null;

  const directId = clean.startsWith('imobzy_')
    ? clean.slice('imobzy_'.length)
    : clean;
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('whatsapp_instances')
    .select(
      'id, tenant_id, name, status, qr_code, phone, jid, created_at, updated_at'
    )
    .limit(500);

  if (error) throw error;
  return (
    (data || []).find((row) => {
      const stripped = String(row.id).replace(/-/g, '');
      return (
        stripped === directId ||
        row.id === directId ||
        `imobzy_${stripped}` === clean
      );
    }) || null
  );
}

async function updateInstance(id, tenantId, patch) {
  const supabase = getSupabaseServer();
  const { error } = await supabase
    .from('whatsapp_instances')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw error;
}

async function getChat(chatId, instanceId, tenantId) {
  if (!chatId || !instanceId) return null;
  const instance = await getInstance(instanceId, tenantId);
  if (!instance) return null;

  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('whatsapp_chats')
    .select('*')
    .eq('id', chatId)
    .eq('instance_id', instance.id)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function touchChat(chatId, lastMessage, lastMessageAt) {
  const supabase = getSupabaseServer();
  await supabase
    .from('whatsapp_chats')
    .update({
      last_message: lastMessage,
      last_message_at: lastMessageAt,
      updated_at: lastMessageAt,
    })
    .eq('id', chatId);
}

async function ingestWahaWebhook(body) {
  const event = String(body?.event || body?.type || '').toLowerCase();
  const session = getWebhookSession(body);
  const instance = await getInstanceBySession(session);

  if (!instance) {
    return { processed: false, reason: 'instance_not_found', event, session };
  }

  if (event.includes('session') || event.includes('status')) {
    const status = mapWahaStatus(
      body?.payload?.status ||
        body?.status ||
        body?.payload?.state ||
        body?.state
    );
    if (status)
      await updateInstance(instance.id, instance.tenant_id, { status });
    return { processed: true, event, status };
  }

  const message = extractWebhookMessage(body);
  if (!message) {
    return { processed: false, reason: 'unsupported_event', event, session };
  }

  const chat = await upsertWebhookChat(instance, message);
  const saved = await upsertWebhookMessage(instance, chat, message);
  await touchChat(chat.id, message.preview, message.timestamp);

  return {
    processed: true,
    event: event || 'message',
    chat_id: chat.id,
    message_id: saved?.message_id || message.messageId,
  };
}

function getWebhookSession(body) {
  return (
    body?.session ||
    body?.sessionName ||
    body?.payload?.session ||
    body?.payload?.sessionName ||
    body?.payload?.metadata?.session ||
    ''
  );
}

function extractWebhookMessage(body) {
  const payload = body?.payload || body?.data || body?.message || body;
  const event = String(body?.event || body?.type || '').toLowerCase();
  if (
    event &&
    !event.includes('message') &&
    !payload?.message &&
    !payload?.body &&
    !payload?.text
  )
    return null;

  const chatJid = normalizeStoredJid(
    payload?.chatId ||
      payload?.from ||
      payload?.to ||
      payload?.key?.remoteJid ||
      payload?.message?.key?.remoteJid ||
      payload?.remoteJid
  );
  if (!chatJid) return null;

  const content =
    payload?.body ||
    payload?.text ||
    payload?.caption ||
    payload?.message?.conversation ||
    payload?.message?.extendedTextMessage?.text ||
    payload?.message?.imageMessage?.caption ||
    payload?.message?.videoMessage?.caption ||
    '';

  const type = detectMessageType(payload);
  const timestamp = normalizeTimestamp(
    payload?.timestamp || payload?.messageTimestamp || body?.timestamp
  );
  const isFromMe = Boolean(
    payload?.fromMe || payload?.key?.fromMe || payload?.message?.key?.fromMe
  );
  const senderJid = normalizeStoredJid(
    payload?.participant ||
      payload?.author ||
      payload?.sender ||
      payload?.from ||
      chatJid
  );
  const senderPhone = getPhoneFromJid(
    isFromMe ? payload?.to || chatJid : senderJid || chatJid
  );
  const senderName =
    payload?.pushName ||
    payload?.notifyName ||
    payload?._data?.notifyName ||
    payload?.sender?.pushName ||
    senderPhone ||
    '';

  return {
    messageId: String(
      payload?.id ||
        payload?.messageId ||
        payload?.key?.id ||
        payload?.message?.key?.id ||
        randomUUID()
    ),
    chatJid,
    senderPhone,
    senderName,
    isFromMe,
    isGroup: chatJid.endsWith('@g.us'),
    type,
    content: content || mediaPreview(type),
    preview: content || mediaPreview(type),
    timestamp,
    mediaUrl:
      payload?.media?.url || payload?.mediaUrl || payload?.downloadUrl || null,
    mediaMimetype:
      payload?.media?.mimetype ||
      payload?.mimetype ||
      payload?.mimeType ||
      null,
    mediaFilename: payload?.media?.filename || payload?.filename || null,
  };
}

async function upsertWebhookChat(instance, message) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('whatsapp_chats')
    .upsert(
      {
        instance_id: instance.id,
        chat_jid: message.chatJid,
        name: message.isGroup
          ? message.chatJid
          : message.senderName || message.senderPhone || message.chatJid,
        is_group: message.isGroup,
        last_message: message.preview,
        last_message_at: message.timestamp,
        updated_at: message.timestamp,
      },
      { onConflict: 'instance_id,chat_jid' }
    )
    .select(
      'id, instance_id, chat_jid, name, is_group, last_message, last_message_at, unread_count, avatar_url, created_at, updated_at'
    )
    .single();

  if (error) throw error;
  return data;
}

async function upsertWebhookMessage(instance, chat, message) {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .upsert(
      {
        instance_id: instance.id,
        chat_id: chat.id,
        message_id: message.messageId,
        sender_phone: message.senderPhone || '',
        sender_name: message.senderName || '',
        is_from_me: message.isFromMe,
        is_group: message.isGroup,
        type: message.type,
        content: message.content,
        media_url: message.mediaUrl,
        media_mimetype: message.mediaMimetype,
        media_filename: message.mediaFilename,
        timestamp: message.timestamp,
      },
      { onConflict: 'instance_id,message_id', ignoreDuplicates: true }
    )
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

function normalizeStoredJid(value) {
  const clean = String(value || '').trim();
  if (!clean) return '';
  if (clean.endsWith('@c.us')) return clean.replace('@c.us', '@s.whatsapp.net');
  if (clean.includes('@')) return clean;
  return `${clean.replace(/\D/g, '')}@s.whatsapp.net`;
}

function getPhoneFromJid(jid) {
  return (
    String(jid || '')
      .split('@')[0]
      ?.replace(/\D/g, '') || ''
  );
}

function normalizeTimestamp(value) {
  if (!value) return new Date().toISOString();
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return new Date(
      numeric < 10_000_000_000 ? numeric * 1000 : numeric
    ).toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? new Date().toISOString()
    : parsed.toISOString();
}

function detectMessageType(payload) {
  const explicit = String(
    payload?.type || payload?.messageType || ''
  ).toLowerCase();
  if (
    [
      'text',
      'image',
      'audio',
      'video',
      'document',
      'sticker',
      'location',
      'contact',
    ].includes(explicit)
  )
    return explicit;
  const message = payload?.message || {};
  if (message.imageMessage || payload?.mimetype?.startsWith?.('image/'))
    return 'image';
  if (message.audioMessage || payload?.mimetype?.startsWith?.('audio/'))
    return 'audio';
  if (message.videoMessage || payload?.mimetype?.startsWith?.('video/'))
    return 'video';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  if (message.locationMessage) return 'location';
  if (message.contactMessage || message.contactsArrayMessage) return 'contact';
  return 'text';
}

function normalizeMediaType(value) {
  const clean = String(value || '').toLowerCase();
  if (['image', 'audio', 'video', 'document'].includes(clean)) return clean;
  if (clean.startsWith('image/')) return 'image';
  if (clean.startsWith('audio/')) return 'audio';
  if (clean.startsWith('video/')) return 'video';
  return 'document';
}

function mediaPreview(type) {
  const previews = {
    image: 'Imagem',
    audio: 'Audio',
    video: 'Video',
    document: 'Documento',
    sticker: 'Figurinha',
    location: 'Localizacao',
    contact: 'Contato',
  };
  return previews[type] || '';
}

function mapWahaStatus(value) {
  const status = String(value || '').toLowerCase();
  if (!status) return null;
  if (['working', 'connected', 'authenticated', 'ready'].includes(status))
    return 'connected';
  if (['scan_qr_code', 'qr', 'qr_pending'].includes(status))
    return 'qr_pending';
  if (['starting', 'connecting', 'pairing'].includes(status))
    return 'connecting';
  if (['stopped', 'failed', 'disconnected', 'logout'].includes(status))
    return 'disconnected';
  return null;
}

function normalizeInstanceRow(row) {
  return {
    id: row.id,
    tenant_id: row.tenant_id || undefined,
    name: row.name || 'WhatsApp',
    status: row.status || 'disconnected',
    qr_code: row.qr_code || undefined,
    phone: row.phone || undefined,
    jid: row.jid || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
