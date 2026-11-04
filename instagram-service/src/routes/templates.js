import { Router } from 'express';
import { supabase } from '../index.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const { category, account_id } = req.query;
    let query = supabase
      .from('instagram_templates')
      .select('*')
      .eq('company_id', req.companyId)
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (account_id) query = query.eq('account_id', account_id);

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
      .from('instagram_templates')
      .select('*, variables:instagram_templates_variables(*)')
      .eq('id', req.params.id)
      .eq('company_id', req.companyId)
      .single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(404).json({ error: 'Template not found' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      name,
      category,
      body,
      media_url,
      media_type,
      buttons,
      variables,
      tags,
      account_id,
    } = req.body;
    if (!name || !body)
      return res.status(400).json({ error: 'name and body are required' });

    const { data: template, error: tplError } = await supabase
      .from('instagram_templates')
      .insert({
        company_id: req.companyId,
        account_id,
        name,
        category: category || 'general',
        body,
        media_url,
        media_type,
        buttons: buttons || [],
        tags: tags || [],
      })
      .select()
      .single();
    if (tplError) throw tplError;

    if (variables && variables.length > 0) {
      const variableRows = variables.map((v) => ({
        template_id: template.id,
        company_id: req.companyId,
        variable_name: v.name,
        variable_type: v.type || 'text',
        default_value: v.default_value || null,
        is_required: v.is_required || false,
      }));

      const { error: varError } = await supabase
        .from('instagram_templates_variables')
        .insert(variableRows);
      if (varError) throw varError;
    }

    const { data: fullTemplate } = await supabase
      .from('instagram_templates')
      .select('*, variables:instagram_templates_variables(*)')
      .eq('id', template.id)
      .single();

    res.json({ success: true, data: fullTemplate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { name, category, body, media_url, media_type, buttons, tags } =
      req.body;
    const update = {};
    if (name) update.name = name;
    if (category) update.category = category;
    if (body) update.body = body;
    if (media_url !== undefined) update.media_url = media_url;
    if (media_type !== undefined) update.media_type = media_type;
    if (buttons) update.buttons = buttons;
    if (tags) update.tags = tags;

    const { data, error } = await supabase
      .from('instagram_templates')
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

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('instagram_templates')
      .delete()
      .eq('id', req.params.id)
      .eq('company_id', req.companyId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
