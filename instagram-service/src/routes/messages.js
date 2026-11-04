import { Router } from 'express';
import { supabase } from '../index.js';
import { instagramQueue } from '../lib/queue.js';
import { broadcastToCompany } from '../index.js';

const router = Router();

router.get('/:conversationId', async (req, res) => {
  try {
    const { limit = 50, before } = req.query;
    let query = supabase
      .from('instagram_messages')
      .select('*')
      .eq('conversation_id', req.params.conversationId)
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false })
      .limit(Number(limit));

    if (before) query = query.lt('created_at', before);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data.reverse() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      conversation_id,
      content,
      message_type = 'text',
      media_url,
      template_id,
      variables,
    } = req.body;
    if (!conversation_id || !content) {
      return res
        .status(400)
        .json({ error: 'conversation_id and content are required' });
    }

    const { data: conversation, error: convError } = await supabase
      .from('instagram_conversations')
      .select('contact_id, account_id')
      .eq('id', conversation_id)
      .eq('company_id', req.companyId)
      .single();
    if (convError) throw convError;

    const { data: message, error: msgError } = await supabase
      .from('instagram_messages')
      .insert({
        company_id: req.companyId,
        conversation_id,
        account_id: conversation.account_id,
        contact_id: conversation.contact_id,
        direction: 'outbound',
        message_type,
        content,
        media_url: media_url || null,
        sent_by_automation: !!template_id,
        metadata: template_id ? { template_id, variables } : {},
      })
      .select()
      .single();
    if (msgError) throw msgError;

    await instagramQueue.add('send-message', {
      companyId: req.companyId,
      messageId: message.id,
      accountId: conversation.account_id,
      contactId: conversation.contact_id,
      content,
      messageType: message_type,
      mediaUrl: media_url,
    });

    broadcastToCompany(req.companyId, {
      type: 'message:new',
      conversationId: conversation_id,
      message,
    });

    res.json({ success: true, data: message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/mark-read', async (req, res) => {
  try {
    const { conversation_id } = req.body;
    if (!conversation_id)
      return res.status(400).json({ error: 'conversation_id is required' });

    const { error } = await supabase
      .from('instagram_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', conversation_id)
      .eq('company_id', req.companyId)
      .eq('direction', 'inbound')
      .eq('is_read', false);
    if (error) throw error;

    await supabase
      .from('instagram_conversations')
      .update({ unread_count: 0 })
      .eq('id', conversation_id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
