import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { status, assigned_to, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from('instagram_conversations')
      .select('*, contact:instagram_contacts(id, username, full_name, profile_picture_url), account:instagram_accounts(id, username)')
      .eq('company_id', req.companyId)
      .order('last_message_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (status) query = query.eq('status', status);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);

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
      .from('instagram_conversations')
      .select('*, contact:instagram_contacts(*), account:instagram_accounts(id, username)')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { status, assigned_to, priority, tags } = req.body;
    const update = {};
    if (status) update.status = status;
    if (assigned_to !== undefined) update.assigned_to = assigned_to;
    if (priority) update.priority = priority;
    if (tags !== undefined) update.tags = tags;

    const { data, error } = await supabase
      .from('instagram_conversations')
      .update(update)
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
