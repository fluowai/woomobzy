import { describe, expect, it } from 'vitest';
import {
  completeProfileOrganization,
  findExistingOrganizationForUser,
  getAuthenticatedRequestIdentity,
  getSafeProfileBootstrapIdentity,
  resolveProfileForUser,
} from '../middleware/auth.js';

function createSupabaseMock({ profileById = null, profileByEmail = null }) {
  return {
    from(table) {
      if (table !== 'profiles') {
        throw new Error(`Unexpected table in test: ${table}`);
      }

      return {
        select() {
          return {
            eq(column, value) {
              if (column === 'id') {
                return {
                  maybeSingle: async () => ({
                    data: profileById && profileById.id === value ? profileById : null,
                    error: null,
                  }),
                };
              }

              throw new Error(`Unexpected eq(${column}) in test`);
            },
            ilike(column, value) {
              if (column === 'email') {
                return {
                  maybeSingle: async () => ({
                    data:
                      profileByEmail &&
                      String(profileByEmail.email || '').toLowerCase() ===
                        String(value || '').toLowerCase()
                        ? profileByEmail
                        : null,
                    error: null,
                  }),
                };
              }

              throw new Error(`Unexpected ilike(${column}) in test`);
            },
          };
        },
      };
    },
  };
}

describe('auth privilege source', () => {
  it('keeps the database role when stale auth metadata still says superadmin', async () => {
    const profile = {
      id: 'user-1',
      email: 'admin@example.com',
      role: 'admin',
      organization_id: 'org-1',
    };

    const result = await resolveProfileForUser(
      createSupabaseMock({ profileById: profile }),
      {
        id: 'user-1',
        email: 'admin@example.com',
        app_metadata: { role: 'superadmin' },
        user_metadata: {},
      }
    );

    expect(result).toEqual(profile);
    expect(result?.role).toBe('admin');
  });

  it('still trusts the database when the profile is resolved by email after auth id drift', async () => {
    const profile = {
      id: 'legacy-profile-id',
      email: 'admin@example.com',
      role: 'admin',
      organization_id: 'org-1',
    };

    const result = await resolveProfileForUser(
      createSupabaseMock({ profileByEmail: profile }),
      {
        id: 'new-auth-user-id',
        email: 'admin@example.com',
        app_metadata: { role: 'superadmin' },
        user_metadata: {},
      }
    );

    expect(result).toEqual(profile);
    expect(result?.role).toBe('admin');
  });

  it('preserves superadmin when the database already grants it', async () => {
    const profile = {
      id: 'user-1',
      email: 'owner@example.com',
      role: 'superadmin',
      organization_id: null,
    };

    const result = await resolveProfileForUser(
      createSupabaseMock({ profileById: profile }),
      {
        id: 'user-1',
        email: 'owner@example.com',
        app_metadata: { role: 'admin' },
        user_metadata: {},
      }
    );

    expect(result).toEqual(profile);
    expect(result?.role).toBe('superadmin');
  });

  it('never bootstraps privilege from user-controlled metadata', () => {
    expect(
      getSafeProfileBootstrapIdentity({
        app_metadata: {},
        user_metadata: {
          role: 'superadmin',
          organization_id: 'tenant-from-user-metadata',
        },
      })
    ).toEqual({
      organizationId: '',
      role: 'user',
    });
  });

  it('accepts only an app_metadata organization as an unprivileged bootstrap hint', () => {
    expect(
      getSafeProfileBootstrapIdentity({
        app_metadata: {
          role: 'superadmin',
          organization_id: 'tenant-from-app-metadata',
        },
        user_metadata: {},
      })
    ).toEqual({
      organizationId: 'tenant-from-app-metadata',
      role: 'user',
    });
  });

  it('does not resolve a tenant from user-controlled organization metadata', async () => {
    const result = await findExistingOrganizationForUser(
      {
        from() {
          throw new Error('The database must not be queried for user metadata');
        },
      },
      {
        app_metadata: {},
        user_metadata: {
          organization_id: 'arbitrary-tenant',
        },
      },
      ''
    );

    expect(result).toBeNull();
  });

  it('does not complete an existing profile tenant from user-controlled metadata', async () => {
    const profile = {
      id: 'profile-1',
      email: '',
      role: 'admin',
      organization_id: null,
    };

    const result = await completeProfileOrganization(
      {
        from() {
          throw new Error('The database must not be queried for user metadata');
        },
      },
      {
        id: 'auth-user-1',
        app_metadata: {},
        user_metadata: { organization_id: 'arbitrary-tenant' },
      },
      profile,
      { email: '', source: 'test' }
    );

    expect(result).toEqual(profile);
  });

  it('preserves the auth user id separately when a legacy profile id drifted', () => {
    expect(
      getAuthenticatedRequestIdentity(
        { id: 'auth-user-1', email: 'admin@example.com' },
        { id: 'legacy-profile-id' }
      )
    ).toEqual({
      user: {
        id: 'legacy-profile-id',
        email: 'admin@example.com',
      },
      authUserId: 'auth-user-1',
    });
  });
});
