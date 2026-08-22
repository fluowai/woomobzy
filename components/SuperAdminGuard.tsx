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
  
  const isSuperAdmin = (
    role === 'superadmin' ||
    role === 'super_admin' ||
    role === 'megaadmin' ||
    role === 'mega_admin'
  );

  if (isSuperAdmin && !isImpersonating) {
    const path = location.pathname;
    const isCurrentPathPublic = isPublicPath(path);

    const isMegaAdmin = !profile?.organization?.is_reseller;

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
  } else if (profile && !['superadmin', 'super_admin', 'megaadmin', 'mega_admin'].includes(role || '') && !isImpersonating) {
    const path = location.pathname;
    if (path.startsWith('/megaadmin') || path.startsWith('/superadmin')) {
      const niche = profile?.organization?.niche;
      const target = niche === 'rural' ? '/rural' : '/urban';
      return <Navigate to={target} replace />;
    }
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
