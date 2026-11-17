import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAuthenticatedPanelPath, isMegaAdminProfile, isPlatformOwnerRole } from '../src/lib/panelNavigation';
import FullScreenSpinner from './FullScreenSpinner';

const MegaAdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  if ((!isMegaAdminProfile(profile) && !isPlatformOwnerRole(profile?.role)) || isImpersonating) {
    return <Navigate to={getAuthenticatedPanelPath(profile, isImpersonating)} replace />;
  }

  return <>{children}</>;
};

export default MegaAdminGuard;
