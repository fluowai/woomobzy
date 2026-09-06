import { describe, expect, it } from 'vitest';
import { canAccessWooControl } from '../lib/woo-control-access.js';

function database(data: unknown, error: unknown = null) {
  return { from: () => ({ select: () => ({ eq: () => ({
    maybeSingle: async () => ({ data, error }),
  }) }) }) };
}

describe('WooControl global access', () => {
  it.each(['reseller_admin', 'master_reseller_admin', 'admin', 'broker'])('denies %s even with normalized superadmin role', async role => {
    expect(await canAccessWooControl({ profileRole: role, userRole: 'superadmin' }, database(null))).toBe(false);
  });
  it('denies superadmins belonging to resellers', async () => {
    expect(await canAccessWooControl({ profileRole: 'superadmin', realOrgId: 'reseller' }, database({ is_reseller: true }))).toBe(false);
  });
  it('denies missing organization records', async () => {
    expect(await canAccessWooControl({ profileRole: 'megaadmin', realOrgId: 'missing' }, database(null))).toBe(false);
  });
  it('propagates database failures instead of allowing access', async () => {
    await expect(canAccessWooControl({ profileRole: 'megaadmin', realOrgId: 'org' }, database(null, new Error('offline')))).rejects.toThrow('offline');
  });
  it('denies impersonated platform owners', async () => {
    expect(await canAccessWooControl({ profileRole: 'platform_owner', isImpersonating: true }, database(null))).toBe(false);
  });
  it.each(['platform_owner', 'mega_admin', 'superadmin', 'platform_admin'])('allows real platform role %s', async role => {
    expect(await canAccessWooControl({ profileRole: role, realOrgId: 'platform' }, database({ is_reseller: false }))).toBe(true);
    expect(await canAccessWooControl({ profileRole: role }, database(null))).toBe(true);
  });
});
