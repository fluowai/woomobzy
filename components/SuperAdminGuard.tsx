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

const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isImpersonating, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;

  if (profile?.role === 'superadmin' && !isImpersonating) {
    const path = location.pathname;
    const isPublicPath = PUBLIC_PATHS.some((publicPath) =>
      publicPath === '/' ? path === '/' : path.startsWith(publicPath)
    );

    const isMegaAdmin = !profile?.organization?.is_reseller;

    if (isMegaAdmin) {
      if (
        !isPublicPath &&
        !path.startsWith('/megaadmin') &&
        path !== '/login' &&
        path !== '/impersonate'
      ) {
        return <Navigate to="/megaadmin" replace />;
      }
    } else {
      if (
        !isPublicPath &&
        !path.startsWith('/superadmin') &&
        path !== '/login' &&
        path !== '/impersonate'
      ) {
        return <Navigate to="/superadmin" replace />;
      }
    }
  } else if (profile && profile.role !== 'superadmin' && !isImpersonating) {
    const path = location.pathname;
    if (path.startsWith('/megaadmin') || path.startsWith('/superadmin')) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
