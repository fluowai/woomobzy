import { logger } from '@/utils/logger';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStoredImpersonationSession } from '../src/lib/impersonation';
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

  // Fallback: se isImpersonating nao foi passado explicitamente,
  // verifique o sessionStorage — evita redirecionamento para /megaadmin
  // quando a sessao React ainda nao foi hidratada apos reload.
  const storedSession = getStoredImpersonationSession();
  const isImpersonating = opts?.isImpersonating ?? !!storedSession;

  if (role === 'superadmin' || role === 'super_admin') {
    if (!isImpersonating) {
      return !profile.organization?.is_reseller ? '/megaadmin' : '/superadmin';
    }
    // Superadmin em modo impersonificacao → acessa o painel da org impersonada
    if (profile.organization) {
      if (profile.organization.is_reseller) {
        return '/superadmin';
      }
      return isRuralOrganization(
        profile.organization.niche,
        profile.organization.name,
        profile.organization.slug
      )
        ? '/rural'
        : '/urban';
    }
    // Sem organization carregada, mas sessao de impersonificacao ativa:
    // redirecione para /admin para forcar recarregamento do profile
    return '/admin';
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
