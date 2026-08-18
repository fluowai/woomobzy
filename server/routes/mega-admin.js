import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { verifyMegaAdmin } from '../middleware/auth.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { assertValidDomain, normalizeDomain } from '../utils/domains.js';
import { sendWelcomeEmail } from '../services/email/emailService.js';

const router = express.Router();

const supabase = new Proxy(
  {},
  {
    get: (_, prop) => {
      const client = getSupabaseServer();
      const value = client[prop];
      return typeof value === 'function' ? value.bind(client) : value;
    },
  }
);

function normalizeNiche(niche, ...signals) {
  const normalized = String(niche || '')
    .toLowerCase()
    .trim();
  if (
    normalized === 'both' ||
    normalized === 'ambos' ||
    normalized === 'hibrido' ||
    normalized === 'hybrid'
  )
    return 'both';
  if (normalized === 'rural') return 'rural';
  if (['traditional', 'urban', 'urbano'].includes(normalized))
    return 'traditional';

  const text = signals.filter(Boolean).join(' ').toLowerCase();
  if (/\b(ambos|híbrido|hibrido)\b/.test(text)) return 'both';

  return /\b(rural|fazenda|fazendas|sitio|sítio|chacara|chácara|agro|haras)\b/.test(
    text
  )
    ? 'rural'
    : 'traditional';
}

async function findAuthUserByEmail(email) {
  const {
    data: { users },
    error,
  } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;
  return (
    users.find(
      (u) =>
        String(u.email || '')
          .toLowerCase()
          .trim() === email
    ) || null
  );
}

// GET /api/mega/resellers — Listar todos os resellers
router.get('/resellers', verifyMegaAdmin, async (req, res) => {
  try {
    const { data: resellers, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('is_reseller', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const resellerIds = (resellers || []).map((r) => r.id);

    const { data: childCounts } = await supabase
      .from('organizations')
      .select('parent_id')
      .in('parent_id', resellerIds);

    const counts = {};
    (childCounts || []).forEach((row) => {
      counts[row.parent_id] = (counts[row.parent_id] || 0) + 1;
    });

    const enriched = (resellers || []).map((r) => ({
      ...r,
      tenant_count: counts[r.id] || 0,
    }));

    res.json({ success: true, resellers: enriched });
  } catch (error) {
    console.error('[MegaAdmin] Error listing resellers:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mega/resellers — Criar novo reseller
router.post('/resellers', verifyMegaAdmin, async (req, res) => {
  try {
    const { name, slug, owner_name, owner_email, password, niche, document, phone, creci, address, city, state, zip_code } = req.body;

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (!owner_email) {
      return res
        .status(400)
        .json({ error: 'Email do responsável é obrigatório' });
    }
    let finalPassword = password;
    if (!finalPassword || finalPassword.length < 6) {
      // Se não enviou senha, geramos uma senha provisória forte para o Setup Guiado
      finalPassword = Math.random().toString(36).slice(-10) + 'A1!';
    }

    const { data: existingSlug } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug || name.toLowerCase().replace(/\s+/g, '-'))
      .maybeSingle();

    if (existingSlug) {
      return res.status(409).json({ error: 'Este slug já está em uso' });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([
        {
          name,
          slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
          status: 'active',
          is_reseller: true,
          niche: normalizeNiche(niche, name, slug),
          owner_name: owner_name || null,
          owner_email: owner_email || null,
          document: document || null,
          phone: phone || null,
          creci: creci || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zip_code: zip_code || null,
        },
      ])
      .select()
      .single();

    if (orgError) throw orgError;

    let authUser = await findAuthUserByEmail(
      String(owner_email).toLowerCase().trim()
    );

    if (!authUser) {
      const { data, error: createError } = await supabase.auth.admin.createUser(
        {
          email: String(owner_email).toLowerCase().trim(),
          password: finalPassword,
          email_confirm: true,
          user_metadata: {
            name: owner_name || name,
            role: 'superadmin',
          },
          app_metadata: {
            role: 'superadmin',
          },
        }
      );
      if (createError) throw createError;
      authUser = data.user;

      try {
        await sendWelcomeEmail({
          email: String(owner_email).toLowerCase().trim(),
          name: owner_name || name,
          password: finalPassword,
          organizationId: organization.id
        });
      } catch (err) {
        console.warn('[MegaAdmin] Erro enviando bem-vindo reseller:', err.message);
      }
    } else {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: finalPassword,
          email_confirm: true,
          app_metadata: {
            ...(authUser.app_metadata || {}),
            role: 'superadmin',
          },
          user_metadata: {
            ...(authUser.user_metadata || {}),
            name: owner_name || name,
            role: 'superadmin',
          },
        }
      );
      if (updateError) throw updateError;
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        organization_id: org.id,
        name: owner_name || name,
        email: String(owner_email).toLowerCase().trim(),
        role: 'superadmin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) throw profileError;

    res.json({
      success: true,
      reseller: org,
      owner_user_id: authUser.id,
      setup_password: finalPassword, // Usado para o Link de Setup Guiado
    });
  } catch (error) {
    console.error('[MegaAdmin] Error creating reseller:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mega/resellers/:id — Atualizar reseller
router.put('/resellers/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, owner_name, owner_email, status, niche, document, phone, creci, address, city, state, zip_code } = req.body;

    const updatePayload = {};
    if (name) updatePayload.name = name;
    if (slug) updatePayload.slug = slug;
    if (status) updatePayload.status = status;
    if (niche) updatePayload.niche = normalizeNiche(niche, name, slug);
    if (owner_name !== undefined) updatePayload.owner_name = owner_name;
    if (owner_email !== undefined) updatePayload.owner_email = owner_email;
    if (document !== undefined) updatePayload.document = document;
    if (phone !== undefined) updatePayload.phone = phone;
    if (creci !== undefined) updatePayload.creci = creci;
    if (address !== undefined) updatePayload.address = address;
    if (city !== undefined) updatePayload.city = city;
    if (state !== undefined) updatePayload.state = state;
    if (zip_code !== undefined) updatePayload.zip_code = zip_code;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', id)
      .eq('is_reseller', true)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Reseller não encontrado' });
    }

    res.json({ success: true, reseller: data });
  } catch (error) {
    console.error('[MegaAdmin] Error updating reseller:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/mega/resellers/:id — Excluir reseller e suas imobiliárias
router.delete('/resellers/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', id)
      .eq('is_reseller', true)
      .maybeSingle();

    if (!org) {
      return res.status(404).json({ error: 'Reseller não encontrado' });
    }

    const { error: deleteChildrenError } = await supabase
      .from('organizations')
      .delete()
      .eq('parent_id', id);

    if (deleteChildrenError) throw deleteChildrenError;

    const { error: deleteOrgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteOrgError) throw deleteOrgError;

    res.json({ success: true, message: 'Reseller excluído com sucesso' });
  } catch (error) {
    console.error('[MegaAdmin] Error deleting reseller:', error);
    res.status(500).json({ error: error.message });
  }
});

// --- CLIENTES DIRETOS (Mega Admin Direct Clients) ---

// GET /api/mega/direct-clients — Listar todos os clientes diretos
router.get('/direct-clients', verifyMegaAdmin, async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('is_reseller', false)
      .is('parent_id', null)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, clients });
  } catch (error) {
    console.error('[MegaAdmin] Error fetching direct clients:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mega/direct-clients — Criar um novo cliente direto
router.post('/direct-clients', verifyMegaAdmin, async (req, res) => {
  try {
    const { name, slug, owner_name, owner_email, password, niche } = req.body;
    if (!name || !owner_email) {
      return res.status(400).json({ error: 'Nome e email são obrigatórios' });
    }

    const finalPassword =
      password || Math.random().toString(36).slice(-10) + 'A!';

    // Check slug uniqueness if provided
    let finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-');
    const { data: existingSlug } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();

    if (existingSlug) {
      return res.status(409).json({ error: 'Este slug já está em uso' });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([
        {
          name,
          slug: finalSlug,
          status: 'active',
          is_reseller: false,
          parent_id: null,
          niche: normalizeNiche(niche, name, finalSlug),
          owner_name: owner_name || null,
          owner_email: owner_email || null,
        },
      ])
      .select()
      .single();

    if (orgError) throw orgError;

    let authUser = await findAuthUserByEmail(
      String(owner_email).toLowerCase().trim()
    );

    if (!authUser) {
      const { data, error: createError } = await supabase.auth.admin.createUser(
        {
          email: String(owner_email).toLowerCase().trim(),
          password: finalPassword,
          email_confirm: true,
          user_metadata: {
            name: owner_name || name,
            role: 'admin',
          },
          app_metadata: {
            role: 'admin',
          },
        }
      );
      if (createError) throw createError;
      authUser = data.user;

      try {
        await sendWelcomeEmail({
          email: String(owner_email).toLowerCase().trim(),
          name: owner_name || name,
          password: finalPassword,
          organizationId: organization.id
        });
      } catch (err) {
        console.warn('[MegaAdmin] Erro enviando bem-vindo cliente direto:', err.message);
      }
    } else {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        {
          password: finalPassword,
          email_confirm: true,
          app_metadata: { ...(authUser.app_metadata || {}), role: 'admin' },
          user_metadata: {
            ...(authUser.user_metadata || {}),
            name: owner_name || name,
            role: 'admin',
          },
        }
      );
      if (updateError) throw updateError;
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: authUser.id,
        organization_id: org.id,
        name: owner_name || name,
        email: String(owner_email).toLowerCase().trim(),
        role: 'admin',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) throw profileError;

    res.json({
      success: true,
      client: org,
      owner_user_id: authUser.id,
      setup_password: finalPassword,
    });
  } catch (error) {
    console.error('[MegaAdmin] Error creating direct client:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mega/direct-clients/:id — Atualizar cliente direto
router.put('/direct-clients/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, owner_name, owner_email, status, niche } = req.body;

    const updatePayload = {};
    if (name) updatePayload.name = name;
    if (slug) updatePayload.slug = slug;
    if (status) updatePayload.status = status;
    if (niche) updatePayload.niche = normalizeNiche(niche, name, slug);
    if (owner_name !== undefined) updatePayload.owner_name = owner_name;
    if (owner_email !== undefined) updatePayload.owner_email = owner_email;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'Nada para atualizar' });
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', id)
      .eq('is_reseller', false)
      .is('parent_id', null)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Cliente não encontrado' });

    res.json({ success: true, client: data });
  } catch (error) {
    console.error('[MegaAdmin] Error updating direct client:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/mega/direct-clients/:id — Excluir cliente direto
router.delete('/direct-clients/:id', verifyMegaAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: org } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', id)
      .eq('is_reseller', false)
      .is('parent_id', null)
      .maybeSingle();

    if (!org) return res.status(404).json({ error: 'Cliente não encontrado' });

    const { error: deleteOrgError } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
    if (deleteOrgError) throw deleteOrgError;

    res.json({ success: true, message: 'Cliente excluído com sucesso' });
  } catch (error) {
    console.error('[MegaAdmin] Error deleting direct client:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mega/stats — Estatísticas da plataforma
router.get('/stats', verifyMegaAdmin, async (req, res) => {
  try {
    const [
      { count: totalResellers },
      { count: activeResellers },
      { count: totalTenants },
      { count: activeTenants },
    ] = await Promise.all([
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_reseller', true),
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_reseller', true)
        .eq('status', 'active'),
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_reseller', false),
      supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('is_reseller', false)
        .eq('status', 'active'),
    ]);

    res.json({
      success: true,
      stats: {
        totalResellers: totalResellers || 0,
        activeResellers: activeResellers || 0,
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
      },
    });
  } catch (error) {
    console.error('[MegaAdmin] Error fetching stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
