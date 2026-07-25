import { logger } from '@/utils/logger';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { supabase, setTenantSupabase } from '@/services/supabase';

const rootElement = document.getElementById('root');
logger.info('Index.tsx: Finding root element...', rootElement);

if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

logger.info('Index.tsx: Creating root...');
const root = ReactDOM.createRoot(rootElement);

// Tenant Resolution for BYOB (Bring Your Own Backend)
async function bootstrapApp() {
  try {
    const hostname = window.location.hostname;
    
    // Default domains that should definitely use the Master DB
    const isMasterDomain = hostname.includes('localhost') || 
                           hostname.includes('imobzy.com.br') || 
                           hostname.includes('vercel.app');
                           
    if (!isMasterDomain) {
      logger.info(`🔍 BYOB: Verificando infraestrutura para o domínio ${hostname}`);
      
      const { data, error } = await supabase
        .from('public_tenant_discovery')
        .select('supabase_url, supabase_anon_key')
        .eq('domain', hostname)
        .single();
        
      if (!error && data && data.supabase_url && data.supabase_anon_key) {
        logger.info(`✨ BYOB: Infraestrutura customizada encontrada! Redirecionando backend...`);
        setTenantSupabase(data.supabase_url, data.supabase_anon_key);
      } else {
        logger.info(`ℹ️ BYOB: Nenhuma infraestrutura customizada encontrada. Usando Master DB.`);
      }
    }
  } catch (err) {
    logger.error('❌ BYOB: Erro ao resolver tenant infrastructure', err);
  }

  logger.info('Index.tsx: Rendering App...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

bootstrapApp();
