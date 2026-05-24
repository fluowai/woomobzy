import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { callApi } from '../src/lib/api';
import { useAuth } from './AuthContext';

export type EnvironmentType = 'urban' | 'rural';

export interface Environment {
  id: string;
  type: EnvironmentType;
  name: string;
  slug: string;
  status: string;
  is_primary: boolean;
  brand_config?: Record<string, unknown>;
  feature_flags?: Record<string, unknown>;
}

interface EnvironmentContextValue {
  activeEnvironment: Environment | null;
  activeEnvironmentId: string | null;
  activeEnvironmentType: EnvironmentType | null;
  environments: Environment[];
  loading: boolean;
  loadEnvironments: () => Promise<Environment[]>;
  switchEnvironment: (type: EnvironmentType) => Promise<Environment | null>;
  getEnvironmentByType: (type: EnvironmentType) => Environment | null;
  createEnvironment: (type: EnvironmentType, name?: string) => Promise<Environment>;
}

const EnvironmentContext = createContext<EnvironmentContextValue | undefined>(undefined);

const STORAGE_ID = 'active_environment_id';
const STORAGE_TYPE = 'active_environment_type';

const pathToType = (pathname: string): EnvironmentType | null => {
  if (pathname.startsWith('/urban')) return 'urban';
  if (pathname.startsWith('/rural')) return 'rural';
  return null;
};

const typeToPath = (type: EnvironmentType) => (type === 'rural' ? '/rural' : '/urban');

export const EnvironmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(false);

  const persistEnvironment = useCallback((environment: Environment | null) => {
    setActiveEnvironment(environment);
    if (environment) {
      localStorage.setItem(STORAGE_ID, environment.id);
      localStorage.setItem(STORAGE_TYPE, environment.type);
      sessionStorage.setItem(STORAGE_ID, environment.id);
    } else {
      localStorage.removeItem(STORAGE_ID);
      localStorage.removeItem(STORAGE_TYPE);
      sessionStorage.removeItem(STORAGE_ID);
    }
  }, []);

  const loadEnvironments = useCallback(async () => {
    if (!user || !profile?.organization_id) {
      setEnvironments([]);
      persistEnvironment(null);
      return [];
    }

    setLoading(true);
    try {
      const data = await callApi('/api/environments');
      const list = Array.isArray(data) ? data : [];
      setEnvironments(list);
      const routeType = typeof window !== 'undefined' ? pathToType(window.location.pathname) : null;
      const routeEnvironment = routeType ? list.find((environment) => environment.type === routeType) : null;
      const storedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_ID) : null;
      const storedEnvironment = storedId ? list.find((environment) => environment.id === storedId) : null;
      persistEnvironment(routeEnvironment || storedEnvironment || list.find((environment) => environment.is_primary) || list[0] || null);
      return list;
    } finally {
      setLoading(false);
    }
  }, [persistEnvironment, profile?.organization_id, user]);

  const getEnvironmentByType = useCallback(
    (type: EnvironmentType) => environments.find((environment) => environment.type === type) || null,
    [environments]
  );

  const switchEnvironment = useCallback(
    async (type: EnvironmentType) => {
      const existing = getEnvironmentByType(type);
      if (!existing) {
        navigate(`/activate-environment/${type}`);
        return null;
      }

      const environment = await callApi(`/api/environments/${existing.id}/activate`, { method: 'POST' });
      persistEnvironment(environment);
      navigate(typeToPath(type));
      return environment;
    },
    [getEnvironmentByType, navigate, persistEnvironment]
  );

  const createEnvironment = useCallback(
    async (type: EnvironmentType, name?: string) => {
      const environment = await callApi('/api/environments', {
        method: 'POST',
        body: JSON.stringify({ type, name: name || (type === 'rural' ? 'Imobzy Rural' : 'Imobzy Urbana') }),
      });
      const list = await loadEnvironments();
      setEnvironments(list.some((item) => item.id === environment.id) ? list : [...list, environment]);
      persistEnvironment(environment);
      return environment;
    },
    [loadEnvironments, persistEnvironment]
  );

  useEffect(() => {
    if (!authLoading) {
      loadEnvironments().catch(() => {
        setEnvironments([]);
      });
    }
  }, [authLoading, loadEnvironments]);

  useEffect(() => {
    const routeType = pathToType(location.pathname);
    if (!routeType || environments.length === 0) return;

    const routeEnvironment = environments.find((environment) => environment.type === routeType);
    if (routeEnvironment && routeEnvironment.id !== activeEnvironment?.id) {
      persistEnvironment(routeEnvironment);
      return;
    }

    if (!routeEnvironment && !location.pathname.startsWith('/activate-environment')) {
      navigate(`/activate-environment/${routeType}`, { replace: true });
    }
  }, [activeEnvironment?.id, environments, location.pathname, navigate, persistEnvironment]);

  const value = useMemo(
    () => ({
      activeEnvironment,
      activeEnvironmentId: activeEnvironment?.id || null,
      activeEnvironmentType: activeEnvironment?.type || null,
      environments,
      loading,
      loadEnvironments,
      switchEnvironment,
      getEnvironmentByType,
      createEnvironment,
    }),
    [activeEnvironment, createEnvironment, environments, getEnvironmentByType, loadEnvironments, loading, switchEnvironment]
  );

  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
};

export const useEnvironment = () => {
  const context = useContext(EnvironmentContext);
  if (!context) {
    throw new Error('useEnvironment deve ser usado dentro de EnvironmentProvider');
  }
  return context;
};
