import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdmin, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = createClient(supabaseUrl, supabaseKey);

// --- Organizations Management ---

router.get('/organizations', verifySuperAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*, plans ( name )')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, organizations: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/organizations', verifySuperAdmin, async (req, res) => {
  try {
    const { name, slug, plan_id, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    
    const payload = { name, slug: slug || null, status: status || 'active' };
    if (plan_id) payload.plan_id = plan_id;
    
    const { data, error } = await supabase
      .from('organizations')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, organization: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/organizations/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, plan_id, status } = req.body;
    
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (slug !== undefined) payload.slug = slug;
    if (status !== undefined) payload.status = status;
    if (plan_id !== undefined) payload.plan_id = plan_id || null;
    
    const { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, organization: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/organizations/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('domains').delete().eq('organization_id', id);
    await supabase.from('site_settings').delete().eq('organization_id', id);
    await supabase.from('profiles').update({ organization_id: null }).eq('organization_id', id);
    
    const { error } = await supabase.from('organizations').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Organização excluída com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- User Management ---

router.put('/users/:id/password', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Senha curta' });

  try {
    const { error } = await supabase.auth.admin.updateUserById(id, { password });
    if (error) throw error;
    res.json({ success: true, message: 'Senha atualizada' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Não pode se auto-excluir' });

  try {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    res.json({ success: true, message: 'Usuário excluído' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
