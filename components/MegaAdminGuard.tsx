import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FullScreenSpinner from './FullScreenSpinner';

const PUBLIC_PATHS = [
  '/',
  '/vendas',
  '/consultoria',
  '/consultoria/qualificacao',
  '/quiz/',
  '/ajuda/',
  '/lp/',
  '/site/',
  '/embreve',
  '/login',
  '/register',
  '/impersonate',
];

const isMegaAdmin = (profile: any) => {
  const role = String(profile?.role || '').toLowerCase();
  return (
    (role === 'superadmin' ||
      role === 'super_admin' ||
      role === 'megaadmin' ||
      role === 'mega_admin') &&
    !profile?.organization?.is_reseller
  );
};

const MegaAdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isImpersonating, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;

  if (!isMegaAdmin(profile) || isImpersonating) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default MegaAdminGuard;
