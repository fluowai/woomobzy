import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPanelHomePath } from './NicheRedirect';
import FullScreenSpinner from './FullScreenSpinner';

const isMegaAdmin = (profile: any) =>
  ['superadmin', 'super_admin'].includes(profile?.role?.toLowerCase() || '') &&
  !profile?.organization?.is_reseller;

const MegaAdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  if (!isMegaAdmin(profile) || isImpersonating) {
    return (
      <Navigate to={getPanelHomePath(profile, { isImpersonating })} replace />
    );
  }

  return <>{children}</>;
};

export default MegaAdminGuard;
