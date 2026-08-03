/**
 * LicenseAdminService — operações administrativas de licenciamento.
 *
 * Consumido exclusivamente pelo Mega Admin (verifyMegaAdmin). Reutiliza o
 * schema 20260803_licensing_core e escreve auditoria em duas camadas:
 *   - license_audit_events (hash encadeado à prova de adulteração);
 *   - audit_logs (trilha global do Mega Admin).
 *
 * As chaves de assinatura das chaves de licença vêm de env:
 *   LICENSE_SIGNING_PRIVATE_KEY (assina) / LICENSE_SIGNING_PUBLIC_KEY (verifica).
 * Sem a chave privada (dev/test), uma chave efêmera é usada apenas para manter
 * o formato WOLK1 válido e parseável.
 */

import { randomUUID } from 'node:crypto';
import { createLicenseKey, generateKeyPair, keyFingerprint } from './crypto.js';
import { appendAuditEvent } from './installation-service.js';

export class LicenseAdminError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.name = 'LicenseAdminError';
    this.code = code;
    this.status = status;
  }
}

const LICENSE_EDITABLE_FIELDS = [
  'plan_id',
  'edition',
  'max_installations',
  'grace_days',
  'blocking_policy',
  'expires_at',
  'metadata',
];

const VALID_EDITIONS = new Set(['standard', 'pro', 'enterprise']);
const VALID_BLOCKING_POLICIES = new Set(['none', 'soft', 'hard']);
const VALID_LICENSE_STATUSES = new Set([
  'draft',
  'active',
  'suspended',
  'expired',
  'revoked',
  'blocked',
]);

const STATUS_TRANSITIONS = {
  activate: { target: 'active', from: ['draft', 'expired', 'suspended'] },
  suspend: { target: 'suspended', from: ['active'] },
  revoke: { target: 'revoked', from: ['draft', 'active', 'suspended', 'expired'] },
  block: { target: 'blocked', from: ['draft', 'active', 'suspended', 'expired'] },
  unblock: { target: 'active', from: ['blocked'] },
};

const AUDIT_ACTIONS = {
  activate: 'license.activated',
  suspend: 'license.suspended',
  revoke: 'license.revoked',
  block: 'license.blocked',
  unblock: 'license.unblocked',
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value, field) {
  if (typeof value !== 'string' || !UUID_RE.test(value.trim())) {
    throw new LicenseAdminError(`Campo ${field} inválido`, 'LICENSE_INVALID_BODY', 400);
  }
  return value.trim();
}

function requireString(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new LicenseAdminError(
      `Campo ${field} é obrigatório`,
      'LICENSE_INVALID_BODY',
      400
    );
  }
  return value.trim();
}

function parsePositiveInt(value, field, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new LicenseAdminError(
      `Campo ${field} deve ser um inteiro maior ou igual a 1`,
      'LICENSE_INVALID_BODY',
      400
    );
  }
  return parsed;
}

function parseNonNegativeInt(value, field, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new LicenseAdminError(
      `Campo ${field} deve ser um inteiro maior ou igual a 0`,
      'LICENSE_INVALID_BODY',
      400
    );
  }
  return parsed;
}

function parseDateOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new LicenseAdminError(
      'Data de expiração inválida',
      'LICENSE_INVALID_BODY',
      400
    );
  }
  return new Date(time).toISOString();
}

function clampInt(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/**
 * Gera uma chave WOLK1. Usa a chave privada do control plane quando disponível;
 * caso contrário gera um par efêmero apenas para manter o formato válido.
 */
function buildLicenseKeyToken(payload) {
  const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (privateKeyPem) return createLicenseKey(privateKeyPem, payload);
  const ephemeral = generateKeyPair();
  return createLicenseKey(ephemeral.privateKeyPem, payload);
}

function resolveSigningKeyId() {
  const publicKeyPem = process.env.LICENSE_SIGNING_PUBLIC_KEY;
  if (!publicKeyPem) return null;
  try {
    return keyFingerprint(publicKeyPem);
  } catch {
    return null;
  }
}

async function findLicenseOrThrow(supabase, licenseId) {
  assertUuid(licenseId, 'licenseId');
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('id', licenseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new LicenseAdminError('Licença não encontrada', 'LICENSE_NOT_FOUND', 404);
  }
  return data;
}

async function findInstallationOrThrow(supabase, licenseId, installationId) {
  assertUuid(installationId, 'installationId');
  const { data, error } = await supabase
    .from('license_installations')
    .select('*')
    .eq('id', installationId)
    .eq('license_id', licenseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new LicenseAdminError(
      'Instalação não encontrada',
      'INSTALLATION_NOT_FOUND',
      404
    );
  }
  return data;
}

async function logGlobalAudit(supabase, {
  actorId,
  tenantId,
  resource,
  action,
  details,
  ipAddress,
}) {
  try {
    await supabase.from('audit_logs').insert([
      {
        actor_id: actorId || null,
        target_resource: resource || null,
        action,
        details: details || {},
        ip_address: ipAddress || null,
        tenant_id: tenantId || null,
      },
    ]);
  } catch (error) {
    console.error('[LicensingAdmin] Falha ao registrar auditoria global:', error);
  }
}

async function writeAudit(supabase, {
  license,
  action,
  severity = 'info',
  eventData,
  actorId,
  ipAddress,
  now,
  installationId,
}) {
  await appendAuditEvent(supabase, {
    licenseId: license.id,
    organizationId: license.organization_id,
    installationId,
    actorId,
    action,
    severity,
    eventData,
    ipAddress,
    now,
  });
  await logGlobalAudit(supabase, {
    actorId,
    tenantId: license.organization_id,
    resource: 'license',
    action,
    details: eventData || {},
    ipAddress,
  });
}

function unique(values) {
  return [...new Set(values.filter((v) => v !== null && v !== undefined))];
}

async function enrichLicenses(supabase, rows) {
  const orgIds = unique(rows.map((r) => r.organization_id));
  const planIds = unique(rows.map((r) => r.plan_id));
  const licenseIds = rows.map((r) => r.id);

  const [orgResult, planResult, installationResult] = await Promise.all([
    orgIds.length
      ? supabase.from('organizations').select('id, name, slug').in('id', orgIds)
      : Promise.resolve({ data: [], error: null }),
    planIds.length
      ? supabase.from('plans').select('id, name').in('id', planIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('license_installations')
      .select('license_id, status, last_heartbeat_at')
      .in('license_id', licenseIds),
  ]);

  if (orgResult.error) throw orgResult.error;
  if (planResult.error) throw planResult.error;
  if (installationResult.error) throw installationResult.error;

  const orgs = new Map((orgResult.data || []).map((o) => [String(o.id), o]));
  const plans = new Map((planResult.data || []).map((p) => [String(p.id), p]));

  const activeCounts = {};
  const totalCounts = {};
  const lastHeartbeats = {};
  (installationResult.data || []).forEach((row) => {
    const licenseId = String(row.license_id);
    totalCounts[licenseId] = (totalCounts[licenseId] || 0) + 1;
    if (row.status === 'active') {
      activeCounts[licenseId] = (activeCounts[licenseId] || 0) + 1;
    }
    const hb = row.last_heartbeat_at ? Date.parse(row.last_heartbeat_at) : 0;
    if (hb > (lastHeartbeats[licenseId] || 0)) {
      lastHeartbeats[licenseId] = hb;
    }
  });

  return rows.map((license) => ({
    ...license,
    organization_name: orgs.get(String(license.organization_id))?.name || null,
    organization_slug: orgs.get(String(license.organization_id))?.slug || null,
    plan_name: license.plan_id
      ? plans.get(String(license.plan_id))?.name || null
      : null,
    active_installations: activeCounts[String(license.id)] || 0,
    total_installations: totalCounts[String(license.id)] || 0,
    last_heartbeat_at: lastHeartbeats[String(license.id)]
      ? new Date(lastHeartbeats[String(license.id)]).toISOString()
      : null,
  }));
}

export async function listLicenses(supabase, options = {}) {
  const limit = clampInt(options.limit, 50, 1, 200);
  const offset = clampInt(options.offset, 0, 0, 100_000);

  if (options.status && !VALID_LICENSE_STATUSES.has(options.status)) {
    throw new LicenseAdminError('Status inválido', 'LICENSE_INVALID_STATUS', 400);
  }
  if (options.edition && !VALID_EDITIONS.has(options.edition)) {
    throw new LicenseAdminError('Edição inválida', 'LICENSE_INVALID_EDITION', 400);
  }

  let query = supabase
    .from('licenses')
    .select('*', { count: 'exact', head: false });

  if (options.status) query = query.eq('status', options.status);
  if (options.organizationId) {
    assertUuid(options.organizationId, 'organizationId');
    query = query.eq('organization_id', options.organizationId);
  }
  if (options.edition) query = query.eq('edition', options.edition);
  if (options.search) query = query.ilike('license_key', `%${options.search}%`);

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const licenses = await enrichLicenses(supabase, data || []);
  return { licenses, total: count || 0 };
}

export async function getLicenseDetail(supabase, licenseId) {
  const license = await findLicenseOrThrow(supabase, licenseId);

  const [
    organizationResult,
    planResult,
    installationsResult,
    domainsResult,
    entitlementsResult,
    heartbeatsResult,
    auditResult,
  ] = await Promise.all([
    license.organization_id
      ? supabase
          .from('organizations')
          .select('id, name, slug, status')
          .eq('id', license.organization_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    license.plan_id
      ? supabase
          .from('plans')
          .select('id, name, features, limits')
          .eq('id', license.plan_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('license_installations')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('license_domains')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false }),
    supabase
      .from('license_entitlements')
      .select('*')
      .eq('license_id', licenseId),
    supabase
      .from('license_heartbeats')
      .select('*')
      .eq('license_id', licenseId)
      .order('received_at', { ascending: false })
      .limit(20),
    supabase
      .from('license_audit_events')
      .select('*')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  for (const result of [
    organizationResult,
    planResult,
    installationsResult,
    domainsResult,
    entitlementsResult,
    heartbeatsResult,
    auditResult,
  ]) {
    if (result.error) throw result.error;
  }

  return {
    license,
    organization: organizationResult.data || null,
    plan: planResult.data || null,
    installations: installationsResult.data || [],
    domains: domainsResult.data || [],
    entitlements: entitlementsResult.data || [],
    heartbeats: heartbeatsResult.data || [],
    auditEvents: auditResult.data || [],
  };
}

export async function createLicense(supabase, input = {}, context = {}) {
  const now = context.now || Date.now();
  const organizationId = requireString(input.organization_id, 'organization_id');
  assertUuid(organizationId, 'organization_id');

  const edition = input.edition || 'standard';
  if (!VALID_EDITIONS.has(edition)) {
    throw new LicenseAdminError('Edição inválida', 'LICENSE_INVALID_EDITION', 400);
  }
  const maxInstallations = parsePositiveInt(
    input.max_installations,
    'max_installations',
    1
  );
  const graceDays = parseNonNegativeInt(input.grace_days, 'grace_days', 3);
  const blockingPolicy = input.blocking_policy || 'soft';
  if (!VALID_BLOCKING_POLICIES.has(blockingPolicy)) {
    throw new LicenseAdminError(
      'Política de bloqueio inválida',
      'LICENSE_INVALID_BLOCKING_POLICY',
      400
    );
  }
  const expiresAt = parseDateOrNull(input.expires_at);
  const metadata =
    input.metadata && typeof input.metadata === 'object' ? input.metadata : {};
  const status = input.status || 'draft';
  if (!VALID_LICENSE_STATUSES.has(status)) {
    throw new LicenseAdminError('Status inválido', 'LICENSE_INVALID_STATUS', 400);
  }

  let plan = null;
  let planId = input.plan_id || null;
  if (planId) {
    assertUuid(planId, 'plan_id');
    const planResult = await supabase
      .from('plans')
      .select('id, name, features, limits')
      .eq('id', planId)
      .maybeSingle();
    if (planResult.error) throw planResult.error;
    if (!planResult.data) {
      throw new LicenseAdminError('Plano não encontrado', 'PLAN_NOT_FOUND', 404);
    }
    plan = planResult.data;
  }

  const orgResult = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .maybeSingle();
  if (orgResult.error) throw orgResult.error;
  if (!orgResult.data) {
    throw new LicenseAdminError(
      'Organização não encontrada',
      'ORG_NOT_FOUND',
      404
    );
  }

  const existingResult = await supabase
    .from('licenses')
    .select('id')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (existingResult.error) throw existingResult.error;
  if (existingResult.data) {
    throw new LicenseAdminError(
      'Organização já possui uma licença',
      'LICENSE_ALREADY_EXISTS',
      409
    );
  }

  const id = randomUUID();
  const nowIso = new Date(now).toISOString();
  const tempKey = buildLicenseKeyToken({ temp: randomUUID() });

  const insertResult = await supabase
    .from('licenses')
    .insert([
      {
        id,
        organization_id: organizationId,
        license_key: tempKey,
        plan_id: planId,
        signing_key_id: null,
        status,
        edition,
        max_installations: maxInstallations,
        grace_days: graceDays,
        blocking_policy: blockingPolicy,
        issued_at: nowIso,
        activated_at: null,
        expires_at: expiresAt,
        metadata,
        created_at: nowIso,
        updated_at: nowIso,
      },
    ])
    .select()
    .single();

  if (insertResult.error) throw insertResult.error;

  const licenseKey = buildLicenseKeyToken({
    licenseId: id,
    organizationId,
    edition,
    issuedAt: now,
    expiresAt: expiresAt || null,
  });
  const signingKeyId = resolveSigningKeyId();

  const updateResult = await supabase
    .from('licenses')
    .update({
      license_key: licenseKey,
      signing_key_id: signingKeyId,
      updated_at: nowIso,
    })
    .eq('id', id)
    .select()
    .single();
  if (updateResult.error) throw updateResult.error;
  const license = updateResult.data;

  if (plan) {
    const entitlementsByKey = new Map();
    for (const [key, value] of Object.entries(plan.features || {})) {
      entitlementsByKey.set(key, { key, value, source: 'plan' });
    }
    for (const [key, value] of Object.entries(plan.limits || {})) {
      entitlementsByKey.set(key, { key, value, source: 'plan' });
    }
    const rows = [...entitlementsByKey.values()].map((entry) => ({
      license_id: id,
      organization_id: organizationId,
      key: entry.key,
      value: entry.value,
      source: entry.source,
      created_at: nowIso,
      updated_at: nowIso,
    }));
    if (rows.length) {
      const entitlementResult = await supabase
        .from('license_entitlements')
        .insert(rows);
      if (entitlementResult.error) throw entitlementResult.error;
    }
  }

  await writeAudit(supabase, {
    license,
    action: 'license.created',
    severity: 'info',
    eventData: {
      organizationId,
      planId: planId || null,
      edition,
      maxInstallations,
      graceDays,
      expiresAt: expiresAt || null,
      status,
    },
    actorId: context.actorId,
    ipAddress: context.ipAddress,
    now,
  });

  return { license, licenseKey };
}

export async function updateLicense(supabase, licenseId, input = {}, context = {}) {
  const now = context.now || Date.now();
  const license = await findLicenseOrThrow(supabase, licenseId);

  const patch = {};
  for (const field of LICENSE_EDITABLE_FIELDS) {
    if (!(field in input)) continue;
    const value = input[field];
    switch (field) {
      case 'plan_id':
        if (value === null || value === undefined || value === '') {
          patch.plan_id = null;
        } else {
          assertUuid(value, 'plan_id');
          patch.plan_id = value.trim();
        }
        break;
      case 'edition':
        if (!VALID_EDITIONS.has(value)) {
          throw new LicenseAdminError('Edição inválida', 'LICENSE_INVALID_EDITION', 400);
        }
        patch.edition = value;
        break;
      case 'max_installations':
        patch.max_installations = parsePositiveInt(value, 'max_installations', 1);
        break;
      case 'grace_days':
        patch.grace_days = parseNonNegativeInt(value, 'grace_days', 0);
        break;
      case 'blocking_policy':
        if (!VALID_BLOCKING_POLICIES.has(value)) {
          throw new LicenseAdminError(
            'Política de bloqueio inválida',
            'LICENSE_INVALID_BLOCKING_POLICY',
            400
          );
        }
        patch.blocking_policy = value;
        break;
      case 'expires_at':
        patch.expires_at = parseDateOrNull(value);
        break;
      case 'metadata':
        patch.metadata =
          value && typeof value === 'object' ? value : license.metadata || {};
        break;
      default:
        break;
    }
  }

  if (Object.keys(patch).length === 0) {
    throw new LicenseAdminError('Nada para atualizar', 'LICENSE_NOTHING_TO_UPDATE', 400);
  }

  patch.updated_at = new Date(now).toISOString();

  const updateResult = await supabase
    .from('licenses')
    .update(patch)
    .eq('id', license.id)
    .select()
    .single();
  if (updateResult.error) throw updateResult.error;
  const updated = updateResult.data;

  await writeAudit(supabase, {
    license: updated,
    action: 'license.updated',
    severity: 'info',
    eventData: { changes: patch },
    actorId: context.actorId,
    ipAddress: context.ipAddress,
    now,
  });

  return updated;
}

export async function setLicenseStatus(supabase, licenseId, transition, context = {}) {
  const now = context.now || Date.now();
  const config = STATUS_TRANSITIONS[transition];
  if (!config) {
    throw new LicenseAdminError('Transição inválida', 'LICENSE_INVALID_TRANSITION', 400);
  }

  const license = await findLicenseOrThrow(supabase, licenseId);
  const nowIso = new Date(now).toISOString();

  if (license.status === config.target) {
    return license;
  }
  if (!config.from.includes(license.status)) {
    throw new LicenseAdminError(
      `Não é possível ${transition} uma licença em estado ${license.status}`,
      'LICENSE_STATUS_TRANSITION',
      409
    );
  }

  const patch = {
    status: config.target,
    updated_at: nowIso,
  };
  if (config.target === 'active' && !license.activated_at) {
    patch.activated_at = nowIso;
  }

  const updateResult = await supabase
    .from('licenses')
    .update(patch)
    .eq('id', license.id)
    .select()
    .single();
  if (updateResult.error) throw updateResult.error;
  const updated = updateResult.data;

  if (config.target === 'revoked' || config.target === 'blocked') {
    const installationPatch = {
      status: config.target,
      updated_at: nowIso,
    };
    if (config.target === 'revoked') installationPatch.revoked_at = nowIso;
    const installationResult = await supabase
      .from('license_installations')
      .update(installationPatch)
      .eq('license_id', license.id);
    if (installationResult.error) throw installationResult.error;
  }

  await writeAudit(supabase, {
    license: updated,
    action: AUDIT_ACTIONS[transition],
    severity: config.target === 'blocked' || config.target === 'revoked' ? 'critical' : 'warn',
    eventData: {
      from: license.status,
      to: config.target,
    },
    actorId: context.actorId,
    ipAddress: context.ipAddress,
    now,
  });

  return updated;
}

export async function revokeInstallation(supabase, licenseId, installationId, context = {}) {
  const now = context.now || Date.now();
  const license = await findLicenseOrThrow(supabase, licenseId);
  const installation = await findInstallationOrThrow(
    supabase,
    licenseId,
    installationId
  );

  if (installation.status === 'revoked') {
    return installation;
  }

  const nowIso = new Date(now).toISOString();
  const updateResult = await supabase
    .from('license_installations')
    .update({
      status: 'revoked',
      revoked_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', installation.id)
    .select()
    .single();
  if (updateResult.error) throw updateResult.error;
  const updated = updateResult.data;

  await writeAudit(supabase, {
    license,
    action: 'license.installation_revoked',
    severity: 'warn',
    eventData: {
      installationId: installation.id,
      fingerprint: installation.installation_fingerprint,
      hostname: installation.hostname || null,
    },
    actorId: context.actorId,
    ipAddress: context.ipAddress,
    now,
    installationId: installation.id,
  });

  return updated;
}

export async function reissueLicenseKey(supabase, licenseId, context = {}) {
  const now = context.now || Date.now();
  const license = await findLicenseOrThrow(supabase, licenseId);

  const licenseKey = buildLicenseKeyToken({
    licenseId: license.id,
    organizationId: license.organization_id,
    edition: license.edition,
    issuedAt: now,
    expiresAt: license.expires_at ? Date.parse(license.expires_at) : null,
  });

  const updateResult = await supabase
    .from('licenses')
    .update({
      license_key: licenseKey,
      signing_key_id: resolveSigningKeyId(),
      updated_at: new Date(now).toISOString(),
    })
    .eq('id', license.id)
    .select()
    .single();
  if (updateResult.error) throw updateResult.error;
  const updated = updateResult.data;

  await writeAudit(supabase, {
    license: updated,
    action: 'license.key_reissued',
    severity: 'warn',
    eventData: {},
    actorId: context.actorId,
    ipAddress: context.ipAddress,
    now,
  });

  return { license: updated, licenseKey };
}

export async function listHeartbeats(supabase, licenseId, options = {}) {
  await findLicenseOrThrow(supabase, licenseId);
  const limit = clampInt(options.limit, 50, 1, 200);
  const offset = clampInt(options.offset, 0, 0, 100_000);

  const result = await supabase
    .from('license_heartbeats')
    .select('*', { count: 'exact', head: false })
    .eq('license_id', licenseId)
    .order('received_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (result.error) throw result.error;

  return { heartbeats: result.data || [], total: result.count || 0 };
}

export async function listAuditEvents(supabase, licenseId, options = {}) {
  await findLicenseOrThrow(supabase, licenseId);
  const limit = clampInt(options.limit, 50, 1, 200);
  const offset = clampInt(options.offset, 0, 0, 100_000);

  const result = await supabase
    .from('license_audit_events')
    .select('*', { count: 'exact', head: false })
    .eq('license_id', licenseId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (result.error) throw result.error;

  return { auditEvents: result.data || [], total: result.count || 0 };
}
