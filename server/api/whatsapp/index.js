import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { whatsappManager } from '../../baileys/index.js';

const router = Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

import { verifyAdmin } from '../../middleware/auth.js';

router.post('/instances', verifyAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });

    const { data, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        organization_id: req.orgId,
        name,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, instance: data });
  } catch (e) {
    console.error('Error creating instance:', e);
    res.status(500).json({ error: e.message });
  }
});

router.get('/instances', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('organization_id', req.orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, instances: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/instances/:id', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Instância não encontrada' });

    res.json({ success: true, instance: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/instances/:id', verifyAdmin, async (req, res) => {
  try {
    await whatsappManager.logout(req.params.id);

    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId);

    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/instances/:id/qr', verifyAdmin, async (req, res) => {
  try {
    const instanceId = req.params.id;
    const instance = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('organization_id', req.orgId)
      .single();

    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    if (instance.status === 'connected') {
      return res.json({ success: true, status: 'connected', phoneNumber: instance.phone_number });
    }

    if (instance.status === 'pending' || instance.status === 'disconnected') {
      let session = whatsappManager.getSession(instanceId);
      
      if (!session) {
        session = await whatsappManager.initSession(instanceId, req.orgId);
      }

      const qrCode = whatsappManager.getQRCode(instanceId);
      if (qrCode) {
        return res.json({ success: true, qrCode, status: 'waiting_qr' });
      }

      return res.json({ success: true, status: 'generating_qr' });
    }

    res.json({ success: true, status: instance.status });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/instances/:id/connect', verifyAdmin, async (req, res) => {
  try {
    const instanceId = req.params.id;
    const instance = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .eq('organization_id', req.orgId)
      .single();

    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    if (instance.status === 'connected') {
      return res.json({ success: true, status: 'connected', phoneNumber: instance.phone_number });
    }

    await whatsappManager.initSession(instanceId, req.orgId);
    res.json({ success: true, status: 'connecting' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/instances/:id/disconnect', verifyAdmin, async (req, res) => {
  try {
    await whatsappManager.logout(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/instances/:id/chats', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_chats')
      .select('*')
      .eq('instance_id', req.params.id)
      .order('last_message_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, chats: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/instances/:id/chats/:chatId/messages', verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('instance_id', req.params.id)
      .eq('chat_id', req.params.chatId)
      .order('timestamp', { ascending: true })
      .limit(100);

    if (error) throw error;
    res.json({ success: true, messages: data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/instances/:id/send', verifyAdmin, async (req, res) => {
  try {
    const { jid, text } = req.body;
    if (!jid || !text) return res.status(400).json({ error: 'jid e text são obrigatórios' });

    const instance = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.orgId)
      .single();

    if (!instance) return res.status(404).json({ error: 'Instância não encontrada' });

    if (instance.status !== 'connected') {
      return res.status(400).json({ error: 'Instância não está conectada' });
    }

    const formattedJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    const result = await whatsappManager.sendMessage(req.params.id, formattedJid, text);
    
    res.json({ success: true, messageId: result.key.id });
  } catch (e) {
    console.error('Error sending message:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/send-test', verifyAdmin, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'phone e message são obrigatórios' });

    const cleanPhone = phone.replace(/\D/g, '');
    const jid = cleanPhone.length > 12 
      ? `${cleanPhone}@s.whatsapp.net` 
      : `55${cleanPhone}@s.whatsapp.net`;

    const instances = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('organization_id', req.orgId)
      .eq('status', 'connected')
      .limit(1);

    if (!instances.data?.length) {
      return res.status(400).json({ error: 'Nenhuma instância conectada' });
    }

    const result = await whatsappManager.sendMessage(instances.data[0].id, jid, message);
    res.json({ success: true, messageId: result.key.id });
  } catch (e) {
    console.error('Error sending test message:', e);
    res.status(500).json({ error: e.message });
  }
});

// Rota de Diagnóstico (Auditoria de Dados)
router.get('/debug', verifyAdmin, async (req, res) => {
  try {
    const { data: msgCount } = await supabase.from('whatsapp_messages').select('id', { count: 'exact', head: true });
    const { data: chatCount } = await supabase.from('whatsapp_chats').select('id', { count: 'exact', head: true });
    const { data: instCount } = await supabase.from('whatsapp_instances').select('id', { count: 'exact', head: true });
    
    // Busca as últimas 5 mensagens para ver se têm conteúdo
    const { data: lastMessages } = await supabase
      .from('whatsapp_messages')
      .select('id, content, created_at, instance_id')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      success: true,
      stats: {
        total_messages: msgCount?.length || 0,
        total_chats: chatCount?.length || 0,
        total_instances: instCount?.length || 0
      },
      last_messages_snapshot: lastMessages
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
