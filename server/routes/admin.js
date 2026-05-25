import express from 'express';
import { verifySuperAdmin, verifyAdmin, verifyAuth } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { getSupabaseServer } from '../lib/supabase-server.js';

const router = express.Router();

// Proxy lazy: delega transparentemente para getSupabaseServer() na 1ª chamada
// Isso permite usar supabase.from(), supabase.auth, etc. sem mudar o resto do código.
const supabase = new Proxy({}, { get: (_, prop) => getSupabaseServer()[prop] });

function normalizeNiche(niche, ...signals) {
  const normalized = String(niche || '').toLowerCase().trim();
  if (normalized === 'rural') return 'rural';
  if (['traditional', 'urban', 'urbano'].includes(normalized)) return 'traditional';

  const text = signals.filter(Boolean).join(' ').toLowerCase();
  return /\b(rural|fazenda|fazendas|sitio|sítio|chacara|chácara|agro|haras)\b/.test(text)
    ? 'rural'
    : 'traditional';
}

async function findAuthUserByEmail(email) {
  const target = String(email || '').toLowerCase().trim();
  if (!target) return null;

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = data?.users?.find((item) => item.email?.toLowerCase() === target);
    if (user) return user;
    if (!data?.users || data.users.length < 1000) break;
  }

  return null;
}

async function ensureOrganizationOwner({ organization, ownerName, ownerEmail, password }) {
  const email = String(ownerEmail || '').toLowerCase().trim();
  if (!email) return null;
  if (!password || password.length < 6) {
    throw new Error('Senha de acesso deve ter no minimo 6 caracteres');
  }

  let authUser = await findAuthUserByEmail(email);

  if (authUser) {
    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', authUser.id)
      .maybeSingle();

    if (existingProfileError) throw existingProfileError;
    if (existingProfile?.role === 'superadmin') {
      throw new Error(
        'Este e-mail pertence a um SuperAdmin e nao pode ser usado como responsavel de imobiliaria.'
      );
    }
  }

  if (!authUser) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: ownerName || organization.owner_name || organization.name,
        agencyName: organization.name,
      },
    });
    if (error) throw error;
    authUser = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        name: ownerName || authUser.user_metadata?.name || organization.owner_name || organization.name,
        agencyName: organization.name,
      },
    });
    if (error) throw error;
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authUser.id,
      organization_id: organization.id,
      name: ownerName || authUser.user_metadata?.name || organization.owner_name || organization.name,
      email,
      role: 'admin',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (profileError) throw profileError;
  return authUser;
}

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
    console.log(`[Admin] 🏢 Fetching organizations for superadmin: ${req.user.email}`);
    const { data, error } = await supabase
      .from('organizations')
      .select('*, plans ( name )')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[Admin] ❌ Error fetching organizations from Supabase:', error);
      throw error;
    }
    
    res.json({ success: true, organizations: data });
  } catch (error) {
    console.error('[Admin] ❌ Internal Error in /organizations:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/organizations', verifySuperAdmin, async (req, res) => {
  try {
    const { name, slug, plan_id, status, custom_domain, niche, owner_name, owner_email, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (owner_email && (!password || password.length < 6)) {
      return res.status(400).json({ error: 'Senha de acesso deve ter no minimo 6 caracteres' });
    }
    
    const payload = { 
      name, 
      slug: slug || null, 
      status: status || 'active',
      custom_domain: custom_domain || null,
      niche: normalizeNiche(niche, name, slug, custom_domain, owner_email),
      owner_name: owner_name || null,
      owner_email: owner_email || null
    };
    if (plan_id) payload.plan_id = plan_id;
    
    const { data, error } = await supabase
      .from('organizations')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;

    const ownerUser = await ensureOrganizationOwner({
      organization: data,
      ownerName: owner_name,
      ownerEmail: owner_email,
      password,
    });

    res.json({ success: true, organization: data, owner_user_id: ownerUser?.id || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/organizations/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, plan_id, status, custom_domain, owner_name, owner_email, password, niche } = req.body;
    
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (slug !== undefined) payload.slug = slug;
    if (status !== undefined) payload.status = status;
    if (plan_id !== undefined) payload.plan_id = plan_id || null;
    if (custom_domain !== undefined) payload.custom_domain = custom_domain || null;
    if (niche !== undefined) payload.niche = normalizeNiche(niche, name, slug, custom_domain, owner_email);
    if (owner_name !== undefined) payload.owner_name = owner_name;
    if (owner_email !== undefined) payload.owner_email = owner_email;
    
    const { data: organization, error: updateError } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    if (owner_email && password) {
      await ensureOrganizationOwner({
        organization,
        ownerName: owner_name ?? organization.owner_name,
        ownerEmail: owner_email,
        password,
      });
    } else if (password && password.length >= 6) {
      // Password Update Logic (Secure)
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
