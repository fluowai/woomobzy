import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearImpersonationSession,
  getImpersonatedOrganizationId,
  getImpersonationHeaders,
  getStoredImpersonationSession,
  isImpersonationErrorCode,
  persistImpersonationSession,
  syncImpersonationSessionExpiry,
} from '../lib/impersonation';

describe('impersonation session helper', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('persists a valid session envelope and exposes only the new headers', () => {
    persistImpersonationSession({
      id: 'session-1',
      secret: 'secret-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      organizationId: 'org-1',
    });

    expect(getStoredImpersonationSession()).toEqual({
      id: 'session-1',
      secret: 'secret-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      organizationId: 'org-1',
    });
    expect(getImpersonatedOrganizationId()).toBe('org-1');
    expect(getImpersonationHeaders()).toEqual({
      'x-impersonation-session-id': 'session-1',
      'x-impersonation-session-secret': 'secret-1',
    });
  });

  it('clears expired or malformed sessions automatically', () => {
    sessionStorage.setItem(
      'imobzy_impersonation_session',
      JSON.stringify({
        id: 'session-1',
        secret: 'secret-1',
        expiresAt: '2000-01-01T00:00:00.000Z',
        organizationId: 'org-1',
      })
    );

    expect(getStoredImpersonationSession()).toBeNull();
    expect(sessionStorage.getItem('imobzy_impersonation_session')).toBeNull();
  });

  it('drops legacy storage keys when the new session is cleared', () => {
    sessionStorage.setItem('impersonated_org_id', 'org-legacy');
    localStorage.setItem('impersonatedOrgId', 'org-legacy');
    localStorage.setItem('isImpersonating', 'true');

    clearImpersonationSession();

    expect(sessionStorage.getItem('impersonated_org_id')).toBeNull();
    expect(localStorage.getItem('impersonatedOrgId')).toBeNull();
    expect(localStorage.getItem('isImpersonating')).toBeNull();
  });

  it('extends the stored expiry when the server renews the session', () => {
    persistImpersonationSession({
      id: 'session-1',
      secret: 'secret-1',
      expiresAt: '2000-01-01T00:00:00.000Z',
      organizationId: 'org-1',
    });

    syncImpersonationSessionExpiry('2099-01-01T00:00:00.000Z');

    const stored = getStoredImpersonationSession({ allowExpired: true });
    expect(stored?.expiresAt).toBe('2099-01-01T00:00:00.000Z');
    expect(stored?.id).toBe('session-1');
    expect(stored?.organizationId).toBe('org-1');
    expect(getImpersonationHeaders()).toEqual({
      'x-impersonation-session-id': 'session-1',
      'x-impersonation-session-secret': 'secret-1',
    });
  });

  it('ignores an empty renew header', () => {
    persistImpersonationSession({
      id: 'session-1',
      secret: 'secret-1',
      expiresAt: '2099-01-01T00:00:00.000Z',
      organizationId: 'org-1',
    });

    syncImpersonationSessionExpiry(null);

    expect(getStoredImpersonationSession()?.expiresAt).toBe(
      '2099-01-01T00:00:00.000Z'
    );
  });

  it('recognizes impersonation failures that must clear local session state', () => {
    expect(isImpersonationErrorCode('IMPERSONATION_EXPIRED')).toBe(true);
    expect(isImpersonationErrorCode('IMPERSONATION_SECRET_INVALID')).toBe(true);
    expect(isImpersonationErrorCode('PROFILE_NO_ORG')).toBe(false);
  });
});
