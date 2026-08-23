import { logger } from '@/utils/logger';
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getAuthenticatedPanelPath,
  isRuralOrganization,
} from '../src/lib/panelNavigation';
import FullScreenSpinner from './FullScreenSpinner';

export { isRuralOrganization };

const NicheRedirect: React.FC = () => {
  const { profile, isImpersonating, loading } = useAuth();

  if (loading) return <FullScreenSpinner />;

  const target = getAuthenticatedPanelPath(profile, isImpersonating);

  logger.info(
    `NicheRedirect: Sending ${profile?.email || 'unknown'} to ${target}`
  );
  return <Navigate to={target} replace />;
};

export default NicheRedirect;
