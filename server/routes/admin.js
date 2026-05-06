import express from 'express';
import { verifySuperAdmin, verifyAdmin, verifyAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();

// Proxy lazy: delega transparentemente para getSupabaseServer() na 1ª chamada
// Isso permite usar supabase.from(), supabase.auth, etc. sem mudar o resto do código.
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

// --- 🔓 IMPERSONATION (BLOCO 3) ---

/**
 * POST /api/admin/impersonate
 * Inicia o modo suporte para uma organização específica.
 */
router.post('/impersonate', verifySuperAdmin, async (req, res) => {
  const { organizationId } = req.body;
  if (!organizationId) return res.status(400).json({ error: 'ID da organização é obrigatório' });

  try {
    // Verificar se a organização existe
    const { data: org, error } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single();

    if (error || !org) return res.status(404).json({ error: 'Organização não encontrada' });

    console.log(`[Impersonation] 🛡️ SuperAdmin ${req.user.email} iniciando suporte para ${org.name}`);
    
    // Na arquitetura de API, o frontend apenas armazena esse ID e envia no header x-impersonate-org-id
    // O backend já valida a role no middleware verifyAuth
    res.json({ 
      success: true, 
      message: `Modo suporte ativado para ${org.name}`,
      orgId: org.id 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 🏢 Organizations Management ---

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
    const { name, slug, plan_id, status, custom_domain, niche } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    
    const payload = { 
      name, 
      slug: slug || null, 
      status: status || 'active',
      custom_domain: custom_domain || null,
      niche: niche || 'hybrid'
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
    const { name, slug, plan_id, status, custom_domain, owner_email, password, niche } = req.body;
    
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (slug !== undefined) payload.slug = slug;
    if (status !== undefined) payload.status = status;
    if (plan_id !== undefined) payload.plan_id = plan_id || null;
    if (custom_domain !== undefined) payload.custom_domain = custom_domain || null;
    if (niche !== undefined) payload.niche = niche;
    
    const { data: organization, error: updateError } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Password Update Logic (Secure)
    if (password && password.length >= 6) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('organization_id', id)
        .eq('role', 'admin')
        .maybeSingle();
      
      if (adminProfile) {
        await supabase.auth.admin.updateUserById(adminProfile.id, { password });
      }
    }

    res.json({ success: true, organization });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 👥 User Management (Tenant Isolated) ---

router.put('/users/:id/password', verifyAdmin, requireTenant, async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  
  if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });

  try {
    // SEGURANÇA: Verificar se o usuário pertence à mesma Org do Admin
    const { data: targetUser, error: checkError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (checkError || targetUser.organization_id !== req.orgId) {
      console.warn(`[Security] ❌ Bloqueio de ação cross-tenant por ${req.user.email}`);
      return res.status(403).json({ error: 'Não autorizado: Usuário não pertence à sua organização' });
    }

    const { error } = await supabase.auth.admin.updateUserById(id, { password });
    if (error) throw error;
    res.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', verifyAdmin, requireTenant, async (req, res) => {
  const { id } = req.params;
  if (id === req.user.id) return res.status(400).json({ error: 'Não é possível excluir o próprio usuário' });

  try {
    // SEGURANÇA: Verificar se o usuário pertence à mesma Org do Admin
    const { data: targetUser, error: checkError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (checkError || targetUser.organization_id !== req.orgId) {
      return res.status(403).json({ error: 'Não autorizado: Usuário não pertence à sua organização' });
    }

    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) throw error;
    res.json({ success: true, message: 'Usuário excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
