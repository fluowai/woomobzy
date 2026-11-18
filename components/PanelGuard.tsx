import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  isPlatformAdminRole,
  isPlatformOwnerRole,
  isRuralOrganization,
} from '../src/lib/panelNavigation';
import FullScreenSpinner from './FullScreenSpinner';

const PanelGuard: React.FC<{
  panel: 'rural' | 'urban';
  children: React.ReactNode;
}> = ({ panel, children }) => {
  const { profile, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  // Superadmin, Platform Owner, Platform Admin e Gestores têm acesso liberado tanto ao painel Urbano quanto Rural
  if (
    profile?.role === 'superadmin' ||
    profile?.role === 'admin' ||
    isPlatformAdminRole(profile?.role) ||
    isPlatformOwnerRole(profile?.role)
  ) {
    return <>{children}</>;
  }

  if (!profile?.organization_id) return <Navigate to="/onboarding" replace />;

  // Ensure organization object is loaded
  if (!profile.organization) return <FullScreenSpinner />;

  const org: any = profile.organization;
  const flags = org?.feature_flags || {};
  const isHybrid =
    org?.niche === 'ambos' ||
    org?.niche === 'hybrid' ||
    org?.is_reseller === true ||
    (flags.rural_module && flags.urban_module);

  if (isHybrid) {
    return <>{children}</>;
  }

  const correctPanel = isRuralOrganization(org?.niche, org?.name, org?.slug)
    ? 'rural'
    : 'urban';

  if (panel !== correctPanel) {
    return <Navigate to={`/${correctPanel}`} replace />;
  }

  return <>{children}</>;
};

export default PanelGuard;
