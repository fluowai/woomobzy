import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

/**
 * TENANT CONTEXT
 * Gerencia informações do tenant atual no site público
 */

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  settings: any;
  plan: string;
}

interface TenantContextType {
  tenant: Tenant | null;
  loading: boolean;
  error: string | null;
  refreshTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar informações do tenant baseado no domínio atual
      const response = await fetch('/api/tenant/current');
      
      if (!response.ok) {
        throw new Error('Falha ao carregar informações do site');
      }
      
      const data = await response.json();
      setTenant(data);
      
      console.log('✅ Tenant carregado:', data.name);
    } catch (err: any) {
      console.error('❌ Erro ao carregar tenant:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, []);

  const refreshTenant = async () => {
    await fetchTenant();
  };

  return (
    <TenantContext.Provider value={{ tenant, loading, error, refreshTenant }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = (): TenantContextType => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

export default TenantContext;
