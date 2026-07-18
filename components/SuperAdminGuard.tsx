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

    if (
      !isPublicPath &&
      !path.startsWith('/superadmin') &&
      path !== '/login' &&
      path !== '/impersonate'
    ) {
      return <Navigate to="/superadmin" replace />;
    }
  }

  return <>{children}</>;
};

export default SuperAdminGuard;
