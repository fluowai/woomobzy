import { logger } from '@/utils/logger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { supabase, setTenantSupabase } from '@/services/supabase';
import { isMasterHostname } from '@/src/lib/tenantBootstrap';

const rootElement = document.getElementById('root');
logger.info('Index.tsx: Finding root element...', rootElement);

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

logger.info('Index.tsx: Creating root...');
const root = ReactDOM.createRoot(rootElement);

function bootstrapApp() {
  const hostname = window.location.hostname;

  const isMasterDomain = isMasterHostname(hostname);

  if (!isMasterDomain) {
    logger.info(
      `🔍 BYOB: Verificando infraestrutura para o domínio ${hostname}`
    );

    supabase
      .from('public_tenant_discovery')
      .select('supabase_url, supabase_anon_key')
      .eq('domain', hostname)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data && data.supabase_url && data.supabase_anon_key) {
          logger.info(
            `✨ BYOB: Infraestrutura customizada encontrada! Redirecionando backend...`
          );
          setTenantSupabase(data.supabase_url, data.supabase_anon_key);
        } else {
          logger.info(
            `ℹ️ BYOB: Nenhuma infraestrutura customizada encontrada. Usando Master DB.`
          );
        }
      })
      .catch((err) => {
        logger.error('❌ BYOB: Erro ao resolver tenant infrastructure', err);
      });
  }
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

bootstrapApp();
