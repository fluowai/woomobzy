import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from './FullScreenSpinner';

const isMegaAdmin = (profile: any) =>
  profile?.role === 'superadmin' && !profile?.organization?.is_reseller;

const MegaAdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  if (!isMegaAdmin(profile) || isImpersonating) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default MegaAdminGuard;
