export interface ImpersonationSessionEnvelope {
  id: string;
  secret: string;
  expiresAt: string;
  organizationId: string;
}

export const IMPERSONATION_STORAGE_KEY = 'imobzy_impersonation_session';
const LEGACY_IMPERSONATION_STORAGE_KEY = 'impersonated_org_id';
const LEGACY_IMPERSONATION_FLAG_KEY = 'isImpersonating';
const LEGACY_IMPERSONATION_LOCAL_KEY = 'impersonatedOrgId';

const IMPERSONATION_ERROR_CODES = new Set([
  'IMPERSONATION_EXPIRED',
  'IMPERSONATION_REVOKED',
  'IMPERSONATION_SESSION_INVALID',
  'IMPERSONATION_SESSION_REQUIRED',
  'IMPERSONATION_SESSION_FORBIDDEN',
  'IMPERSONATION_SESSION_SECRET_INVALID',
  'IMPERSONATION_SECRET_INVALID',
  'INVALID_IMPERSONATED_ORG',
]);

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeSession(value: unknown): ImpersonationSessionEnvelope | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const id = isNonEmptyString(record.id) ? record.id.trim() : '';
  const secret = isNonEmptyString(record.secret) ? record.secret.trim() : '';
  const expiresAt = isNonEmptyString(record.expiresAt)
    ? record.expiresAt.trim()
    : '';
  const organizationId = isNonEmptyString(record.organizationId)
    ? record.organizationId.trim()
    : '';

  if (!id || !secret || !expiresAt || !organizationId) return null;
  if (Number.isNaN(new Date(expiresAt).getTime())) return null;

  return {
    id,
    secret,
    expiresAt,
    organizationId,
  };
}

export function isImpersonationSessionExpired(
  session: Pick<ImpersonationSessionEnvelope, 'expiresAt'>,
  now = Date.now()
): boolean {
  return new Date(session.expiresAt).getTime() <= now;
}

export function clearImpersonationSession(): void {
  if (typeof window === 'undefined') return;

  sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_IMPERSONATION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_IMPERSONATION_LOCAL_KEY);
  localStorage.removeItem(LEGACY_IMPERSONATION_FLAG_KEY);
}

export function persistImpersonationSession(
  session: ImpersonationSessionEnvelope
): void {
  if (typeof window === 'undefined') return;

  const normalized = normalizeSession(session);
  if (!normalized) {
    throw new Error('Sessão de impersonação inválida');
  }

  sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(normalized));
  sessionStorage.removeItem(LEGACY_IMPERSONATION_STORAGE_KEY);
  localStorage.removeItem(LEGACY_IMPERSONATION_LOCAL_KEY);
  localStorage.setItem(LEGACY_IMPERSONATION_FLAG_KEY, 'true');
}

export function getStoredImpersonationSession(options?: {
  allowExpired?: boolean;
}): ImpersonationSessionEnvelope | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
  if (!raw) {
    if (
      sessionStorage.getItem(LEGACY_IMPERSONATION_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_IMPERSONATION_LOCAL_KEY)
    ) {
      clearImpersonationSession();
    }
    return null;
  }

  try {
    const parsed = normalizeSession(JSON.parse(raw));
    if (!parsed) {
      clearImpersonationSession();
      return null;
    }

    if (!options?.allowExpired && isImpersonationSessionExpired(parsed)) {
      clearImpersonationSession();
      return null;
    }

    return parsed;
  } catch {
    clearImpersonationSession();
    return null;
  }
}

export function getImpersonatedOrganizationId(): string | null {
  return getStoredImpersonationSession()?.organizationId || null;
}

export function getImpersonationHeaders(): Record<string, string> {
  const session = getStoredImpersonationSession();
  if (!session) return {};

  return {
    'x-impersonation-session-id': session.id,
    'x-impersonation-session-secret': session.secret,
  };
}

export function isImpersonationErrorCode(code?: string | null): boolean {
  return Boolean(code && IMPERSONATION_ERROR_CODES.has(code));
}
