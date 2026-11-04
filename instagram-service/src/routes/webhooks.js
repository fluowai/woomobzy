import { Router } from 'express';
import { supabase, broadcastToCompany } from '../index.js';
import { instagramQueue } from '../lib/queue.js';

const router = Router();

router.post('/instagram/message', async (req, res) => {
  try {
    const {
      account_id,
      instagram_message_id,
      sender_username,
      text,
      media_url,
      media_type,
      timestamp,
    } = req.body;

    if (!account_id || !instagram_message_id) {
      return res
        .status(400)
        .json({ error: 'account_id and instagram_message_id are required' });
    }

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('company_id')
      .eq('id', account_id)
      .single();

    if (!account) return res.status(404).json({ error: 'Account not found' });

    const companyId = account.company_id;

    let { data: contact } = await supabase
      .from('instagram_contacts')
      .select('id')
      .eq('company_id', companyId)
      .eq('account_id', account_id)
      .eq('username', sender_username)
      .maybeSingle();

    if (!contact) {
      const { data: newContact } = await supabase
        .from('instagram_contacts')
        .insert({
          company_id: companyId,
          account_id,
          instagram_user_id: sender_username,
          username: sender_username,
        })
        .select('id')
        .single();
      contact = newContact;
    }

    let { data: conversation } = await supabase
      .from('instagram_conversations')
      .select('id')
      .eq('company_id', companyId)
      .eq('contact_id', contact.id)
      .eq('account_id', account_id)
      .in('status', ['open', 'pending'])
      .maybeSingle();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from('instagram_conversations')
        .insert({
          company_id: companyId,
          account_id,
          contact_id: contact.id,
          status: 'open',
        })
        .select('id')
        .single();
      conversation = newConv;
    }

    const { data: message, error: msgError } = await supabase
      .from('instagram_messages')
      .insert({
        company_id: companyId,
        conversation_id: conversation.id,
        account_id,
        contact_id: contact.id,
        instagram_message_id,
        direction: 'inbound',
        message_type: media_type || 'text',
        content: text,
        media_url,
        media_type,
        sent_at: timestamp || new Date().toISOString(),
      })
      .select()
      .single();
    if (msgError) throw msgError;

    await supabase
      .from('instagram_conversations')
      .update({
        last_message_preview: text?.substring(0, 200) || null,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversation.id);

    await supabase
      .from('instagram_contacts')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', contact.id);

    broadcastToCompany(companyId, {
      type: 'message:incoming',
      conversationId: conversation.id,
      message,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/instagram/status', async (req, res) => {
  try {
    const {
      account_id,
      status,
      instagram_user_id,
      profile_picture_url,
      followers_count,
    } = req.body;

    if (!account_id)
      return res.status(400).json({ error: 'account_id is required' });

    const update = { status };
    if (instagram_user_id) update.instagram_user_id = instagram_user_id;
    if (profile_picture_url) update.profile_picture_url = profile_picture_url;
    if (followers_count !== undefined) update.followers_count = followers_count;
    if (status === 'active') update.last_login_at = new Date().toISOString();
    update.last_activity_at = new Date().toISOString();

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('company_id')
      .eq('id', account_id)
      .single();

    const { error } = await supabase
      .from('instagram_accounts')
      .update(update)
      .eq('id', account_id);
    if (error) throw error;

    if (account) {
      broadcastToCompany(account.company_id, {
        type: 'account:status',
        accountId: account_id,
        status,
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/instagram/session-expired', async (req, res) => {
  try {
    const { account_id, reason } = req.body;
    if (!account_id)
      return res.status(400).json({ error: 'account_id is required' });

    await supabase
      .from('instagram_sessions')
      .update({ is_valid: false, invalidation_reason: reason || 'expired' })
      .eq('account_id', account_id)
      .eq('is_valid', true);

    const { data: account } = await supabase
      .from('instagram_accounts')
      .select('company_id')
      .eq('id', account_id)
      .single();

    if (account) {
      await supabase
        .from('instagram_accounts')
        .update({
          status: 'login_required',
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', account_id);

      broadcastToCompany(account.company_id, {
        type: 'account:session_expired',
        accountId: account_id,
      });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
