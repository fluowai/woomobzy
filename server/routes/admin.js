import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdmin, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ [AdminRoutes] Supabase credentials missing. Some routes will fail.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

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
    const { name, slug, plan_id, status, custom_domain } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    
    const payload = { 
      name, 
      slug: slug || null, 
      status: status || 'active',
      custom_domain: custom_domain || null
    };
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
    const { name, slug, plan_id, status, custom_domain, owner_email, password } = req.body;
    
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (slug !== undefined) payload.slug = slug;
    if (status !== undefined) payload.status = status;
    if (plan_id !== undefined) payload.plan_id = plan_id || null;
    if (custom_domain !== undefined) payload.custom_domain = custom_domain || null;
    if (owner_email !== undefined) payload.owner_email = owner_email || null;
    
    let { data, error } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    // Se o erro for coluna não encontrada (owner_email), tenta sem ela
    if (error && (error.message.includes('owner_email') || error.code === 'PGRST204' || error.code === '42703')) {
      console.warn('⚠️ Coluna owner_email não encontrada, tentando salvar sem ela...');
      const fallbackPayload = { ...payload };
      delete fallbackPayload.owner_email;
      
      const retry = await supabase
        .from('organizations')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .single();
      
      data = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    // Se uma senha foi fornecida, atualizar a senha de forma inteligente
    if (password && password.length >= 6) {
      let targetEmail = owner_email || data.owner_email;

      // Se não temos o e-mail no metadado, buscamos o administrador da organização nos perfis
      if (!targetEmail) {
        const { data: adminProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('organization_id', id)
          .eq('role', 'admin')
          .limit(1)
          .maybeSingle();
        
        targetEmail = adminProfile?.email;
      }

      if (targetEmail) {
        const { data: userData } = await supabase.auth.admin.listUsers();
        const userToUpdate = userData?.users?.find(u => u.email === targetEmail);
        
        if (userToUpdate) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(userToUpdate.id, { password });
          if (!updateError) console.log(`🔐 Password updated for user: ${targetEmail}`);
        }
      }
    }

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
