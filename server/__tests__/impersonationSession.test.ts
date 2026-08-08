import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertValidImpersonationSession,
  createImpersonationSession,
  getRequestedImpersonationOrganizationId,
  hashImpersonationSecret,
  ImpersonationSessionError,
  revokeImpersonationSession,
} from '../lib/impersonation-session.js';

type SessionRow = {
  id: string;
  tenant_id: string;
  actor_user_id: string;
  impersonated_user_id: string;
  token_hash: string | null;
  reason: string | null;
  status: string;
  expires_at: string;
  revoked_at?: string | null;
};

function createSupabaseMock({
  sessionRow = null,
}: {
  sessionRow?: SessionRow | null;
} = {}) {
  const state = {
    sessionRow,
    insertedSessions: [] as SessionRow[],
    auditLogs: [] as Array<Record<string, unknown>>,
  };

  return {
    state,
    from(table: string) {
      if (table === 'impersonation_sessions') {
        return {
          insert(rows: Array<Record<string, unknown>>) {
            const row = rows[0];
            const inserted: SessionRow = {
              id: 'session-1',
              tenant_id: String(row.tenant_id),
              actor_user_id: String(row.actor_user_id),
              impersonated_user_id: String(row.impersonated_user_id),
              token_hash: String(row.token_hash),
              reason: row.reason ? String(row.reason) : null,
              status: String(row.status),
              expires_at: String(row.expires_at),
              revoked_at: null,
            };
            state.insertedSessions.push(inserted);
            state.sessionRow = inserted;

            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      id: inserted.id,
                      tenant_id: inserted.tenant_id,
                      actor_user_id: inserted.actor_user_id,
                      expires_at: inserted.expires_at,
                    },
                    error: null,
                  }),
                };
              },
            };
          },
          select() {
            return {
              eq(column: string, value: string) {
                if (column !== 'id') {
                  throw new Error(`Unexpected eq(${column}) in test`);
                }

                return {
                  maybeSingle: async () => ({
                    data:
                      state.sessionRow && state.sessionRow.id === value
                        ? state.sessionRow
                        : null,
                    error: null,
                  }),
                };
              },
            };
          },
          update(patch: Record<string, unknown>) {
            return {
              eq(column: string, value: string) {
                if (
                  !state.sessionRow ||
                  column !== 'id' ||
                  state.sessionRow.id !== value
                ) {
                  throw new Error(
                    `Unexpected update target ${column}=${value}`
                  );
                }

                state.sessionRow = {
                  ...state.sessionRow,
                  ...patch,
                } as SessionRow;

                return {
                  select() {
                    return {
                      single: async () => ({
                        data: {
                          id: state.sessionRow?.id,
                          tenant_id: state.sessionRow?.tenant_id,
                          actor_user_id: state.sessionRow?.actor_user_id,
                          status: state.sessionRow?.status,
                          revoked_at: state.sessionRow?.revoked_at ?? null,
                        },
                        error: null,
                      }),
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'audit_logs') {
        return {
          insert(rows: Array<Record<string, unknown>>) {
            state.auditLogs.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          },
        };
      }

      throw new Error(`Unexpected table in test: ${table}`);
    },
  };
}

describe('impersonation session helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'));
  });

  it('creates a 15-minute session and persists only the secret hash', async () => {
    const supabase = createSupabaseMock();

    const session = await createImpersonationSession(supabase as never, {
      actorUserId: 'actor-1',
      organizationId: 'org-1',
      reason: 'Diagnostico',
      ipAddress: '127.0.0.1',
    });

    expect(session).toMatchObject({
      id: 'session-1',
      organizationId: 'org-1',
      expiresAt: '2026-07-28T12:15:00.000Z',
    });
    expect(session.secret).toHaveLength(64);
    expect(supabase.state.insertedSessions[0]?.token_hash).toBe(
      hashImpersonationSecret(session.secret)
    );
    expect(supabase.state.insertedSessions[0]?.token_hash).not.toBe(
      session.secret
    );
    expect(supabase.state.insertedSessions[0]?.impersonated_user_id).toBe(
      'actor-1'
    );
    expect(supabase.state.auditLogs).toHaveLength(1);
  });

  it('validates actor, tenant, status, expiration and secret hash', async () => {
    const supabase = createSupabaseMock({
      sessionRow: {
        id: 'session-1',
        tenant_id: 'org-1',
        actor_user_id: 'actor-1',
        impersonated_user_id: 'actor-1',
        token_hash: hashImpersonationSecret('top-secret'),
        reason: 'Diagnostico',
        status: 'active',
        expires_at: '2026-07-28T12:15:00.000Z',
        revoked_at: null,
      },
    });

    const session = await assertValidImpersonationSession(supabase as never, {
      actorUserId: 'actor-1',
      organizationId: 'org-1',
      sessionId: 'session-1',
      sessionSecret: 'top-secret',
    });

    expect(session.id).toBe('session-1');
    expect(session.tenant_id).toBe('org-1');
  });

  it('rejects a session when the provided secret does not match the stored hash', async () => {
    const supabase = createSupabaseMock({
      sessionRow: {
        id: 'session-1',
        tenant_id: 'org-1',
        actor_user_id: 'actor-1',
        impersonated_user_id: 'actor-1',
        token_hash: hashImpersonationSecret('top-secret'),
        reason: null,
        status: 'active',
        expires_at: '2026-07-28T12:15:00.000Z',
        revoked_at: null,
      },
    });

    await expect(
      assertValidImpersonationSession(supabase as never, {
        actorUserId: 'actor-1',
        organizationId: 'org-1',
        sessionId: 'session-1',
        sessionSecret: 'wrong-secret',
      })
    ).rejects.toMatchObject({
      code: 'IMPERSONATION_SESSION_SECRET_INVALID',
      status: 403,
    });
  });

  it.each([
    {
      name: 'expirada',
      patch: {
        status: 'active',
        expires_at: '2026-07-28T11:59:59.000Z',
        revoked_at: null,
      },
      actorUserId: 'actor-1',
      code: 'IMPERSONATION_EXPIRED',
    },
    {
      name: 'revogada',
      patch: {
        status: 'revoked',
        expires_at: '2026-07-28T12:15:00.000Z',
        revoked_at: '2026-07-28T11:55:00.000Z',
      },
      actorUserId: 'actor-1',
      code: 'IMPERSONATION_REVOKED',
    },
    {
      name: 'de outro ator',
      patch: {
        status: 'active',
        expires_at: '2026-07-28T12:15:00.000Z',
        revoked_at: null,
      },
      actorUserId: 'actor-2',
      code: 'IMPERSONATION_SESSION_FORBIDDEN',
    },
  ])('rejects a session $name', async ({ patch, actorUserId, code }) => {
    const supabase = createSupabaseMock({
      sessionRow: {
        id: 'session-1',
        tenant_id: 'org-1',
        actor_user_id: 'actor-1',
        impersonated_user_id: 'actor-1',
        token_hash: hashImpersonationSecret('top-secret'),
        reason: 'Diagnóstico',
        ...patch,
      },
    });

    await expect(
      assertValidImpersonationSession(supabase as never, {
        actorUserId,
        organizationId: 'org-1',
        sessionId: 'session-1',
        sessionSecret: 'top-secret',
      })
    ).rejects.toMatchObject({ code, status: 403 });
  });

  it('revokes the current session after validating the actor and secret', async () => {
    const supabase = createSupabaseMock({
      sessionRow: {
        id: 'session-1',
        tenant_id: 'org-1',
        actor_user_id: 'actor-1',
        impersonated_user_id: 'actor-1',
        token_hash: hashImpersonationSecret('top-secret'),
        reason: 'Diagnostico',
        status: 'active',
        expires_at: '2026-07-28T12:15:00.000Z',
        revoked_at: null,
      },
    });

    const revoked = await revokeImpersonationSession(supabase as never, {
      actorUserId: 'actor-1',
      sessionId: 'session-1',
      sessionSecret: 'top-secret',
      ipAddress: '127.0.0.1',
    });

    expect(revoked.status).toBe('revoked');
    expect(revoked.revoked_at).toBe('2026-07-28T12:00:00.000Z');
    expect(supabase.state.auditLogs).toHaveLength(1);
  });

  it('rejects inconsistent legacy and requested organization headers', () => {
    expect(() =>
      getRequestedImpersonationOrganizationId({
        'x-impersonate-org-id': 'org-1',
        'x-organization-id': 'org-2',
      })
    ).toThrowError(ImpersonationSessionError);
  });
});
