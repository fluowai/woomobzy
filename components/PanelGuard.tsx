import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isRuralOrganization } from './NicheRedirect';
import FullScreenSpinner from './FullScreenSpinner';

const PanelGuard: React.FC<{
  panel: 'rural' | 'urban';
  children: React.ReactNode;
}> = ({ panel, children }) => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;
  if (profile?.role === 'superadmin' && !isImpersonating)
    return <>{children}</>;
  if (!profile?.organization_id) return <Navigate to="/onboarding" replace />;

  const org: any = profile.organization;
  const correctPanel = isRuralOrganization(org?.niche, org?.name, org?.slug)
    ? 'rural'
    : 'urban';

  if (panel !== correctPanel) {
    return <Navigate to={`/${correctPanel}`} replace />;
  }

  return <>{children}</>;
};

export default PanelGuard;
