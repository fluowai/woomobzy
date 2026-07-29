import { logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';
import { getRuntimeEnv } from '@/utils/runtimeConfig';
import { getImpersonationHeaders } from '@/src/lib/impersonation';

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

const buildSupabaseFetch = () => async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  for (const [key, value] of Object.entries(getImpersonationHeaders())) {
    headers.set(key, value);
  }

  return fetch(input, {
    ...init,
    headers,
  });
};

let activeClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    global: {
      fetch: buildSupabaseFetch(),
    },
  }
);

export const setTenantSupabase = (url: string, key: string) => {
  activeClient = createClient(url, key, {
    global: {
      fetch: buildSupabaseFetch(),
    },
  });
  logger.info(
    `🔌 BYOB: Cliente Supabase atualizado para locatário com URL: ${url}`
  );
};

export const supabase = new Proxy({} as any, {
  get(target, prop) {
    if (!activeClient) {
      throw new Error('Supabase client not initialized');
    }
    const value = (activeClient as any)[prop];
    return typeof value === 'function' ? value.bind(activeClient) : value;
  },
});

export const publicSupabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'wootech-imob-public-supabase-auth',
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }
);

export const refreshSupabaseHeaders = () => {
  // Os headers de impersonação agora são resolvidos por requisição.
  // Mantido por compatibilidade com chamadas existentes.
};
