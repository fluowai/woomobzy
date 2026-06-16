import { logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { getRuntimeEnv } from '@/utils/runtimeConfig';

const supabaseUrl = getRuntimeEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getRuntimeEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error(
    '❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!'
  );

  if (typeof window !== 'undefined') {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText =
      'position:fixed;top:0;left:0;right:0;bottom:0;background:#dc2626;color:white;display:flex;align-items:center;justify-content:center;font-family:sans-serif;z-index:999999;padding:2rem;text-align:center;';
    errorDiv.innerHTML = `
      <div>
        <h1 style="font-size:2rem;margin-bottom:1rem;">⚠️ Erro de Configuração</h1>
        <p style="font-size:1.2rem;margin-bottom:1rem;">As variáveis de ambiente do Supabase não foram encontradas.</p>
        <p style="opacity:0.9;">Verifique o console (F12) para mais detalhes.</p>
      </div>
    `;
    setTimeout(() => document.body?.appendChild(errorDiv), 100);
  }
}

// No frontend, o organization_id deve ser derivado do Perfil ou do Impersonation
// Usamos o global.headers para que o backend receba a intenção de impersonação para validação segura
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const impId = getImpersonatedOrgId();
    if (impId && impId !== 'null') {
      headers['x-impersonate-org-id'] = impId;
    }
  }

  return headers;
};

function getImpersonatedOrgId(): string | null {
  if (typeof window === 'undefined') return null;

  const current = sessionStorage.getItem('impersonated_org_id');
  if (current && current !== 'null' && current !== 'undefined') return current;

  const legacy = localStorage.getItem('impersonatedOrgId');
  if (legacy && legacy !== 'null' && legacy !== 'undefined') {
    sessionStorage.setItem('impersonated_org_id', legacy);
    return legacy;
  }

  return null;
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    global: {
      headers: getHeaders(),
    },
  }
);

export const publicSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'imobfluow-public-supabase-auth',
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

/**
 * Helper para forçar atualização de headers após mudança de impersonação
 * (Ex: logout de suporte)
 */
export const refreshSupabaseHeaders = () => {
  // Como o client do Supabase é um singleton, em alguns casos é necessário
  // que o app recarregue ou que as chamadas individuais injetem os headers.
  // No IMOBZY, o reload é o padrão após troca de tenant de suporte.
  window.location.reload();
};
