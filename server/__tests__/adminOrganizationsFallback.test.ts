import { describe, expect, it } from 'vitest';
import {
  assertManageableOrganization,
  isInvalidSupabaseApiKeyError,
} from '../routes/admin.js';
import {
  normalizeDirectDatabaseUrl,
  shouldUseSsl,
} from '../lib/organization-deletion.js';

describe('admin organizations fallback helpers', () => {
  it('detects Supabase invalid API key errors', () => {
    expect(isInvalidSupabaseApiKeyError({ message: 'Invalid API key' })).toBe(
      true
    );
    expect(isInvalidSupabaseApiKeyError({ error: 'invalid apikey' })).toBe(
      true
    );
    expect(
      isInvalidSupabaseApiKeyError(
        new Error('permission denied for table organizations')
      )
    ).toBe(false);
  });

  it('normalizes direct database URLs for pg fallback', () => {
    const url = normalizeDirectDatabaseUrl(
      'postgresql://user:pass@db.example.com:5432/postgres?sslmode=require&connect_timeout=10'
    );

    expect(url).toContain('connect_timeout=10');
    expect(url).not.toContain('sslmode=require');
  });

  it('enables SSL for Supabase pooler connections', () => {
    expect(
      shouldUseSsl(
        'postgresql://user:pass@aws-1.pooler.supabase.com:5432/postgres'
      )
    ).toBe(true);
    expect(shouldUseSsl('postgresql://user:pass@localhost:5432/postgres')).toBe(
      false
    );
  });

  it('scopes reseller admins to their own child organizations only', () => {
    const scope = { kind: 'reseller', organizationId: 'reseller-1' };

    expect(
      assertManageableOrganization(scope, {
        id: 'child-1',
        parent_id: 'reseller-1',
        is_reseller: false,
      })
    ).toBe(true);
    expect(
      assertManageableOrganization(scope, {
        id: 'child-2',
        parent_id: 'reseller-2',
        is_reseller: false,
      })
    ).toBe(false);
    expect(
      assertManageableOrganization(scope, {
        id: 'reseller-1',
        parent_id: null,
        is_reseller: true,
      })
    ).toBe(false);
  });

  it('allows mega admins to manage global organizations', () => {
    expect(
      assertManageableOrganization(
        { kind: 'mega', organizationId: null },
        {
          id: 'any-org',
          parent_id: 'any-reseller',
          is_reseller: true,
        }
      )
    ).toBe(true);
  });
});
