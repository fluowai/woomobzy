// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { isPublicPath } from '../../components/SuperAdminGuard';

describe('SuperAdminGuard public routes', () => {
  it('keeps the site builder public URL accessible to logged-in admins', () => {
    expect(isPublicPath('/sites/teste')).toBe(true);
    expect(isPublicPath('/sites/teste/contato')).toBe(true);
  });

  it('does not classify protected panel routes as public', () => {
    expect(isPublicPath('/urban/site')).toBe(false);
    expect(isPublicPath('/megaadmin')).toBe(false);
  });
});
