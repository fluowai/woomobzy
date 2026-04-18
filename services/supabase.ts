import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!'
  );
  console.error(
    'Certifique-se de que VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY estão definidas no arquivo .env'
  );
  console.error('Exemplo:');
  console.error('VITE_SUPABASE_URL=https://seu-projeto.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=sua-chave-aqui');

  // Criar cliente mock para evitar crash total
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

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// No frontend, o organization_id deve ser derivado do Perfil ou do Impersonation
// Usamos o global.headers para que o backend receba a intenção de impersonação para validação segura
const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const impId = sessionStorage.getItem('impersonated_org_id');
    if (impId && impId !== 'null') {
      headers['x-impersonate-org-id'] = impId;
    }
  }

  return headers;
};

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    global: {
      headers: getHeaders()
    }
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

