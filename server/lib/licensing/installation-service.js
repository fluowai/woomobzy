/**
 * LicenseInstallationService — endpoints de instalação do licenciamento.
 *
 * Endpoints consumidos pela instalação (app deployado) para:
 *   - ativar uma licença (vincular fingerprint de instalação);
 *   - validar a licença online;
 *   - enviar heartbeat.
 *
 * O control plane assina um envelope offline (createValidationEnvelope) para
 * que a instalação possa operar offline com tolerância controlada.
 * A fonte da verdade é o banco (tabelas do schema 20260803_licensing_core).
 *
 * As chaves de assinatura vêm de env:
 *   LICENSE_SIGNING_PRIVATE_KEY (assina envelopes / cria chaves de licença)
 *   LICENSE_SIGNING_PUBLIC_KEY  (verifica chaves de licença)
 * Sem elas (dev/test), a assinatura é pulada e o envelope retorna signature null.
 */

import { createValidationEnvelope } from './envelope.js';
import {
  LicenseCryptoError,
  sha256Hex,
  verifyLicenseKey,
  parseLicenseKey,
} from './crypto.js';
import { ReplayDetectedError, ReplayGuard } from './replay-guard.js';
import {
  computeLicenseState,
  evaluateLicense,
  LICENSE_STATES,
} from './policy.js';

export class LicenseEndpointError extends Error {
  constructor(message, code, status = 400) {
    super(message);
    this.name = 'LicenseEndpointError';
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_ENVELOPE_TTL_MS = 24 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 60_000;
const HEARTBEAT_OK_STATUSES = ['active', 'pending'];

/** Guard anti-replay em memória (hash SHA-256 dos nonces). */
export const replayGuard = new ReplayGuard();

function requireField(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new LicenseEndpointError(
      `Campo ${field} é obrigatório`,
      'LICENSE_INVALID_BODY',
      400
    );
  }
  return value.trim();
}

function normalizeDomain(domain) {
  return String(domain || '').toLowerCase().trim();
}

/**
 * Faz o parsing da chave de licença (formato) e, quando uma chave pública de
 * assinatura está configurada, verifica a assinatura Ed25519.
 * Retorna { payload, signatureVerified: boolean | null }.
 */
function parseAndVerifyKey(licenseKey) {
  let payload = null;
  try {
    payload = parseLicenseKey(licenseKey).payload;
  } catch (error) {
    if (error instanceof LicenseCryptoError) {
      throw new LicenseEndpointError(error.message, error.code, 400);
    }
    throw error;
  }

  const publicKeyPem = process.env.LICENSE_SIGNING_PUBLIC_KEY;
  if (!publicKeyPem) {
    return { payload, signatureVerified: null };
  }

  try {
    verifyLicenseKey(licenseKey, publicKeyPem);
    return { payload, signatureVerified: true };
  } catch (error) {
    if (error instanceof LicenseCryptoError) {
      return { payload, signatureVerified: false };
    }
    throw error;
  }
}

function assertLicenseKeyMatches(license, keyPayload) {
  if (
    keyPayload?.licenseId &&
    String(keyPayload.licenseId) !== String(license.id)
  ) {
    throw new LicenseEndpointError(
      'Chave de licença não corresponde à licença registrada',
      'LICENSE_KEY_MISMATCH',
      403
    );
  }
}

function consumeNonce(nonce) {
  try {
    replayGuard.consume(nonce);
  } catch (error) {
    if (error instanceof ReplayDetectedError) {
      throw new LicenseEndpointError(
        'Nonce inválido ou já utilizado',
        'LICENSE_NONCE_REPLAY',
        409
      );
    }
    throw error;
  }
}

async function findLicenseByKey(supabase, licenseKey) {
  const { data, error } = await supabase
    .from('licenses')
    .select('*')
    .eq('license_key', licenseKey)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function listDomains(supabase, licenseId) {
  const { data, error } = await supabase
    .from('license_domains')
    .select('domain, purpose, status')
    .eq('license_id', licenseId);
  if (error) throw error;
  return (data || [])
    .filter((d) => ['verified', 'active', 'pending'].includes(d.status))
    .map((d) => normalizeDomain(d.domain));
}

async function listEntitlements(supabase, licenseId) {
  const { data, error } = await supabase
    .from('license_entitlements')
    .select('key, value')
    .eq('license_id', licenseId);
  if (error) throw error;
  const entitlements = {};
  (data || []).forEach((row) => {
    entitlements[row.key] = row.value;
  });
  return entitlements;
}

async function countActiveInstallations(supabase, licenseId) {
  const { count, error } = await supabase
    .from('license_installations')
    .select('id', { count: 'exact', head: true })
    .eq('license_id', licenseId)
    .eq('status', 'active');
  if (error) throw error;
  return count || 0;
}

async function findInstallation(supabase, licenseId, fingerprint) {
  const { data, error } = await supabase
    .from('license_installations')
    .select('*')
    .eq('license_id', licenseId)
    .eq('installation_fingerprint', fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function findInstallationByFingerprintGlobal(supabase, fingerprint) {
  const { data, error } = await supabase
    .from('license_installations')
    .select('id, license_id')
    .eq('installation_fingerprint', fingerprint)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function upsertInstallation(supabase, {
  licenseId,
  organizationId,
  installationId,
  fingerprint,
  name,
  hostname,
  platform,
  version,
  ipAddress,
  now,
}) {
  const existing = await findInstallation(supabase, licenseId, fingerprint);
  const nowIso = new Date(now).toISOString();

  if (existing) {
    const { data, error } = await supabase
      .from('license_installations')
      .update({
        status: 'active',
        last_seen_at: nowIso,
        last_heartbeat_at: nowIso,
        last_ip: ipAddress || existing.last_ip,
        name: name ?? existing.name,
        hostname: hostname ?? existing.hostname,
        platform: platform ?? existing.platform,
        version: version ?? existing.version,
        updated_at: nowIso,
      })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('license_installations')
    .insert([
      {
        license_id: licenseId,
        organization_id: organizationId,
        installation_id: installationId,
        installation_fingerprint: fingerprint,
        name: name || null,
        hostname: hostname || null,
        platform: platform || null,
        version: version || null,
        status: 'active',
        last_seen_at: nowIso,
        last_heartbeat_at: nowIso,
        last_ip: ipAddress || null,
        activated_at: nowIso,
        updated_at: nowIso,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function touchInstallation(supabase, installation, {
  hostname,
  version,
  ipAddress,
  now,
}) {
  const nowIso = new Date(now).toISOString();
  const { data, error } = await supabase
    .from('license_installations')
    .update({
      last_seen_at: nowIso,
      last_heartbeat_at: nowIso,
      last_ip: ipAddress || installation.last_ip,
      hostname: hostname ?? installation.hostname,
      version: version ?? installation.version,
      updated_at: nowIso,
    })
    .eq('id', installation.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function updateLicenseActivity(supabase, license, { activate, now }) {
  const patch = {
    last_validated_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  if (activate && license.status === 'draft') {
    patch.status = 'active';
    patch.activated_at = new Date(now).toISOString();
  }
  const { data, error } = await supabase
    .from('licenses')
    .update(patch)
    .eq('id', license.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function insertHeartbeatLog(supabase, {
  licenseId,
  organizationId,
  installationId,
  nonce,
  status,
  ipAddress,
  payload,
  now,
}) {
  const { data, error } = await supabase
    .from('license_heartbeats')
    .insert([
      {
        license_id: licenseId,
        organization_id: organizationId,
        installation_id: installationId,
        nonce,
        status: status || null,
        ip_address: ipAddress || null,
        payload: payload || {},
        received_at: new Date(now).toISOString(),
      },
    ])
    .select()
    .single();
  // 23505 = nonce já registrado (replay). O banco é a segunda linha de defesa.
  if (error && error.code !== '23505') throw error;
  return data || null;
}

/**
 * Auditoria à prova de adulteração: hash encadeado.
 * event_hash = sha256(previous_hash + dados do evento).
 */
export async function appendAuditEvent(supabase, {
  licenseId,
  organizationId,
  installationId,
  actorId,
  action,
  severity,
  eventData,
  ipAddress,
  now,
}) {
  const createdAt = new Date(now).toISOString();
  const baseInsert = (previousHash, eventHash) => ({
    license_id: licenseId,
    organization_id: organizationId,
    installation_id: installationId || null,
    actor_id: actorId || null,
    action,
    severity,
    event_data: eventData || {},
    previous_hash: previousHash,
    event_hash: eventHash,
    ip_address: ipAddress || null,
    created_at: createdAt,
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: last } = await supabase
      .from('license_audit_events')
      .select('event_hash')
      .eq('license_id', licenseId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = last?.event_hash || null;
    const eventHash = sha256Hex(
      JSON.stringify({
        action,
        severity,
        licenseId,
        installationId: installationId || null,
        eventData: eventData || {},
        previousHash,
        createdAt,
      })
    );

    const { error } = await supabase
      .from('license_audit_events')
      .insert([baseInsert(previousHash, eventHash)]);
    if (!error) return eventHash;
    if (error.code !== '23505') throw error;
  }
  throw new LicenseEndpointError(
    'Não foi possível registrar evento de auditoria',
    'LICENSE_AUDIT_WRITE_FAILED',
    500
  );
}

function buildValidationEnvelope({
  license,
  installation,
  requestDomain,
  state,
  code,
  valid,
  entitlements,
  now,
}) {
  const expiresAtMs = license.expires_at
    ? new Date(license.expires_at).getTime()
    : null;
  const graceMs = Number(license.grace_days || 0) * 24 * 60 * 60 * 1000;
  const isGrace = state === LICENSE_STATES.GRACE;

  let validUntilMs = now + DEFAULT_ENVELOPE_TTL_MS;
  if (expiresAtMs) {
    const expiryLimitMs =
      expiresAtMs + CLOCK_SKEW_MS + (isGrace ? graceMs : 0);
    validUntilMs = Math.min(validUntilMs, expiryLimitMs);
  }

  const payload = {
    version: 1,
    issuedAt: now,
    validUntil: validUntilMs,
    licenseId: license.id,
    organizationId: license.organization_id,
    edition: license.edition,
    state,
    code,
    valid,
    requestDomain: normalizeDomain(requestDomain) || null,
    installationFingerprint: installation?.installation_fingerprint || null,
    entitlements: entitlements || {},
    issuedBy: 'imobzy-licensing',
  };

  const privateKeyPem = process.env.LICENSE_SIGNING_PRIVATE_KEY;
  if (!privateKeyPem) {
    return { payload, signature: null };
  }
  return createValidationEnvelope(privateKeyPem, payload);
}

const ACTIVATION_FORBIDDEN = {
  [LICENSE_STATES.REVOKED]: { code: 'LICENSE_REVOKED', status: 403 },
  [LICENSE_STATES.BLOCKED]: { code: 'LICENSE_BLOCKED', status: 403 },
  [LICENSE_STATES.SUSPENDED]: { code: 'LICENSE_SUSPENDED', status: 403 },
  [LICENSE_STATES.EXPIRED]: { code: 'LICENSE_EXPIRED', status: 403 },
  [LICENSE_STATES.NO_LICENSE]: { code: 'LICENSE_NOT_FOUND', status: 404 },
};

/** Estados em que uma ativação é permitida (draft = primeira ativação). */
const ACTIVATABLE_STATES = new Set([
  LICENSE_STATES.VALID,
  LICENSE_STATES.GRACE,
  LICENSE_STATES.DRAFT,
]);

/**
 * Ativação: registra (ou reativa) a instalação e devolve envelope assinado.
 */
export async function activateInstallation(supabase, input = {}) {
  const now = input.now || Date.now();
  const licenseKey = requireField(input.licenseKey, 'licenseKey');
  const nonce = requireField(input.nonce, 'nonce');
  const installationId = requireField(input.installationId, 'installationId');
  const fingerprint = requireField(
    input.installationFingerprint,
    'installationFingerprint'
  );
  const requestDomain = normalizeDomain(input.domain);
  const ipAddress = input.ipAddress || null;

  consumeNonce(nonce);

  const { payload: keyPayload, signatureVerified } =
    parseAndVerifyKey(licenseKey);
  if (signatureVerified === false) {
    throw new LicenseEndpointError(
      'Assinatura da chave de licença inválida',
      'LICENSE_KEY_SIGNATURE',
      403
    );
  }

  const license = await findLicenseByKey(supabase, licenseKey);
  if (!license) {
    throw new LicenseEndpointError(
      'Licença não encontrada',
      'LICENSE_NOT_FOUND',
      404
    );
  }
  assertLicenseKeyMatches(license, keyPayload);

  const baseState = computeLicenseState({ license, now });
  if (!ACTIVATABLE_STATES.has(baseState.state)) {
    const mapped =
      ACTIVATION_FORBIDDEN[baseState.state] || { code: baseState.code, status: 403 };
    throw new LicenseEndpointError(
      baseState.checks?.licenseState?.reason || 'Licença não ativável',
      mapped.code,
      mapped.status
    );
  }

  const bound = await findInstallationByFingerprintGlobal(supabase, fingerprint);
  if (bound && String(bound.license_id) !== String(license.id)) {
    throw new LicenseEndpointError(
      'Fingerprint já vinculado a outra licença',
      'INSTALLATION_FINGERPRINT_BOUND',
      409
    );
  }

  const [allowedDomains, entitlements, activeInstallations] = await Promise.all([
    listDomains(supabase, license.id),
    listEntitlements(supabase, license.id),
    countActiveInstallations(supabase, license.id),
  ]);

  const domainOk =
    allowedDomains.length === 0 ||
    allowedDomains.some((d) => d === requestDomain);
  if (!domainOk) {
    throw new LicenseEndpointError(
      `Domínio ${requestDomain || '(não informado)'} não vinculado à licença`,
      'DOMAIN_NOT_LINKED',
      403
    );
  }

  const existing = await findInstallation(supabase, license.id, fingerprint);
  const countsAgainstLimit = !(
    existing && existing.status === 'active'
  );
  const maxInstallations = Number(license.max_installations ?? 1);
  if (countsAgainstLimit && activeInstallations >= maxInstallations) {
    throw new LicenseEndpointError(
      `Limite de instalações excedido (${activeInstallations}/${maxInstallations})`,
      'INSTALLATION_LIMIT_EXCEEDED',
      429
    );
  }

  const installation = await upsertInstallation(supabase, {
    licenseId: license.id,
    organizationId: license.organization_id,
    installationId,
    fingerprint,
    name: input.name,
    hostname: input.hostname,
    platform: input.platform,
    version: input.version,
    ipAddress,
    now,
  });

  const updatedLicense = await updateLicenseActivity(supabase, license, {
    activate: true,
    now,
  });

  const finalState = computeLicenseState({
    license: updatedLicense || license,
    now,
  });

  await insertHeartbeatLog(supabase, {
    licenseId: license.id,
    organizationId: license.organization_id,
    installationId: installation.id,
    nonce,
    status: finalState.state,
    ipAddress,
    payload: { event: 'activation', domain: requestDomain || null },
    now,
  });

  await appendAuditEvent(supabase, {
    licenseId: license.id,
    organizationId: license.organization_id,
    installationId: installation.id,
    action: 'license.activated',
    severity: 'info',
    eventData: {
      fingerprint,
      domain: requestDomain || null,
      hostname: input.hostname || null,
      platform: input.platform || null,
      version: input.version || null,
      state: finalState.state,
    },
    ipAddress,
    now,
  });

  const envelope = buildValidationEnvelope({
    license: updatedLicense || license,
    installation,
    requestDomain,
    state: finalState.state,
    code: finalState.code,
    valid: finalState.state === LICENSE_STATES.VALID,
    entitlements,
    now,
  });

  return { success: true, state: finalState.state, envelope, installation };
}

/**
 * Validação online: roda a política completa (evaluateLicense) e devolve
 * envelope assinado com o resultado.
 */
export async function validateInstallation(supabase, input = {}) {
  const now = input.now || Date.now();
  const licenseKey = requireField(input.licenseKey, 'licenseKey');
  const nonce = requireField(input.nonce, 'nonce');
  const fingerprint = requireField(
    input.installationFingerprint,
    'installationFingerprint'
  );
  const requestDomain = normalizeDomain(input.domain);
  const ipAddress = input.ipAddress || null;

  consumeNonce(nonce);

  const { payload: keyPayload, signatureVerified } =
    parseAndVerifyKey(licenseKey);
  if (signatureVerified === false) {
    throw new LicenseEndpointError(
      'Assinatura da chave de licença inválida',
      'LICENSE_KEY_SIGNATURE',
      403
    );
  }

  const license = await findLicenseByKey(supabase, licenseKey);
  if (!license) {
    throw new LicenseEndpointError(
      'Licença não encontrada',
      'LICENSE_NOT_FOUND',
      404
    );
  }
  assertLicenseKeyMatches(license, keyPayload);

  const [installation, allowedDomains, entitlements, activeInstallations] =
    await Promise.all([
      findInstallation(supabase, license.id, fingerprint),
      listDomains(supabase, license.id),
      listEntitlements(supabase, license.id),
      countActiveInstallations(supabase, license.id),
    ]);

  let result;
  if (!installation) {
    const base = computeLicenseState({ license, now });
    if (base.state === LICENSE_STATES.VALID || base.state === LICENSE_STATES.GRACE) {
      result = {
        state: LICENSE_STATES.FINGERPRINT_MISMATCH,
        code: 'FINGERPRINT_MISMATCH',
        valid: false,
        severity: 'critical',
        checks: {},
        actions: ['log_audit', 'flag_suspicious'],
      };
    } else {
      result = base;
    }
  } else {
    result = evaluateLicense({
      license,
      installation,
      requestDomain,
      allowedDomains,
      entitlements,
      activeInstallations,
      maxInstallations: Number(license.max_installations ?? 1),
      signatureValid: true,
      fingerprintMatch: true,
      now,
    });
  }

  if (installation) {
    await touchInstallation(supabase, installation, {
      hostname: input.hostname,
      version: input.version,
      ipAddress,
      now,
    });
  }

  const updatedLicense = await updateLicenseActivity(supabase, license, {
    activate: false,
    now,
  });

  if (!result.valid) {
    await appendAuditEvent(supabase, {
      licenseId: license.id,
      organizationId: license.organization_id,
      installationId: installation?.id || null,
      action: 'license.validation_failed',
      severity: result.severity === 'critical' ? 'critical' : 'warn',
      eventData: {
        state: result.state,
        code: result.code,
        fingerprint,
        domain: requestDomain || null,
      },
      ipAddress,
      now,
    });
  }

  const envelope = buildValidationEnvelope({
    license: updatedLicense || license,
    installation,
    requestDomain,
    state: result.state,
    code: result.code,
    valid: result.valid,
    entitlements,
    now,
  });

  return { success: true, state: result.state, valid: result.valid, envelope };
}

/**
 * Heartbeat: registra atividade da instalação e devolve o estado atual.
 */
export async function sendHeartbeat(supabase, input = {}) {
  const now = input.now || Date.now();
  const licenseKey = requireField(input.licenseKey, 'licenseKey');
  const nonce = requireField(input.nonce, 'nonce');
  const fingerprint = requireField(
    input.installationFingerprint,
    'installationFingerprint'
  );
  const requestDomain = normalizeDomain(input.domain);
  const ipAddress = input.ipAddress || null;

  consumeNonce(nonce);

  const { payload: keyPayload, signatureVerified } =
    parseAndVerifyKey(licenseKey);
  if (signatureVerified === false) {
    throw new LicenseEndpointError(
      'Assinatura da chave de licença inválida',
      'LICENSE_KEY_SIGNATURE',
      403
    );
  }

  const license = await findLicenseByKey(supabase, licenseKey);
  if (!license) {
    throw new LicenseEndpointError(
      'Licença não encontrada',
      'LICENSE_NOT_FOUND',
      404
    );
  }
  assertLicenseKeyMatches(license, keyPayload);

  const installation = await findInstallation(supabase, license.id, fingerprint);
  if (!installation || !HEARTBEAT_OK_STATUSES.includes(installation.status)) {
    throw new LicenseEndpointError(
      'Instalação não encontrada ou inativa',
      'INSTALLATION_NOT_FOUND',
      404
    );
  }

  const [entitlements, allowedDomains, activeInstallations] = await Promise.all([
    listEntitlements(supabase, license.id),
    listDomains(supabase, license.id),
    countActiveInstallations(supabase, license.id),
  ]);

  const result = evaluateLicense({
    license,
    installation,
    requestDomain,
    allowedDomains,
    entitlements,
    activeInstallations,
    maxInstallations: Number(license.max_installations ?? 1),
    signatureValid: true,
    fingerprintMatch: true,
    now,
  });

  const touched = await touchInstallation(supabase, installation, {
    hostname: input.hostname,
    version: input.version,
    ipAddress,
    now,
  });

  const updatedLicense = await updateLicenseActivity(supabase, license, {
    activate: false,
    now,
  });

  await insertHeartbeatLog(supabase, {
    licenseId: license.id,
    organizationId: license.organization_id,
    installationId: installation.id,
    nonce,
    status: result.state,
    ipAddress,
    payload: {
      domain: requestDomain || null,
      hostname: input.hostname || null,
      version: input.version || null,
    },
    now,
  });

  if (!result.valid) {
    await appendAuditEvent(supabase, {
      licenseId: license.id,
      organizationId: license.organization_id,
      installationId: installation.id,
      action: 'license.heartbeat_invalid',
      severity: result.severity === 'critical' ? 'critical' : 'warn',
      eventData: {
        state: result.state,
        code: result.code,
        fingerprint,
      },
      ipAddress,
      now,
    });
  }

  const envelope = buildValidationEnvelope({
    license: updatedLicense || license,
    installation: touched || installation,
    requestDomain,
    state: result.state,
    code: result.code,
    valid: result.valid,
    entitlements,
    now,
  });

  return { success: true, state: result.state, valid: result.valid, envelope };
}
