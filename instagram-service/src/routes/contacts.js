import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;
    let query = supabase
      .from('instagram_contacts')
      .select('*')
      .eq('company_id', req.companyId)
      .order('lead_score', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

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
      .from('instagram_contacts')
      .select('*')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ error: 'Contact not found' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { lead_score, tags, custom_fields } = req.body;
    const update = {};
    if (lead_score !== undefined) update.lead_score = lead_score;
    if (tags !== undefined) update.tags = tags;
    if (custom_fields !== undefined) update.custom_fields = custom_fields;

    const { data, error } = await supabase
      .from('instagram_contacts')
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
