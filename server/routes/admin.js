import express from 'express';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { verifySuperAdmin, verifyAdmin, verifyAuth, clearProfileCache } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { getSupabaseServer } from '../lib/supabase-server.js';
import {
  applyLifecycle,
  deleteDuplicates,
  deleteExpired,
  deleteOrphans,
  getByExtension,
  getByPrefix,
  getByTenant,
  getLargestFiles,
  getLifecycle,
  getStorageBuckets,
  getStorageConfig,
  getStorageDuplicates,
  getStorageFiles,
  getStorageLogs,
  getStorageOrphans,
  getStorageSummary,
  runStorageScan,
  saveStorageConfig,
  signStorageObject,
  simulateCleanup,
  suspendVersioning,
} from '../services/storageIntelligenceService.js';
import {
  assertValidDomain,
  DomainProvisioningError,
  ensureDockerDomainConfig,
  normalizeDomain,
  removeDockerDomain,
} from '../domainService.js';

const router = express.Router();
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Proxy lazy: delega transparentemente para getSupabaseServer() na 1ª chamada
// Isso permite usar supabase.from(), supabase.auth, etc. sem mudar o resto do código.
const supabase = new Proxy({}, {
  get: (_, prop) => {
    const client = getSupabaseServer();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

const storageHandler = (fn) => async (req, res) => {
  try {
    const result = await fn(req);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[Storage Intelligence]', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

function normalizeNiche(niche, ...signals) {
  const normalized = String(niche || '').toLowerCase().trim();
  if (normalized === 'rural') return 'rural';
  if (['traditional', 'urban', 'urbano'].includes(normalized)) return 'traditional';

  const text = signals.filter(Boolean).join(' ').toLowerCase();
  return /\b(rural|fazenda|fazendas|sitio|sítio|chacara|chácara|agro|haras)\b/.test(text)
    ? 'rural'
    : 'traditional';
}

function normalizeOptionalCustomDomain(value) {
  const normalized = normalizeDomain(value || '');
  return normalized ? assertValidDomain(normalized) : null;
}

async function assertCustomDomainAvailable(domain, organizationId = null) {
  if (!domain) return;

  const { data: existingOrg, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('custom_domain', domain)
    .maybeSingle();

  if (orgError) throw orgError;
  if (existingOrg && existingOrg.id !== organizationId) {
    throw new DomainProvisioningError(
      'DOMAIN_ALREADY_EXISTS',
      'Este dominio ja esta vinculado a outra organizacao.',
      409,
      { organizationId: existingOrg.id, organizationName: existingOrg.name }
    );
  }

  const { data: existingDomain, error: domainError } = await supabase
    .from('domains')
    .select('organization_id, domain')
    .eq('domain', domain)
    .maybeSingle();

  if (domainError) throw domainError;
  if (existingDomain && existingDomain.organization_id !== organizationId) {
    throw new DomainProvisioningError(
      'DOMAIN_ALREADY_EXISTS',
      'Este dominio ja esta cadastrado no Imobzy.',
      409,
      { organizationId: existingDomain.organization_id }
    );
  }
}

async function upsertDomainTracking({ organizationId, domain, status = 'pending_ssl' }) {
  try {
    const { error } = await supabase.from('domains').upsert({
      organization_id: organizationId,
      domain,
      is_custom: true,
      is_primary: true,
      status,
      ssl_status: status === 'active' ? 'active' : 'pending',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'domain',
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.warn('[Admin] Domain tracking upsert failed:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function removePreviousCustomDomain({ organizationId, previousDomain }) {
  const normalizedPrevious = previousDomain ? normalizeDomain(previousDomain) : null;
  if (!normalizedPrevious) return null;

  try {
    await removeDockerDomain(normalizedPrevious);
  } catch (error) {
    console.warn(`[Admin] Failed to remove Traefik config for ${normalizedPrevious}:`, error.message);
  }

  const { error } = await supabase
    .from('domains')
    .delete()
    .eq('domain', normalizedPrevious)
    .eq('organization_id', organizationId);

  if (error) {
    console.warn(`[Admin] Failed to remove domain tracking for ${normalizedPrevious}:`, error.message);
  }

  return {
    success: true,
    domain: normalizedPrevious,
  };
}

async function syncOrganizationCustomDomain({ organizationId, nextDomain, previousDomain = null }) {
  const normalizedNext = nextDomain ? assertValidDomain(nextDomain) : null;
  const normalizedPrevious = previousDomain ? normalizeDomain(previousDomain) : null;

  if (!normalizedNext) {
    return {
      action: normalizedPrevious ? 'removed' : 'none',
      removed: await removePreviousCustomDomain({ organizationId, previousDomain: normalizedPrevious }),
    };
  }

  const provisioning = await ensureDockerDomainConfig(normalizedNext);
  const tracking = await upsertDomainTracking({
    organizationId,
    domain: normalizedNext,
    status: 'pending_ssl',
  });

  let removed = null;
  if (normalizedPrevious && normalizedPrevious !== normalizedNext) {
    removed = await removePreviousCustomDomain({ organizationId, previousDomain: normalizedPrevious });
  }

  return {
    action: normalizedPrevious === normalizedNext ? 'ensured' : 'provisioned',
    domain: normalizedNext,
    provisioning,
    tracking,
    removed,
  };
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

// --- Storage Intelligence / MinIO Auditor ---

router.get('/storage/summary', verifySuperAdmin, storageHandler(async () => ({
  summary: await getStorageSummary(),
})));

router.get('/storage/config', verifySuperAdmin, storageHandler(async () => (
  await getStorageConfig()
)));

router.put('/storage/config', verifySuperAdmin, storageHandler(async (req) => (
  await saveStorageConfig(req.user?.id, req.body || {})
)));

router.get('/storage/buckets', verifySuperAdmin, storageHandler(async () => ({
  buckets: await getStorageBuckets(),
})));

router.get('/storage/files', verifySuperAdmin, storageHandler(async (req) => (
  await getStorageFiles(req.query)
)));

router.get('/storage/largest-files', verifySuperAdmin, storageHandler(async (req) => ({
  files: await getLargestFiles(req.query.limit),
})));

router.get('/storage/by-extension', verifySuperAdmin, storageHandler(async () => ({
  items: await getByExtension(),
})));

router.get('/storage/by-prefix', verifySuperAdmin, storageHandler(async () => ({
  items: await getByPrefix(),
})));

router.get('/storage/by-tenant', verifySuperAdmin, storageHandler(async () => ({
  tenants: await getByTenant(),
})));

router.get('/storage/duplicates', verifySuperAdmin, storageHandler(async () => ({
  duplicates: await getStorageDuplicates(),
})));

router.get('/storage/orphans', verifySuperAdmin, storageHandler(async () => ({
  orphans: await getStorageOrphans(),
})));

router.get('/storage/lifecycle', verifySuperAdmin, storageHandler(async () => ({
  lifecycle: await getLifecycle(),
})));

router.get('/storage/logs', verifySuperAdmin, storageHandler(async (req) => ({
  logs: await getStorageLogs(req.query.limit),
})));

router.post('/storage/signed-url', verifySuperAdmin, storageHandler(async (req) => ({
  signed: await signStorageObject(req.body.bucket, req.body.object_key, req.body.expiresInSeconds),
})));

router.post('/storage/scan', verifySuperAdmin, storageHandler(async (req) => ({
  scan: await runStorageScan(req.user?.id),
})));

router.post('/storage/suspend-versioning', verifySuperAdmin, storageHandler(async (req) => ({
  result: await suspendVersioning(req.user?.id, req.body.confirmation, req.body.bucket),
})));

router.post('/storage/apply-lifecycle', verifySuperAdmin, storageHandler(async (req) => ({
  result: await applyLifecycle(req.user?.id, req.body.bucket),
})));

router.post('/storage/simulate-cleanup', verifySuperAdmin, storageHandler(async (req) => ({
  simulation: await simulateCleanup(req.body || {}),
})));

router.post('/storage/delete-expired', verifySuperAdmin, storageHandler(async (req) => (
  await deleteExpired(req.user?.id, req.body || {})
)));

router.post('/storage/delete-orphans', verifySuperAdmin, storageHandler(async (req) => (
  await deleteOrphans(req.user?.id, req.body || {})
)));

router.post('/storage/delete-duplicates', verifySuperAdmin, storageHandler(async (req) => (
  await deleteDuplicates(req.user?.id, req.body || {})
)));

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
    console.log(`[Admin] 🏢 Fetching organizations for superadmin: ${req.user?.email}`);
    const { data, error } = await queryOrganizations(supabase);
    
    if (error) {
      console.error('[Admin] ❌ Error fetching organizations from Supabase:', error);
      if (isInvalidSupabaseApiKeyError(error)) {
        const userTokenFallback = await queryOrganizationsWithUserToken(req);
        if (!userTokenFallback.error) {
          return res.json({ success: true, organizations: userTokenFallback.data || [] });
        }
        console.error('[Admin] ❌ User-token fallback also failed:', userTokenFallback.error);

        const directDbFallback = await queryOrganizationsWithDirectDb();
        if (!directDbFallback.error) {
          return res.json({ success: true, organizations: directDbFallback.data || [] });
        }
        console.error('[Admin] ❌ Direct DB fallback also failed:', directDbFallback.error);
      }
      if (isInvalidSupabaseApiKeyError(error)) {
        return sendSupabaseServiceKeyError(res, { primaryError: error });
      }
      throw error;
    }
    
    res.json({ success: true, organizations: data || [] });
  } catch (error) {
    console.error('[Admin] ❌ Internal Error in /organizations:', error);
    const message = error?.message || error?.description || 'Erro interno ao listar organizações';
    if (isInvalidSupabaseApiKeyError(error)) {
      return sendSupabaseServiceKeyError(res, { primaryError: error });
    }
    res.status(500).json({ error: message });
  }
});

router.post('/organizations', verifySuperAdmin, async (req, res) => {
  try {
    const { name, slug, plan_id, status, custom_domain, niche, owner_name, owner_email, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome é obrigatório' });
    if (owner_email && (!password || password.length < 6)) {
      return res.status(400).json({ error: 'Senha de acesso deve ter no minimo 6 caracteres' });
    }

    const normalizedCustomDomain = normalizeOptionalCustomDomain(custom_domain);
    await assertCustomDomainAvailable(normalizedCustomDomain);
    
    const payload = { 
      name, 
      slug: slug || null, 
      status: status || 'active',
      custom_domain: normalizedCustomDomain,
      niche: normalizeNiche(niche, name, slug, normalizedCustomDomain, owner_email),
      owner_name: owner_name || null,
      owner_email: owner_email || null
    };
    if (plan_id) {
      payload.plan_id = plan_id;
      payload.subscription_status = 'active';
      payload.selected_plan_at = new Date().toISOString();
    }
    
    const { data, error } = await supabase
      .from('organizations')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;

    const domainProvisioning = normalizedCustomDomain
      ? await syncOrganizationCustomDomain({
          organizationId: data.id,
          nextDomain: normalizedCustomDomain,
        })
      : null;

    const ownerUser = await ensureOrganizationOwner({
      organization: data,
      ownerName: owner_name,
      ownerEmail: owner_email,
      password,
    });

    res.json({
      success: true,
      organization: data,
      owner_user_id: ownerUser?.id || null,
      domainProvisioning,
    });
  } catch (error) {
    const status = error instanceof DomainProvisioningError ? error.statusCode : 500;
    res.status(status).json({
      error: error.message,
      code: error.code || 'ORGANIZATION_CREATE_FAILED',
      details: error.details,
    });
  }
});

router.put('/organizations/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, plan_id, status, custom_domain, owner_name, owner_email, password, niche } = req.body;
    let previousOrganization = null;
    let normalizedCustomDomain;

    if (custom_domain !== undefined) {
      const { data: existingOrganization, error: existingError } = await supabase
        .from('organizations')
        .select('id, custom_domain')
        .eq('id', id)
        .maybeSingle();

      if (existingError) throw existingError;
      if (!existingOrganization) {
        return res.status(404).json({ error: 'Imobiliaria nao encontrada' });
      }

      previousOrganization = existingOrganization;
      normalizedCustomDomain = normalizeOptionalCustomDomain(custom_domain);
      await assertCustomDomainAvailable(normalizedCustomDomain, id);
    }
    
    const payload = {};
    if (name !== undefined) payload.name = name;
    if (slug !== undefined) payload.slug = slug;
    if (status !== undefined) payload.status = status;
    if (plan_id !== undefined) {
      payload.plan_id = plan_id || null;
      if (plan_id) {
        payload.subscription_status = 'active';
        payload.selected_plan_at = new Date().toISOString();
      }
    }
    if (custom_domain !== undefined) payload.custom_domain = normalizedCustomDomain;
    if (niche !== undefined) payload.niche = normalizeNiche(niche, name, slug, normalizedCustomDomain ?? custom_domain, owner_email);
    if (owner_name !== undefined) payload.owner_name = owner_name;
    if (owner_email !== undefined) payload.owner_email = owner_email;
    
    const { data: organization, error: updateError } = await supabase
      .from('organizations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const domainProvisioning = custom_domain !== undefined
      ? await syncOrganizationCustomDomain({
          organizationId: id,
          nextDomain: normalizedCustomDomain,
          previousDomain: previousOrganization?.custom_domain,
        })
      : null;

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

    res.json({ success: true, organization, domainProvisioning });
  } catch (error) {
    const status = error instanceof DomainProvisioningError ? error.statusCode : 500;
    res.status(status).json({
      error: error.message,
      code: error.code || 'ORGANIZATION_UPDATE_FAILED',
      details: error.details,
    });
  }
});

router.post('/organizations/bulk-delete', verifySuperAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? [...new Set(req.body.ids.filter((id) => typeof id === 'string' && id.trim()))]
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ error: 'Selecione ao menos uma imobiliaria para excluir' });
    }
    if (ids.some((id) => !UUID_REGEX.test(id))) {
      return res.status(400).json({ error: 'Lista de imobiliarias contem IDs invalidos.' });
    }

    await unlinkKnownOrganizationReferences(ids);

    const { data, error } = await supabase
      .from('organizations')
      .delete()
      .in('id', ids)
      .select('id');

    if (error) {
      if (isForeignKeyError(error)) {
        const directDelete = await deleteOrganizationsWithDirectDb(ids);
        if (!directDelete.error) {
          return res.json({ success: true, deleted: directDelete.deleted, mode: 'direct-db' });
        }
        console.warn('[Admin] Bulk delete direct DB fallback failed:', directDelete.error.message);
      }
      throw error;
    }

    res.json({ success: true, deleted: data || [] });
  } catch (error) {
    const status = isForeignKeyError(error) ? 409 : 500;
    res.status(status).json({
      error: isForeignKeyError(error)
        ? 'Nao foi possivel excluir uma ou mais imobiliarias porque ainda existem registros vinculados.'
        : error.message,
      details: error.message,
    });
  }
});

async function unlinkKnownOrganizationReferences(ids) {
  await Promise.all([
    updateOptionalReference('profiles', 'organization_id', ids),
    updateOptionalReference('support_tickets', 'organization_id', ids),
    updateOptionalReference('storage_objects', 'tenant_id', ids),
    updateOptionalReference('call_sessions', 'tenant_id', ids),
    updateOptionalReference('call_recordings', 'tenant_id', ids),
    deleteOptionalReferenceRows('domains', 'organization_id', ids),
  ]);
}

async function updateOptionalReference(table, column, ids) {
  const { error } = await supabase
    .from(table)
    .update({ [column]: null })
    .in(column, ids);
  if (error && !isMissingOptionalRelation(error)) throw error;
}

async function deleteOptionalReferenceRows(table, column, ids) {
  const { error } = await supabase
    .from(table)
    .delete()
    .in(column, ids);
  if (error && !isMissingOptionalRelation(error)) throw error;
}

function isMissingOptionalRelation(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(code) ||
    /does not exist|could not find|schema cache/i.test(message);
}

function isForeignKeyError(error) {
  return String(error?.code || '') === '23503' ||
    /foreign key|violates.*constraint|still referenced/i.test(String(error?.message || ''));
}

function queryOrganizations(client) {
  return client
    .from('organizations')
    .select('id, name, slug, custom_domain, owner_name, owner_email, status, plan_id, niche, subscription_status, trial_ends_at, created_at, updated_at')
    .order('created_at', { ascending: false, nullsFirst: false });
}

async function queryOrganizationsWithUserToken(req) {
  const token = getBearerToken(req);
  const url = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!token || !url || !anonKey) {
    return {
      data: null,
      error: new Error('Fallback de listagem indisponivel: sessao ou credenciais publicas ausentes.'),
    };
  }

  const userScopedSupabase = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  return queryOrganizations(userScopedSupabase);
}

function getBearerToken(req) {
  const authHeader = String(req.headers.authorization || '');
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : '';
}

export function isInvalidSupabaseApiKeyError(error) {
  const message = String(error?.message || error?.error || '').toLowerCase();
  return message.includes('invalid api key') || message.includes('invalid apikey');
}

function sendSupabaseServiceKeyError(res, errors = {}) {
  const response = {
    success: false,
    code: 'SUPABASE_SERVICE_ROLE_INVALID',
    error:
      'Credencial SUPABASE_SERVICE_ROLE_KEY invalida no backend. Atualize a stack/env do container e faca redeploy.',
  };

  if (process.env.NODE_ENV !== 'production') {
    response.diagnostics = Object.fromEntries(
      Object.entries(errors).map(([key, value]) => [
        key,
        value?.message || value?.error || String(value || ''),
      ])
    );
  }

  return res.status(503).json(response);
}

export async function queryOrganizationsWithDirectDb() {
  const rawConnectionString = getDirectDatabaseUrl();
  const connectionString = normalizeDirectDatabaseUrl(rawConnectionString);
  if (!connectionString) {
    return {
      data: null,
      error: new Error('Fallback Postgres indisponivel: configure DATABASE_URL ou SUPABASE_DB_URL.'),
    };
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: shouldUseSsl(rawConnectionString) ? { rejectUnauthorized: false } : false,
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
  });

  try {
    const result = await pool.query(`
      SELECT
        o.id,
        o.name,
        to_jsonb(o)->>'slug' AS slug,
        to_jsonb(o)->>'custom_domain' AS custom_domain,
        to_jsonb(o)->>'owner_name' AS owner_name,
        to_jsonb(o)->>'owner_email' AS owner_email,
        COALESCE(to_jsonb(o)->>'status', 'active') AS status,
        to_jsonb(o)->>'plan_id' AS plan_id,
        to_jsonb(o)->>'niche' AS niche,
        to_jsonb(o)->>'subscription_status' AS subscription_status,
        to_jsonb(o)->>'trial_ends_at' AS trial_ends_at,
        to_jsonb(o)->>'created_at' AS created_at,
        to_jsonb(o)->>'updated_at' AS updated_at,
        CASE
          WHEN p.id IS NULL THEN NULL
          ELSE json_build_object('name', p.name)
        END AS plans
      FROM public.organizations o
      LEFT JOIN public.plans p ON p.id = CASE
        WHEN (to_jsonb(o)->>'plan_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (to_jsonb(o)->>'plan_id')::uuid
        ELSE NULL
      END
      ORDER BY o.created_at DESC NULLS LAST
    `);

    return { data: result.rows, error: null };
  } catch (error) {
    return { data: null, error };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function deleteOrganizationsWithDirectDb(ids) {
  const rawConnectionString = getDirectDatabaseUrl();
  const connectionString = normalizeDirectDatabaseUrl(rawConnectionString);
  if (!connectionString) {
    return {
      deleted: [],
      error: new Error('Fallback Postgres indisponivel: configure DATABASE_URL ou SUPABASE_DB_URL.'),
    };
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: shouldUseSsl(rawConnectionString) ? { rejectUnauthorized: false } : false,
    max: 1,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 5000,
  });

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const fkResult = await client.query(`
      SELECT
        ns.nspname AS schema_name,
        rel.relname AS table_name,
        attr.attname AS column_name,
        attr.attnotnull AS not_null,
        con.confdeltype AS delete_action
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace ns ON ns.oid = rel.relnamespace
      JOIN LATERAL unnest(con.conkey) AS cols(attnum) ON true
      JOIN pg_attribute attr ON attr.attrelid = con.conrelid AND attr.attnum = cols.attnum
      WHERE con.contype = 'f'
        AND con.confrelid = 'public.organizations'::regclass
        AND array_length(con.conkey, 1) = 1
    `);

    for (const row of fkResult.rows) {
      // PostgreSQL confdeltype: c=cascade, n=set null, d=set default, a=no action, r=restrict.
      if (!['a', 'r'].includes(row.delete_action)) continue;

      const tableName = `${quoteIdent(row.schema_name)}.${quoteIdent(row.table_name)}`;
      const columnName = quoteIdent(row.column_name);

      if (row.not_null) {
        await client.query(
          `DELETE FROM ${tableName} WHERE ${columnName} = ANY($1::uuid[])`,
          [ids]
        );
      } else {
        await client.query(
          `UPDATE ${tableName} SET ${columnName} = NULL WHERE ${columnName} = ANY($1::uuid[])`,
          [ids]
        );
      }
    }

    const deleted = await client.query(
      'DELETE FROM public.organizations WHERE id = ANY($1::uuid[]) RETURNING id',
      [ids]
    );

    await client.query('COMMIT');
    return { deleted: deleted.rows, error: null };
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return { deleted: [], error };
  } finally {
    if (client) client.release();
    await pool.end().catch(() => {});
  }
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function normalizeDirectDatabaseUrl(connectionString) {
  if (!connectionString) return '';

  try {
    const url = new URL(connectionString);
    // The pg connection-string parser may turn sslmode=require into certificate
    // verification. We pass SSL options explicitly to support Supabase pooler certs.
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function getDirectDatabaseUrl() {
  return [
    'DATABASE_URL',
    'SUPABASE_DB_URL',
    'DATABASE_PRIVATE_URL',
    'POSTGRES_URL',
    'POSTGRES_PRIVATE_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRESQL_URL',
    'PGDATABASE_URL',
    'PG_URL',
    'DB_URL',
  ]
    .map((key) => String(process.env[key] || '').trim())
    .find(Boolean) || '';
}

export function shouldUseSsl(connectionString) {
  if (process.env.PGSSLMODE === 'disable') return false;
  if (process.env.NODE_ENV === 'production') return true;
  return /supabase\.(co|com)|pooler\.supabase\.com|sslmode=require/i.test(connectionString);
}

router.delete('/organizations/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Imobiliaria nao encontrada' });

    res.json({ success: true, deleted: data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 🔗 Profile-Org Link (SuperAdmin) ---

router.post('/link-profile', verifySuperAdmin, async (req, res) => {
  try {
    const { email, organization_id } = req.body;
    if (!email || !organization_id) {
      return res.status(400).json({ error: 'email e organization_id sao obrigatorios' });
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organization_id)
      .maybeSingle();

    if (orgError || !org) {
      return res.status(404).json({ error: 'Organizacao nao encontrada' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role, organization_id')
      .ilike('email', email)
      .maybeSingle();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Perfil nao encontrado para este email' });
    }

    if (profile.organization_id === org.id) {
      return res.json({ success: true, message: `Perfil de ${email} ja esta vinculado a ${org.name}.` });
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        organization_id: org.id,
        role: 'admin',
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateError) throw updateError;

    clearProfileCache(profile.id, email);

    console.log('[Admin] Perfil vinculado manualmente por superadmin', {
      adminEmail: req.user?.email,
      targetEmail: email,
      orgId: org.id,
      orgName: org.name,
    });

    return res.json({
      success: true,
      message: `Perfil de ${email} vinculado a ${org.name} com sucesso!`,
      profile: { id: profile.id, email, organization_id: org.id },
    });
  } catch (err) {
    console.error('[Admin] Link profile error:', err.message);
    return res.status(500).json({ error: err.message });
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
