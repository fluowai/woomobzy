import { logger } from '@/utils/logger';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from './FullScreenSpinner';

export function isRuralOrganization(niche?: string, name?: string, slug?: string) {
  const normalizedNiche = String(niche || '').toLowerCase().trim();
  if (normalizedNiche === 'rural') return true;
  if (['traditional', 'urban', 'urbano'].includes(normalizedNiche)) return false;

  const text = `${name || ''} ${slug || ''}`.toLowerCase();
  return /\b(rural|fazenda|fazendas|sitio|sítio|chacara|chácara|agro|haras)\b/.test(text);
}

const NicheRedirect: React.FC = () => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  if (profile?.role === 'superadmin' && !isImpersonating) {
    return <Navigate to="/superadmin" replace />;
  }

  if (!profile?.organization_id && profile?.role !== 'superadmin') {
    logger.info('No organization found for user. Redirecting to onboarding.');
    return <Navigate to="/onboarding" replace />;
  }

  const rawNiche = (profile?.organization as any)?.niche;
  const orgName = (profile?.organization as any)?.name;
  const orgSlug = (profile?.organization as any)?.slug;
  const rural = isRuralOrganization(rawNiche, orgName, orgSlug);
  const target = rural ? '/rural' : '/urban';

  logger.info(`NicheRedirect: Sending ${profile?.email} to ${target} (rawNiche: ${rawNiche}, isRural: ${rural})`);
  return <Navigate to={target} replace />;
};

export default NicheRedirect;
