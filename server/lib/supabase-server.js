/**
 * server/lib/supabase-server.js
 *
 * Singleton LAZY do cliente Supabase com service role.
 *
 * Por que lazy?
 * Em Node.js ESM, os `import` são hoisted e todos os módulos do grafo
 * (routes, middleware, etc.) executam seu código de nível de módulo ANTES
 * que o corpo de server/index.js rode dotenv.config(). Se criássemos o
 * cliente no topo de cada arquivo, o servidor crasharia no boot quando as
 * variáveis de ambiente não estiverem disponíveis no boot.
 * Inicializar sob demanda resolve o problema.
 */

import { createClient } from '@supabase/supabase-js';

let _client = null;
let _authClient = null;

function getSupabaseUrl() {
  return (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();
}

/**
 * Retorna o cliente Supabase (service role) singleton.
 * Inicializado na primeira chamada — seguro contra ESM hoisting.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseServer() {
  if (_client) return _client;

  const url = getSupabaseUrl();

  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !key) {
    throw new Error(
      '❌ Variáveis de ambiente obrigatórias não configuradas.\n' +
      '   Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.\n' +
      '   → Em produção: configure as variáveis no ambiente do servidor.\n' +
      '   → Em desenvolvimento: verifique o arquivo .env na raiz do projeto.'
    );
  }

  _client = createClient(url, key);
  return _client;
}

/**
 * Cliente público usado exclusivamente para validar sessões de usuários.
 * A autenticação não deve depender da service role, que pode ser rotacionada
 * separadamente das sessões emitidas pelo Supabase Auth.
 */
export function getSupabaseAuthServer() {
  if (_authClient) return _authClient;

  const url = getSupabaseUrl();
  const key = (
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url || !key) {
    throw new Error(
      'Variáveis de autenticação obrigatórias não configuradas. ' +
      'Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
    );
  }

  _authClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _authClient;
}
