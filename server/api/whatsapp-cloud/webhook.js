import { Router } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import { decrypt } from '../../lib/crypto.js';
import logger from '../../utils/logger.js';

const router = Router();

function verifyMetaSignature(appSecret, body, signature) {
  if (!signature) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(body).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

router.get('/:appId', async (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const appId = req.params.appId;

  if (mode !== 'subscribe') {
    return res.sendStatus(403);
  }

  try {
    const supabase = getSupabaseServer();
    const { data: cred } = await supabase
      .from('whatsapp_cloud_credentials')
      .select('webhook_verify_token')
      .eq('app_id', appId)
      .eq('is_active', true)
      .single();

    if (!cred || cred.webhook_verify_token !== token) {
      logger.warn(`Webhook verify failed: appId=${appId}, token mismatch`);
      return res.sendStatus(403);
    }
  } catch (err) {
    logger.error('Error verifying webhook token:', err);
    return res.sendStatus(500);
  }

  res.send(challenge);
});

router.post('/:appId', async (req, res) => {
  res.sendStatus(200);

  try {
    const body = req.body;
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    if (!change) return;

    const phoneNumberId = change.value?.metadata?.phone_number_id;
    if (!phoneNumberId) return;

    const supabase = getSupabaseServer();
    const { data: cred } = await supabase
      .from('whatsapp_cloud_credentials')
      .select('instance_id, tenant_id, app_secret_encrypted')
      .eq('phone_number_id', phoneNumberId)
      .eq('is_active', true)
      .single();

    if (!cred) {
      logger.warn(`Webhook Cloud API: credenciais não encontradas para phone_number_id=${phoneNumberId}`);
      return;
    }

    const field = change.field;
    const value = change.value;

    if (field === 'messages') {
      await handleIncomingMessages(cred, value);
    } else if (field === 'statuses') {
      await handleStatusUpdates(cred, value);
    }
  } catch (error) {
    logger.error('Erro ao processar webhook Cloud API:', error);
  }
});

async function handleIncomingMessages(cred, value) {
  const supabase = getSupabaseServer();
  const messages = value.messages || [];
  const contacts = value.contacts || [];

  for (const msg of messages) {
    const contact = contacts.find(c => c.wa_id === msg.from) || {};

    const chatResult = await supabase.rpc('upsert_chat_from_cloud', {
      p_instance_id: cred.instance_id,
      p_chat_jid: msg.from,
      p_name: contact.profile?.name || msg.from,
    }).then(() => {
      return supabase
        .from('whatsapp_chats')
        .select('id')
        .eq('instance_id', cred.instance_id)
        .eq('chat_jid', msg.from)
        .single();
    });

    const chatId = chatResult?.data?.id;
    if (!chatId) continue;

    const type = resolveMessageType(msg.type);
    const content = extractMessageContent(msg);
    const mediaUrl = extractMediaUrl(msg);

    await supabase.from('whatsapp_messages').insert({
      instance_id: cred.instance_id,
      chat_id: chatId,
      message_id: msg.id,
      sender_phone: msg.from,
      sender_name: contact.profile?.name || '',
      is_from_me: false,
      is_group: false,
      type,
      content,
      media_url: mediaUrl,
      timestamp: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
    }).then(() => {
      return supabase.from('whatsapp_chats').update({
        last_message: content?.substring(0, 255) || '',
        last_message_at: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
      }).eq('id', chatId);
    });
  }
}

async function handleStatusUpdates(cred, value) {
  const statuses = value.statuses || [];
  for (const status of statuses) {
    logger.debug(`Cloud API status: ${status.id} -> ${status.status}`);
  }
}

function resolveMessageType(type) {
  const map = {
    text: 'text',
    image: 'image',
    video: 'video',
    audio: 'audio',
    document: 'document',
    sticker: 'sticker',
    location: 'location',
    contacts: 'contact',
  };
  return map[type] || 'unknown';
}

function extractMessageContent(msg) {
  switch (msg.type) {
    case 'text': return msg.text?.body || '';
    case 'image': return msg.image?.caption || '';
    case 'video': return msg.video?.caption || '';
    case 'audio': return '';
    case 'document': return msg.document?.caption || msg.document?.filename || '';
    case 'sticker': return '';
    case 'location': return `${msg.location?.latitude}, ${msg.location?.longitude}`;
    default: return '';
  }
}

function extractMediaUrl(msg) {
  const media = msg[msg.type];
  return media?.id || null;
}

export default router;
