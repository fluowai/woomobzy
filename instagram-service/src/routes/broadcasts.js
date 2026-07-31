import { Router } from 'express';
import { supabase } from '../index.js';
import { instagramQueue } from '../lib/queue.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('instagram_broadcast_groups')
      .select('*, template:instagram_templates(id, name)')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('instagram_broadcast_groups')
      .select(
        '*, template:instagram_templates(*), recipients:instagram_broadcast_recipients(count)'
      )
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ error: 'Broadcast group not found' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      account_id,
      template_id,
      filter_criteria,
      scheduled_at,
    } = req.body;
    if (!name || !account_id) {
      return res
        .status(400)
        .json({ error: 'name and account_id are required' });
    }

    const { data: broadcast, error: bcError } = await supabase
      .from('instagram_broadcast_groups')
      .insert({
        company_id: req.companyId,
        account_id,
        name,
        description,
        template_id,
        filter_criteria: filter_criteria || {},
        status: scheduled_at ? 'scheduled' : 'draft',
        scheduled_at,
      })
      .select()
      .single();
    if (bcError) throw bcError;

    const { data: contacts } = await supabase
      .from('instagram_contacts')
      .select('id')
      .eq('company_id', req.companyId)
      .eq('account_id', account_id);

    if (contacts && contacts.length > 0) {
      const recipients = contacts.map((c) => ({
        broadcast_group_id: broadcast.id,
        contact_id: c.id,
        company_id: req.companyId,
        status: 'pending',
      }));

      await supabase.from('instagram_broadcast_recipients').insert(recipients);

      await supabase
        .from('instagram_broadcast_groups')
        .update({ recipient_count: contacts.length })
        .eq('id', broadcast.id);
    }

    res.json({ success: true, data: broadcast });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/send', async (req, res) => {
  try {
    const { data: broadcast, error: bcError } = await supabase
      .from('instagram_broadcast_groups')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (bcError) throw bcError;

    if (broadcast.status !== 'draft' && broadcast.status !== 'scheduled') {
      return res.status(400).json({
        error: `Cannot send broadcast in '${broadcast.status}' status`,
      });
    }

    await supabase
      .from('instagram_broadcast_groups')
      .update({ status: 'sending', started_at: new Date().toISOString() })
      .eq('id', broadcast.id);

    await instagramQueue.add('send-broadcast', {
      broadcastId: broadcast.id,
      companyId: req.companyId,
      accountId: broadcast.account_id,
      templateId: broadcast.template_id,
    });

    res.json({ success: true, message: 'Broadcast queued for sending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/cancel', async (req, res) => {
  try {
    const { error } = await supabase
      .from('instagram_broadcast_groups')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .in('status', ['draft', 'scheduled']);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
