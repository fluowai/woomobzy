import { describe, expect, it } from 'vitest';
import { getAuthenticatedPanelPath } from '../lib/panelNavigation';

describe('WooControl navigation', () => {
  it('routes the platform owner to WooControl', () => {
    expect(getAuthenticatedPanelPath({ role: 'platform_owner' })).toBe('/woo-control');
  });
  it('does not redirect a reseller owner back into the denied WooControl route', () => {
    expect(getAuthenticatedPanelPath({ role: 'platform_owner', organization: { is_reseller: true } })).toBe('/superadmin');
  });
  it('keeps support sessions in the tenant panel', () => {
    expect(getAuthenticatedPanelPath({ role: 'platform_owner', organization_id: 'rural', organization: { niche: 'rural' } }, true)).toBe('/rural');
  });
});
