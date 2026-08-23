import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTenantPanelPath,
  isMegaAdminProfile,
  isPlatformAdminRole,
} from '../src/lib/panelNavigation';
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
  '/sites/',
  '/embreve',
  '/login',
  '/register',
  '/impersonate',
];

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some((publicPath) =>
    publicPath === '/' ? path === '/' : path.startsWith(publicPath)
  );
}

const SuperAdminGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { profile, isImpersonating, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullScreenSpinner />;

  const role = (profile?.role || '').toLowerCase();
  const isSuperAdmin = isPlatformAdminRole(role);

  if (isSuperAdmin && !isImpersonating) {
    const path = location.pathname;
    const isCurrentPathPublic = isPublicPath(path);
    const isMegaAdmin = isMegaAdminProfile(profile);

    if (isMegaAdmin) {
      if (
        !isCurrentPathPublic &&
        !path.startsWith('/megaadmin') &&
        path !== '/login' &&
        path !== '/impersonate'
      ) {
        return <Navigate to="/megaadmin" replace />;
      }
    } else {
      if (
        !isCurrentPathPublic &&
        !path.startsWith('/superadmin') &&
        path !== '/login' &&
        path !== '/impersonate'
      ) {
        return <Navigate to="/superadmin" replace />;
      }
    }
  } else if (profile && !isPlatformAdminRole(role) && !isImpersonating) {
    const path = location.pathname;
    if (path.startsWith('/megaadmin') || path.startsWith('/superadmin')) {
      const target = getTenantPanelPath(profile);
      return <Navigate to={target} replace />;
    }
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
