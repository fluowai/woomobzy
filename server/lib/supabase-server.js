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
 * variáveis de ambiente não estiverem disponíveis (ex: Railway sem vars
 * configuradas). Inicializar sob demanda resolve o problema.
 */

import { createClient } from '@supabase/supabase-js';

let _client = null;

/**
 * Retorna o cliente Supabase (service role) singleton.
 * Inicializado na primeira chamada — seguro contra ESM hoisting.
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabaseServer() {
  if (_client) return _client;

  const url = (
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    ''
  ).trim();

  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !key) {
    throw new Error(
      '❌ Variáveis de ambiente obrigatórias não configuradas.\n' +
      '   Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.\n' +
      '   → Em produção (Railway): acesse o dashboard e adicione em "Variables".\n' +
      '   → Em desenvolvimento: verifique o arquivo .env na raiz do projeto.'
    );
  }

  _client = createClient(url, key);
  return _client;
}
