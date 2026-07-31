import { logger } from '@/utils/logger';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from './FullScreenSpinner';

export function isRuralOrganization(
  niche?: string,
  name?: string,
  slug?: string
) {
  const normalizedNiche = String(niche || '')
    .toLowerCase()
    .trim();
  if (normalizedNiche === 'rural') return true;
  if (['traditional', 'urban', 'urbano'].includes(normalizedNiche))
    return false;

  const text = `${name || ''} ${slug || ''}`.toLowerCase();
  return /\b(rural|fazenda|fazendas|sitio|sítio|chacara|chácara|agro|haras)\b/.test(
    text
  );
}

interface PanelHomeProfile {
  role?: string;
  organization_id?: string;
  organization?: {
    name?: string;
    slug?: string;
    niche?: string;
    is_reseller?: boolean;
  };
}

export function getPanelHomePath(
  profile: PanelHomeProfile | null | undefined,
  opts?: { isImpersonating?: boolean }
): string {
  if (!profile) return '/';

  const role = String(profile.role || '').toLowerCase();
  const isImpersonating = opts?.isImpersonating;

  if (role === 'superadmin' || role === 'super_admin') {
    if (!isImpersonating) {
      return !profile.organization?.is_reseller ? '/megaadmin' : '/superadmin';
    }
    if (profile.organization) {
      return isRuralOrganization(
        profile.organization.niche,
        profile.organization.name,
        profile.organization.slug
      )
        ? '/rural'
        : '/urban';
    }
    return !profile.organization?.is_reseller ? '/megaadmin' : '/superadmin';
  }

  if (!profile.organization_id) return '/onboarding';

  if (profile.organization) {
    return isRuralOrganization(
      profile.organization.niche,
      profile.organization.name,
      profile.organization.slug
    )
      ? '/rural'
      : '/urban';
  }
  return '/urban';
}

const NicheRedirect: React.FC = () => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  const target = getPanelHomePath(profile, { isImpersonating });

  logger.info(
    `NicheRedirect: Sending ${profile?.email} to ${target} (isImpersonating: ${isImpersonating})`
  );
  return <Navigate to={target} replace />;
};

export default NicheRedirect;
