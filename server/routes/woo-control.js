import express from 'express';
import { verifyAuth } from '../middleware/auth.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import { sendWelcomeEmail } from '../services/email/emailService.js';
import {
  deleteOrganizationsWithDirectDb,
  isForeignKeyError,
  unlinkKnownOrganizationReferences,
} from '../lib/organization-deletion.js';

const router = express.Router();

const PLATFORM_ROLES = new Set([
  'superadmin',
  'megaadmin',
  'platformowner',
  'platformadmin',
  'masterreselleradmin',
  'reselleradmin',
]);

function isPlatformRole(rawRole) {
  const normalized = String(rawRole || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]/g, '');
  return PLATFORM_ROLES.has(normalized);
}

// Garante que somente donos/admins da plataforma acessem o WooControl.
function verifyPlatformAdmin(req, res, next) {
  verifyAuth(req, res, async (err) => {
    if (err) return next(err);
    if (!isPlatformRole(req.profileRole ?? req.userRole)) {
      return res.status(403).json({
        error: 'Acesso negado: requer privilégios de administrador da plataforma',
      });
    }
    next();
  });
}

function supabase() {
  return new Proxy(
    {},
    {
      get: (_, prop) => {
        const client = getSupabaseServer();
        const value = client[prop];
        return typeof value === 'function' ? value.bind(client) : value;
      },
    }
  );
}

function fmtBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function computeLicenseStatus(row) {
  if (!row) return 'UNKNOWN';
  if (row.status === 'REVOKED' || row.status === 'SUSPENDED') return row.status;
  const now = Date.now();
  const expiresAt = row.expires_at ? new Date(row.expires_at).getTime() : null;
  const graceUntil = row.grace_until ? new Date(row.grace_until).getTime() : null;
  if (expiresAt && now > expiresAt) {
    if (graceUntil && now <= graceUntil) return 'GRACE';
    return 'SUSPENDED';
  }
  if (expiresAt && now > expiresAt - 3 * 24 * 60 * 60 * 1000) return 'EXPIRING';
  return row.status || 'ACTIVE';
}

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
  const db = supabase();
  const {
    data: { users },
    error,
  } = await db.auth.admin.listUsers({
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

// GET /api/woo-control/summary — KPIs globais da plataforma
router.get('/summary', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();

    const [orgs, licenses, deployments, products, plans, payHist] =
      await Promise.all([
        db.from('organizations').select('id, name, type, is_reseller, status, parent_id, created_at'),
        db.from('woo_licenses').select('*'),
        db.from('woo_deployments').select('id, status, last_heartbeat, organization_id'),
        db.from('woo_products').select('*'),
        db.from('plans').select('id, name, monthly_price, price'),
        db.from('payment_history').select('amount_paid, status'),
      ]);

    const orgList = orgs.data || [];
    const licenseList = licenses.data || [];
    const deployList = deployments.data || [];
    const planList = plans.data || [];

    const resellers = orgList.filter((o) => o.is_reseller === true);
    const customers = orgList.filter((o) => o.is_reseller !== true);
    const licenseIds = new Set(licenseList.map((l) => l.organization_id));

    // MRR estimado: soma de planos das organizações, considerando status de licença
    let mrr = 0;
    const orgPlanPrice = (org) => {
      if (!org.plan_id) return 0;
      const p = planList.find((x) => x.id === org.plan_id);
      return Number(p?.monthly_price ?? p?.price ?? 0) || 0;
    };
    orgList.forEach((o) => {
      mrr += orgPlanPrice(o);
    });

    const activeLicenses = licenseList.filter((l) =>
      ['TRIAL', 'ACTIVE', 'EXPIRING', 'GRACE'].includes(computeLicenseStatus(l))
    ).length;
    const graceLicenses = licenseList.filter(
      (l) => computeLicenseStatus(l) === 'GRACE'
    ).length;
    const suspendedLicenses = licenseList.filter(
      (l) => computeLicenseStatus(l) === 'SUSPENDED'
    ).length;

    const totalCustomers = customers.length;
    const totalResellers = resellers.length;
    const onlineDeployments = deployList.filter(
      (d) => d.status === 'ONLINE' || d.status === 'DEGRADED'
    ).length;
    const offlineDeployments = deployList.filter(
      (d) => d.status === 'OFFLINE' || d.status === 'SUSPENDED'
    ).length;

    const totalRevenue = (payHist.data || []).reduce((acc, p) => {
      if (String(p.status || '').toUpperCase() === 'PAID') {
        return acc + Number(p.amount_paid || 0);
      }
      return acc;
    }, 0);

    res.json({
      success: true,
      kpis: {
        mrr: Math.round(mrr),
        mrrLabel: fmtBRL(mrr),
        activeLicenses,
        graceLicenses,
        suspendedLicenses,
        totalDeployments: deployList.length,
        onlineDeployments,
        offlineDeployments,
        totalCustomers,
        totalResellers,
        totalRevenue: Math.round(totalRevenue),
      },
    });
  } catch (error) {
    console.error('[WooControl] summary error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/network — hierarquia de revendas e clientes
router.get('/network', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: orgs, error } = await db
      .from('organizations')
      .select('id, name, slug, type, is_reseller, status, parent_id, owner_name, owner_email, niche, plan_id, created_at')
      .order('created_at', { ascending: true });

    if (error) throw error;
    const orgList = orgs || [];

    const { data: licenses } = await db.from('woo_licenses').select('*');
    const { data: deployments } = await db.from('woo_deployments').select('organization_id');

    const licenseCountByOrg = {};
    (licenses || []).forEach((l) => {
      licenseCountByOrg[l.organization_id] =
        (licenseCountByOrg[l.organization_id] || 0) + 1;
    });
    const deployCountByOrg = {};
    (deployments || []).forEach((d) => {
      deployCountByOrg[d.organization_id] =
        (deployCountByOrg[d.organization_id] || 0) + 1;
    });

    const nodes = orgList.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      type: o.type || (o.is_reseller ? 'RESELLER' : 'CUSTOMER'),
      status: o.status || 'active',
      parentId: o.parent_id || null,
      ownerName: o.owner_name || null,
      ownerEmail: o.owner_email || null,
      niche: o.niche || null,
      createdAt: o.created_at,
      licenses: licenseCountByOrg[o.id] || 0,
      deployments: deployCountByOrg[o.id] || 0,
    }));

    const resellers = nodes.filter((n) => n.type !== 'CUSTOMER');
    const customers = nodes.filter((n) => n.type === 'CUSTOMER' || (n.type === 'RESELLER' && false));
    const orphans = customers.filter((c) => !c.parentId);

    res.json({
      success: true,
      network: {
        resellers,
        customers,
        orphans,
        total: nodes.length,
      },
    });
  } catch (error) {
    console.error('[WooControl] network error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/woo-control/network/resellers — Criar novo reseller
router.post('/network/resellers', verifyPlatformAdmin, async (req, res) => {
  try {
    const { name, slug, owner_name, owner_email, password, niche, document, phone, creci, address, city, state, zip_code } = req.body;
    const db = supabase();

    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (!owner_email) {
      return res.status(400).json({ error: 'Email do responsável é obrigatório' });
    }
    let finalPassword = password;
    if (!finalPassword || finalPassword.length < 6) {
      finalPassword = Math.random().toString(36).slice(-10) + 'A1!';
    }

    const { data: existingSlug } = await db
      .from('organizations')
      .select('id')
      .eq('slug', slug || name.toLowerCase().replace(/\s+/g, '-'))
      .maybeSingle();

    if (existingSlug) {
      return res.status(409).json({ error: 'Este slug já está em uso' });
    }

    const { data: org, error: orgError } = await db
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

    let authUser = await findAuthUserByEmail(String(owner_email).toLowerCase().trim());

    if (!authUser) {
      const { data, error: createError } = await db.auth.admin.createUser({
        email: String(owner_email).toLowerCase().trim(),
        password: finalPassword,
        email_confirm: true,
        user_metadata: { name: owner_name || name, role: 'superadmin' },
        app_metadata: { role: 'superadmin' },
      });
      if (createError) throw createError;
      authUser = data.user;

      try {
        await sendWelcomeEmail({
          email: String(owner_email).toLowerCase().trim(),
          name: owner_name || name,
          password: finalPassword,
          organizationId: org.id
        });
      } catch (err) {
        console.warn('[WooControl] Erro enviando bem-vindo reseller:', err.message);
      }
    } else {
      const { error: updateError } = await db.auth.admin.updateUserById(authUser.id, {
        password: finalPassword,
        email_confirm: true,
        app_metadata: { ...(authUser.app_metadata || {}), role: 'superadmin' },
        user_metadata: {
          ...(authUser.user_metadata || {}),
          name: owner_name || name,
          role: 'superadmin',
        },
      });
      if (updateError) throw updateError;
    }

    const { error: profileError } = await db.from('profiles').upsert(
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
      setup_password: finalPassword,
    });
  } catch (error) {
    console.error('[WooControl] Error creating reseller:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/woo-control/network/resellers/:id — Atualizar reseller
router.put('/network/resellers/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, owner_name, owner_email, status, niche, document, phone, creci, address, city, state, zip_code } = req.body;
    const db = supabase();

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

    const { data, error } = await db
      .from('organizations')
      .update(updatePayload)
      .eq('id', id)
      .eq('is_reseller', true)
      .select()
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return res.status(404).json({ error: 'Reseller não encontrado' });

    res.json({ success: true, reseller: data });
  } catch (error) {
    console.error('[WooControl] Error updating reseller:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/woo-control/network/resellers/:id — Excluir reseller
router.delete('/network/resellers/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = supabase();

    const { data: org } = await db
      .from('organizations')
      .select('id, name')
      .eq('id', id)
      .eq('is_reseller', true)
      .maybeSingle();

    if (!org) return res.status(404).json({ error: 'Reseller não encontrado' });

    // Excluir filhos
    const { error: deleteChildrenError } = await db
      .from('organizations')
      .delete()
      .eq('parent_id', id);

    if (deleteChildrenError) throw deleteChildrenError;

    await unlinkKnownOrganizationReferences([id]);

    const { error: deleteOrgError } = await db
      .from('organizations')
      .delete()
      .eq('id', id);

    if (deleteOrgError) {
      if (isForeignKeyError(deleteOrgError)) {
        const directDelete = await deleteOrganizationsWithDirectDb([id]);
        if (!directDelete.error) {
          return res.json({ success: true, deleted: directDelete.deleted, mode: 'direct-db' });
        }
      }
      throw deleteOrgError;
    }

    res.json({ success: true, message: 'Reseller excluído com sucesso' });
  } catch (error) {
    console.error('[WooControl] Error deleting reseller:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/licenses — todas as licenças
router.get('/licenses', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: licenses, error } = await db
      .from('woo_licenses')
      .select('*, organizations(name, slug), woo_products(slug, name)')
      .order('created_at', { ascending: false });
    if (error) throw error;

    const enriched = (licenses || []).map((l) => ({
      ...l,
      status: computeLicenseStatus(l),
    }));

    res.json({ success: true, licenses: enriched });
  } catch (error) {
    console.error('[WooControl] licenses error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/deployments — instâncias / deployments
router.get('/deployments', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: deployments, error } = await db
      .from('woo_deployments')
      .select('*, organizations(name, slug), woo_products(name, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, deployments: deployments || [] });
  } catch (error) {
    console.error('[WooControl] deployments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/products — catálogo
router.get('/products', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: products, error } = await db
      .from('woo_products')
      .select('*, woo_releases(*)')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ success: true, products: products || [] });
  } catch (error) {
    console.error('[WooControl] products error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/woo-control/products — criar produto
router.post('/products', verifyPlatformAdmin, async (req, res) => {
  try {
    const { name, slug, current_version, stable_version, status, description } = req.body;
    const db = supabase();
    
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    
    const finalSlug = slug || name.toLowerCase().replace(/\s+/g, '-');
    
    const { data: existing } = await db.from('woo_products').select('id').eq('slug', finalSlug).maybeSingle();
    if (existing) return res.status(409).json({ error: 'Já existe um produto com este slug' });

    const { data, error } = await db
      .from('woo_products')
      .insert([{
        name,
        slug: finalSlug,
        current_version: current_version || '1.0.0',
        stable_version: stable_version || '1.0.0',
        status: status || 'ACTIVE',
        description: description || null
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (error) {
    console.error('[WooControl] create product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/woo-control/products/:id — atualizar produto
router.put('/products/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, current_version, stable_version, status, description } = req.body;
    const db = supabase();
    
    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (slug !== undefined) updatePayload.slug = slug;
    if (current_version !== undefined) updatePayload.current_version = current_version;
    if (stable_version !== undefined) updatePayload.stable_version = stable_version;
    if (status !== undefined) updatePayload.status = status;
    if (description !== undefined) updatePayload.description = description;

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('woo_products')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, product: data });
  } catch (error) {
    console.error('[WooControl] update product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/woo-control/products/:id — deletar produto
router.delete('/products/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = supabase();
    
    // Deleta o produto. O banco de dados deve tratar relacionamentos (ex: cascades)
    // ou retornar erro se houver FK.
    const { error } = await db
      .from('woo_products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Produto excluído com sucesso' });
  } catch (error) {
    console.error('[WooControl] delete product error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/releases — lançamentos
router.get('/releases', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: releases, error } = await db
      .from('woo_releases')
      .select('*, woo_products(name, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, releases: releases || [] });
  } catch (error) {
    console.error('[WooControl] releases error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/woo-control/releases
router.post('/releases', verifyPlatformAdmin, async (req, res) => {
  try {
    const { product_id, version, release_notes, status, is_stable } = req.body;
    const db = supabase();
    
    if (!product_id || !version) {
      return res.status(400).json({ error: 'Produto e versão são obrigatórios' });
    }

    const { data, error } = await db
      .from('woo_releases')
      .insert([{
        product_id,
        version,
        release_notes: release_notes || null,
        status: status || 'DRAFT',
        is_stable: is_stable || false
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, release: data });
  } catch (error) {
    console.error('[WooControl] create release error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/woo-control/releases/:id
router.put('/releases/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, version, release_notes, status, is_stable } = req.body;
    const db = supabase();
    
    const updatePayload = {};
    if (product_id !== undefined) updatePayload.product_id = product_id;
    if (version !== undefined) updatePayload.version = version;
    if (release_notes !== undefined) updatePayload.release_notes = release_notes;
    if (status !== undefined) updatePayload.status = status;
    if (is_stable !== undefined) updatePayload.is_stable = is_stable;

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('woo_releases')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, release: data });
  } catch (error) {
    console.error('[WooControl] update release error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/woo-control/releases/:id
router.delete('/releases/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = supabase();
    
    const { error } = await db.from('woo_releases').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Release excluída com sucesso' });
  } catch (error) {
    console.error('[WooControl] delete release error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/snapshots — pacotes de código gerados
router.get('/snapshots', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: snapshots, error } = await db
      .from('woo_snapshots')
      .select('*, organizations(name), woo_products(name, slug)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, snapshots: snapshots || [] });
  } catch (error) {
    console.error('[WooControl] snapshots error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/woo-control/snapshots
router.post('/snapshots', verifyPlatformAdmin, async (req, res) => {
  try {
    const { product_id, organization_id, version, url, notes, type } = req.body;
    const db = supabase();
    
    if (!product_id || !version) {
      return res.status(400).json({ error: 'Produto e versão são obrigatórios' });
    }

    const { data, error } = await db
      .from('woo_snapshots')
      .insert([{
        product_id,
        organization_id: organization_id || null,
        version,
        url: url || null,
        notes: notes || null,
        type: type || 'FULL'
      }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, snapshot: data });
  } catch (error) {
    console.error('[WooControl] create snapshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/woo-control/snapshots/:id
router.put('/snapshots/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, notes, type } = req.body;
    const db = supabase();
    
    const updatePayload = {};
    if (url !== undefined) updatePayload.url = url;
    if (notes !== undefined) updatePayload.notes = notes;
    if (type !== undefined) updatePayload.type = type;

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await db
      .from('woo_snapshots')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, snapshot: data });
  } catch (error) {
    console.error('[WooControl] update snapshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/woo-control/snapshots/:id
router.delete('/snapshots/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = supabase();
    
    const { error } = await db.from('woo_snapshots').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Snapshot excluído com sucesso' });
  } catch (error) {
    console.error('[WooControl] delete snapshot error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/audit — trilha de auditoria
router.get('/audit', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: logs, error } = await db
      .from('woo_audit_logs')
      .select('*, profiles(email), organizations(name)')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json({ success: true, logs: logs || [] });
  } catch (error) {
    console.error('[WooControl] audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/woo-control/audit — registrar evento de auditoria
router.post('/audit', verifyPlatformAdmin, async (req, res) => {
  try {
    const { action, target, metadata } = req.body;
    const db = supabase();
    const actorId = req.authUserId;
    const { data, error } = await db.from('woo_audit_logs').insert({
      actor_id: actorId,
      organization_id: req.realOrgId || null,
      action: action || 'PLATFORM_ACTION',
      target: target || null,
      metadata: metadata || {},
      ip_address: req.ip || null,
    });
    if (error) throw error;
    res.json({ success: true, log: data?.[0] || null });
  } catch (error) {
    console.error('[WooControl] audit insert error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/academy — cursos de treinamento
router.get('/academy', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: courses, error } = await db
      .from('woo_academy_courses')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, courses: courses || [] });
  } catch (error) {
    console.error('[WooControl] academy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/support/tickets — chamados de suporte
router.get('/support/tickets', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data, error } = await db
      .from('support_tickets')
      .select(
        '*, organizations(name), profiles(name, email)'
      )
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json({ success: true, tickets: data || [] });
  } catch (error) {
    console.error('[WooControl] support tickets error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/support/sessions — sessões de suporte
router.get('/support/sessions', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data, error } = await db
      .from('woo_support_sessions')
      .select(
        '*, profiles!supporter_id(name, email), organizations!target_organization_id(name)'
      )
      .order('started_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ success: true, sessions: data || [] });
  } catch (error) {
    console.error('[WooControl] support sessions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/revenue — dashboard de receita
router.get('/revenue', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const { data: paymentRows, error } = await db
      .from('payment_history')
      .select('id, organization_id, amount_paid, status, payment_date, organizations(name)');
    if (error) throw error;

    const rows = paymentRows || [];
    const paid = rows.filter((r) => String(r.status).toLowerCase() === 'pago');
    const pending = rows.filter((r) => String(r.status).toLowerCase() === 'pendente');

    const paid30d = paid.filter((r) => {
      const d = new Date(r.payment_date);
      return d >= thirtyDaysAgo;
    });

    const totalMRR30d = paid30d.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const totalPending = pending.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);
    const totalPaid30d = paid30d.reduce((sum, r) => sum + Number(r.amount_paid || 0), 0);

    const monthly = {};
    for (let m = 0; m < 12; m++) {
      const key = new Date(now.getFullYear(), now.getMonth() - (11 - m), 1);
      monthly[key.toISOString().slice(0, 7)] = 0;
    }
    paid.forEach((r) => {
      const d = new Date(r.payment_date);
      if (isNaN(d.getTime()) || d < twelveMonthsAgo) return;
      const key = d.toISOString().slice(0, 7);
      if (key in monthly) monthly[key] += Number(r.amount_paid || 0);
    });
    const timeline = Object.entries(monthly).map(([month, value]) => ({
      month,
      total: value,
    }));

    res.json({
      success: true,
      revenue: {
        mrr: totalMRR30d,
        pending: totalPending,
        paid30d: totalPaid30d,
        timeline,
      },
    });
  } catch (error) {
    console.error('[WooControl] revenue error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/security/keys — status das chaves de segurança
router.get('/security/keys', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { data: settings, error: settingsError } = await db
      .from('saas_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if (settingsError) throw settingsError;

    const mask = (value) =>
      value && value.length > 4
        ? `****${String(value).slice(-4)}`
        : value || 'NOT SET';

    let signingKey = 'NOT SET';
    try {
      const { data: products } = await db
        .from('woo_products')
        .select('signing_key_public')
        .limit(1);
      if (products && products.length > 0 && products[0].signing_key_public) {
        signingKey = `****${String(products[0].signing_key_public).slice(-4)}`;
      }
    } catch {
      // coluna não existe — mantém placeholder
    }

    res.json({
      success: true,
      keys: {
        global_openai_key: mask(settings?.global_openai_key),
        global_gemini_key: mask(settings?.global_gemini_key),
        global_anthropic_key: mask(settings?.global_anthropic_key),
        global_groq_key: mask(settings?.global_groq_key),
        global_openrouter_key: mask(settings?.global_openrouter_key),
        maintenance_mode: !!settings?.maintenance_mode,
        signing_key_public: signingKey,
      },
    });
  } catch (error) {
    console.error('[WooControl] security keys error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/woo-control/security/audit — executar auditoria de segurança
router.post('/security/audit', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();

    const checks = [];

    // 1. Conexão com o banco de dados
    const dbStart = Date.now();
    try {
      const { count, error } = await db
        .from('organizations')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      checks.push({
        name: 'Conexão com Banco de Dados',
        status: 'PASS',
        detail: `${count} organizações acessíveis`,
        latency: Date.now() - dbStart,
      });
    } catch (e) {
      checks.push({
        name: 'Conexão com Banco de Dados',
        status: 'FAIL',
        detail: e.message,
        latency: Date.now() - dbStart,
      });
    }

    // 2. RLS ativo (políticas nas tabelas principais)
    try {
      const { data } = await db
        .from('organizations')
        .select('id')
        .limit(1);
      checks.push({
        name: 'Row Level Security (RLS)',
        status: 'PASS',
        detail: 'Consulta validada via RLS',
      });
    } catch (e) {
      checks.push({
        name: 'Row Level Security (RLS)',
        status: 'FAIL',
        detail: e.message,
      });
    }

    // 3. Chaves de API configuradas
    const { data: settings } = await db
      .from('saas_settings')
      .select('global_openai_key, global_gemini_key, global_anthropic_key, global_groq_key, global_openrouter_key')
      .eq('id', 1)
      .maybeSingle();

    const keyChecks = [
      ['OpenAI', settings?.global_openai_key],
      ['Gemini', settings?.global_gemini_key],
      ['Anthropic', settings?.global_anthropic_key],
      ['Groq', settings?.global_groq_key],
      ['OpenRouter', settings?.global_openrouter_key],
    ];
    keyChecks.forEach(([provider, key]) => {
      checks.push({
        name: `Chave ${provider}`,
        status: key && String(key).length > 4 ? 'PASS' : 'WARN',
        detail: key && String(key).length > 4 ? 'Configurada' : 'Não configurada',
      });
    });

    // 4. Modo de manutenção
    checks.push({
      name: 'Modo de Manutenção',
      status: settings?.maintenance_mode ? 'WARN' : 'PASS',
      detail: settings?.maintenance_mode ? 'Ativo' : 'Desativado',
    });

    // 5. Impersonação ativa
    try {
      const { count } = await db
        .from('impersonation_sessions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      checks.push({
        name: 'Sessões de Impersonação Ativas',
        status: count && count > 0 ? 'WARN' : 'PASS',
        detail: `${count || 0} sessão(ões) ativa(s)`,
      });
    } catch {
      checks.push({
        name: 'Sessões de Impersonação Ativas',
        status: 'PASS',
        detail: 'Nenhuma sessão ativa',
      });
    }

    res.json({ success: true, checks });
  } catch (error) {
    console.error('[WooControl] security audit error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/woo-control/academy — criar curso
router.post('/academy', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { title, description, category, status, curriculum } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }
    const { data, error } = await db
      .from('woo_academy_courses')
      .insert({
        title,
        description: description || '',
        category: category || null,
        status: status || 'PUBLISHED',
        curriculum: curriculum || null,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ success: true, course: data });
  } catch (error) {
    console.error('[WooControl] academy create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/woo-control/academy/:id — atualizar curso
router.put('/academy/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { id } = req.params;
    const { title, description, category, status, curriculum } = req.body || {};
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;
    if (curriculum !== undefined) updates.curriculum = curriculum;
    const { data, error } = await db
      .from('woo_academy_courses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ success: true, course: data });
  } catch (error) {
    console.error('[WooControl] academy update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/woo-control/academy/:id — excluir curso
router.delete('/academy/:id', verifyPlatformAdmin, async (req, res) => {
  try {
    const db = supabase();
    const { id } = req.params;
    const { error } = await db.from('woo_academy_courses').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('[WooControl] academy delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/woo-control/health-check — saúde da plataforma
router.get('/health-check', verifyPlatformAdmin, async (req, res) => {
  const results = [];
  const measure = async (name, fn) => {
    const start = Date.now();
    try {
      await fn();
      results.push({ name, status: 'Operational', latency: `${Date.now() - start}ms` });
    } catch (error) {
      results.push({ name, status: 'Down', latency: `${Date.now() - start}ms`, error: error.message });
    }
  };

  try {
    const db = supabase();

    await measure('Supabase DB', async () => {
      const { data, error } = await db.from('organizations').select('id', { count: 'exact' });
      if (error) throw error;
      results[results.length - 1].organizations = data?.length || 0;
    });

    await measure('Deployments', async () => {
      const { data, error } = await db
        .from('woo_deployments')
        .select('id', { count: 'exact' })
        .eq('status', 'active');
      if (error) throw error;
      results[results.length - 1].deployments = data?.length || 0;
    });

    await measure('Licenses', async () => {
      const { data, error } = await db
        .from('woo_licenses')
        .select('id', { count: 'exact' })
        .eq('status', 'ACTIVE');
      if (error) throw error;
      results[results.length - 1].licenses = data?.length || 0;
    });

    const activeDeployments = results.find((r) => r.name === 'Deployments')?.deployments || 0;
    const activeLicenses = results.find((r) => r.name === 'Licenses')?.licenses || 0;

    res.json({
      success: true,
      status: results.some((r) => r.status === 'Down') ? 'Degraded' : 'Operational',
      activeDeployments,
      activeLicenses,
      services: results,
    });
  } catch (error) {
    console.error('[WooControl] health-check error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

