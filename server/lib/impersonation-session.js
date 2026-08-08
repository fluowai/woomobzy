import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS = 15 * 60 * 1000;

export class ImpersonationSessionError extends Error {
  constructor(message, code, status = 403) {
    super(message);
    this.name = 'ImpersonationSessionError';
    this.code = code;
    this.status = status;
  }
}

export function hashImpersonationSecret(secret) {
  return createHash('sha256').update(String(secret)).digest('hex');
}

export function readImpersonationSessionHeaders(headers = {}) {
  return {
    sessionId: readHeader(headers['x-impersonation-session-id']),
    sessionSecret: readHeader(headers['x-impersonation-session-secret']),
  };
}

export function getRequestedImpersonationOrganizationId(headers = {}) {
  const legacy = readHeader(headers['x-impersonate-org-id']);
  const requested = readHeader(headers['x-organization-id']);

  if (legacy && requested && legacy !== requested) {
    throw new ImpersonationSessionError(
      'Headers de organização conflitantes.',
      'IMPERSONATION_ORGANIZATION_CONFLICT',
      400
    );
  }

  return legacy || requested;
}

export async function createImpersonationSession(
  supabase,
  { actorUserId, organizationId, reason, ipAddress = null, userAgent = null }
) {
  const normalizedReason = String(reason || '').trim();
  if (!actorUserId || !organizationId || !normalizedReason) {
    throw new ImpersonationSessionError(
      'Organização, usuário e motivo são obrigatórios.',
      'IMPERSONATION_SESSION_INVALID',
      400
    );
  }

  const secret = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from('impersonation_sessions')
    .insert([
      {
        tenant_id: organizationId,
        actor_user_id: actorUserId,
        impersonated_user_id: actorUserId,
        token_hash: hashImpersonationSecret(secret),
        reason: normalizedReason,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
        created_ip: ipAddress,
        user_agent: userAgent,
        last_seen_at: new Date().toISOString(),
      },
    ])
    .select('id, tenant_id, actor_user_id, expires_at')
    .single();

  if (error || !data) {
    throw new ImpersonationSessionError(
      'Não foi possível criar a sessão de suporte.',
      'IMPERSONATION_SESSION_CREATE_FAILED',
      500
    );
  }

  await logAudit(supabase, {
    actor_id: actorUserId,
    action: 'IMPERSONATION_STARTED',
    details: {
      session_id: data.id,
      tenant_id: data.tenant_id,
      reason: normalizedReason,
      expires_at: data.expires_at,
    },
    ip_address: ipAddress,
  });

  return {
    id: data.id,
    secret,
    expiresAt: data.expires_at,
    organizationId: data.tenant_id,
  };
}

export async function assertValidImpersonationSession(
  supabase,
  { actorUserId, organizationId = null, sessionId, sessionSecret }
) {
  if (!sessionId || !sessionSecret) {
    throw new ImpersonationSessionError(
      'Sessão de impersonação obrigatória.',
      'IMPERSONATION_SESSION_REQUIRED',
      403
    );
  }

  const { data, error } = await supabase
    .from('impersonation_sessions')
    .select(
      'id, tenant_id, actor_user_id, token_hash, reason, status, expires_at, revoked_at'
    )
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !data) {
    throw new ImpersonationSessionError(
      'Sessão de impersonação inválida.',
      'IMPERSONATION_SESSION_INVALID',
      403
    );
  }
  if (data.actor_user_id !== actorUserId) {
    throw new ImpersonationSessionError(
      'Sessão não pertence ao usuário autenticado.',
      'IMPERSONATION_SESSION_FORBIDDEN',
      403
    );
  }
  if (organizationId && data.tenant_id !== organizationId) {
    throw new ImpersonationSessionError(
      'Sessão não pertence à organização solicitada.',
      'IMPERSONATION_SESSION_FORBIDDEN',
      403
    );
  }
  if (data.status === 'revoked' || data.revoked_at) {
    throw new ImpersonationSessionError(
      'Sessão de impersonação revogada.',
      'IMPERSONATION_REVOKED',
      403
    );
  }
  if (
    data.status !== 'active' ||
    new Date(data.expires_at).getTime() <= Date.now()
  ) {
    throw new ImpersonationSessionError(
      'Sessão de impersonação expirada.',
      'IMPERSONATION_EXPIRED',
      403
    );
  }
  if (!secretsMatch(data.token_hash, sessionSecret)) {
    throw new ImpersonationSessionError(
      'Credencial da sessão de impersonação inválida.',
      'IMPERSONATION_SESSION_SECRET_INVALID',
      403
    );
  }

  return data;
}

export async function revokeImpersonationSession(
  supabase,
  { actorUserId, sessionId, sessionSecret, ipAddress = null }
) {
  const { data: existing } = await supabase
    .from('impersonation_sessions')
    .select('id, tenant_id, actor_user_id, status, revoked_at')
    .eq('id', sessionId)
    .maybeSingle();

  if (existing && existing.status !== 'active') {
    return {
      id: existing.id,
      tenant_id: existing.tenant_id,
      actor_user_id: existing.actor_user_id,
      status: existing.status,
      revoked_at: existing.revoked_at,
    };
  }

  const active = await assertValidImpersonationSession(supabase, {
    actorUserId,
    sessionId,
    sessionSecret,
  });
  const revokedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from('impersonation_sessions')
    .update({
      status: 'revoked',
      revoked_at: revokedAt,
      revoked_by: actorUserId,
      revoke_reason: 'manual_stop',
      last_seen_at: revokedAt,
    })
    .eq('id', active.id)
    .select('id, tenant_id, actor_user_id, status, revoked_at')
    .single();

  if (error || !data) {
    throw new ImpersonationSessionError(
      'Não foi possível revogar a sessão de suporte.',
      'IMPERSONATION_SESSION_REVOKE_FAILED',
      500
    );
  }

  await logAudit(supabase, {
    actor_id: actorUserId,
    action: 'IMPERSONATION_REVOKED',
    details: {
      session_id: data.id,
      tenant_id: data.tenant_id,
      reason: 'manual_stop',
    },
    ip_address: ipAddress,
  });
  return data;
}

function readHeader(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = String(candidate || '').trim();
  return normalized || null;
}

function secretsMatch(storedHash, providedSecret) {
  const expected = Buffer.from(String(storedHash || ''), 'hex');
  const actual = Buffer.from(hashImpersonationSecret(providedSecret), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

async function logAudit(supabase, entry) {
  try {
    await supabase.from('audit_logs').insert([entry]);
  } catch (error) {
    console.error('[Impersonation] Falha ao registrar auditoria:', error);
  }
}
