import { Router } from 'express';
import { getWhatsAppCloudClient, invalidateClientCache } from './client.js';
import { getSupabaseServer } from '../../lib/supabase-server.js';
import logger from '../../utils/logger.js';

const router = Router();

router.post('/text/:instanceId', async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'to e message obrigatórios' });
    }

    const { client } = await getWhatsAppCloudClient(req.params.instanceId);
    const result = await client.messages.send({
      to,
      type: 'text',
      text: { body: message },
    });

    await saveOutboundMessage(req.params.instanceId, to, 'text', message, result);

    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (error) {
    logger.error('Erro ao enviar mensagem Cloud API:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/template/:instanceId', async (req, res) => {
  try {
    const { to, templateName, language, components } = req.body;
    if (!to || !templateName) {
      return res.status(400).json({ error: 'to e templateName obrigatórios' });
    }

    const { client } = await getWhatsAppCloudClient(req.params.instanceId);
    const result = await client.messages.send({
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language || 'pt_BR' },
        components: components || [],
      },
    });

    await saveOutboundMessage(req.params.instanceId, to, 'text', `[Template: ${templateName}]`, result);

    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (error) {
    logger.error('Erro ao enviar template Cloud API:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/media/:instanceId', async (req, res) => {
  try {
    const { to, type, caption, mediaUrl, mimeType, filename } = req.body;
    if (!to || !type || !mediaUrl) {
      return res.status(400).json({ error: 'to, type e mediaUrl obrigatórios' });
    }

    const { client } = await getWhatsAppCloudClient(req.params.instanceId);

    const mediaPayload = { link: mediaUrl };
    if (mimeType) mediaPayload.mimeType = mimeType;
    if (filename) mediaPayload.filename = filename;

    const msgPayload = {
      to,
      type,
      [type]: mediaPayload,
    };

    if (caption && ['image', 'video', 'document'].includes(type)) {
      msgPayload[type].caption = caption;
    }

    const result = await client.messages.send(msgPayload);

    await saveOutboundMessage(req.params.instanceId, to, type, caption || '', result);

    res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (error) {
    logger.error('Erro ao enviar mídia Cloud API:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/media/upload/:instanceId', async (req, res) => {
  try {
    const { fileBase64, mimeType, messagingProduct } = req.body;
    if (!fileBase64 || !mimeType) {
      return res.status(400).json({ error: 'fileBase64 e mimeType obrigatórios' });
    }

    const { client } = await getWhatsAppCloudClient(req.params.instanceId);
    const buffer = Buffer.from(fileBase64, 'base64');
    const result = await client.media.upload({
      messaging_product: messagingProduct || 'whatsapp',
      type: mimeType,
      file: buffer,
    });

    res.json({ success: true, mediaId: result.id });
  } catch (error) {
    logger.error('Erro ao upload mídia Cloud API:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/media/:instanceId/:mediaId', async (req, res) => {
  try {
    const { client } = await getWhatsAppCloudClient(req.params.instanceId);
    const mediaInfo = await client.media.get(req.params.mediaId);

    if (!mediaInfo?.url) {
      return res.status(404).json({ error: 'Mídia não encontrada' });
    }

    const mediaResponse = await fetch(mediaInfo.url, {
      headers: { Authorization: `Bearer ${client.accessToken}` },
    });

    if (!mediaResponse.ok) {
      return res.status(502).json({ error: 'Erro ao baixar mídia do Meta' });
    }

    const buffer = Buffer.from(await mediaResponse.arrayBuffer());
    res.set('Content-Type', mediaInfo.mime_type || 'application/octet-stream');
    res.send(buffer);
  } catch (error) {
    logger.error('Erro ao baixar mídia Cloud API:', error);
    res.status(500).json({ error: error.message });
  }
});

async function saveOutboundMessage(instanceId, to, type, content, result) {
  try {
    const supabase = getSupabaseServer();
    const messageId = result?.messages?.[0]?.id;

    const { data: chat } = await supabase
      .from('whatsapp_chats')
      .select('id')
      .eq('instance_id', instanceId)
      .eq('chat_jid', to)
      .single();

    if (!chat) return;

    if (messageId) {
      await supabase.from('whatsapp_messages').insert({
        instance_id: instanceId,
        chat_id: chat.id,
        message_id: messageId,
        sender_phone: to,
        sender_name: '',
        is_from_me: true,
        is_group: false,
        type,
        content: content?.substring(0, 5000) || '',
        timestamp: new Date().toISOString(),
      });
    }

    await supabase.from('whatsapp_chats').update({
      last_message: content?.substring(0, 255) || '',
      last_message_at: new Date().toISOString(),
    }).eq('id', chat.id);
  } catch (error) {
    logger.error('Erro ao salvar mensagem outbound:', error);
  }
}

export default router;
