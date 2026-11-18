import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getTenantPanelPath,
  isMegaAdminProfile,
  isPlatformAdminRole,
  isPlatformOwnerRole,
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
  const isSuperAdmin = isPlatformAdminRole(role) || isPlatformOwnerRole(role);

  if (isSuperAdmin && !isImpersonating) {
    const path = location.pathname;
    const isCurrentPathPublic = isPublicPath(path);
    const isMegaAdmin =
      isMegaAdminProfile(profile) ||
      (isPlatformOwnerRole(role) && !profile?.organization?.is_reseller);

    // SuperAdmin e MegaAdmin têm acesso livre a todos os painéis (/megaadmin, /woo-control, /superadmin, /urban, /rural)
    const isAllowedAdminPath =
      path.startsWith('/megaadmin') ||
      path.startsWith('/woo-control') ||
      path.startsWith('/superadmin') ||
      path.startsWith('/urban') ||
      path.startsWith('/rural');

    if (
      !isCurrentPathPublic &&
      !isAllowedAdminPath &&
      path !== '/login' &&
      path !== '/impersonate'
    ) {
      if (isMegaAdmin) {
        return (
          <Navigate
            to={isPlatformOwnerRole(role) ? '/woo-control' : '/megaadmin'}
            replace
          />
        );
      }
      return <Navigate to="/superadmin" replace />;
    }
  } else if (profile && !isSuperAdmin && !isImpersonating) {
    const path = location.pathname;
    if (path.startsWith('/megaadmin') || path.startsWith('/superadmin')) {
      const target = getTenantPanelPath(profile);
      return <Navigate to={target} replace />;
    }
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
