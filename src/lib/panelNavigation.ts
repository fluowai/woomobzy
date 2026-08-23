export type PanelProfile = {
  role?: string | null;
  email?: string | null;
  organization_id?: string | null;
  organization?: {
    niche?: string | null;
    name?: string | null;
    slug?: string | null;
    is_reseller?: boolean | null;
  } | null;
};

export function isRuralOrganization(
  niche?: string | null,
  name?: string | null,
  slug?: string | null
) {
  const normalizedNiche = String(niche || '')
    .toLowerCase()
    .trim();
  if (normalizedNiche === 'rural') return true;
  if (['traditional', 'urban', 'urbano'].includes(normalizedNiche)) {
    return false;
  }

  const text = `${name || ''} ${slug || ''}`.toLowerCase();
  return /\b(rural|fazenda|fazendas|sitio|sítio|chacara|chácara|agro|haras)\b/.test(
    text
  );
}

export function isPlatformAdminRole(role?: string | null) {
  const normalizedRole = String(role || '').toLowerCase();
  return [
    'superadmin',
    'super_admin',
    'megaadmin',
    'mega_admin',
  ].includes(normalizedRole);
}

export function isMegaAdminProfile(profile?: PanelProfile | null) {
  return (
    isPlatformAdminRole(profile?.role) && !profile?.organization?.is_reseller
  );
}

export function getTenantPanelPath(profile?: PanelProfile | null) {
  const org = profile?.organization;
  return isRuralOrganization(org?.niche, org?.name, org?.slug)
    ? '/rural'
    : '/urban';
}

export function getAuthenticatedPanelPath(
  profile?: PanelProfile | null,
  isImpersonating = false
) {
  if (!profile) return '/login';

  if (isPlatformAdminRole(profile.role) && !isImpersonating) {
    return isMegaAdminProfile(profile) ? '/megaadmin' : '/superadmin';
  }

  if (!profile.organization_id && !isPlatformAdminRole(profile.role)) {
    return '/onboarding';
  }

  return getTenantPanelPath(profile);
}
