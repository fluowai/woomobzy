#!/usr/bin/env node

import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(
  `${colors.cyan}Verificando status do banco de dados...${colors.reset}\n`
);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    `${colors.red}Variaveis de ambiente nao configuradas${colors.reset}`
  );
  process.exit(1);
}

async function checkTable(tableName) {
  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${tableName}?limit=1`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json',
        apikey: SUPABASE_KEY,
      },
    };

    const req = https.request(options, (res) => {
      res.resume();
      resolve({ ok: res.statusCode === 200, status: res.statusCode });
    });

    req.on('error', (error) => resolve({ ok: false, error: error.message }));
    req.setTimeout(3000, () => {
      req.destroy(new Error('timeout'));
    });
    req.end();
  });
}

async function main() {
  const tables = [
    'organizations',
    'profiles',
    'properties',
    'leads',
    'landing_pages',
    'site_settings',
    'site_texts',
  ];

  console.log(`${colors.blue}Verificando tabelas:${colors.reset}\n`);

  let allExist = true;
  for (const table of tables) {
    const result = await checkTable(table);
    const status = result.ok
      ? `${colors.green}OK${colors.reset}`
      : `${colors.red}FAIL${colors.reset}`;
    const detail = result.ok
      ? ''
      : ` (${result.status || result.error || 'falha'})`;
    console.log(`  ${status} ${table}${detail}`);
    if (!result.ok) allExist = false;
  }

  console.log();
  if (allExist) {
    console.log(`${colors.green}Todas as tabelas existem.${colors.reset}`);
    console.log(
      `${colors.cyan}Seu banco esta pronto para usar.${colors.reset}\n`
    );
  } else {
    console.log(
      `${colors.red}Algumas tabelas faltam ou nao responderam.${colors.reset}`
    );
    console.log(
      `${colors.yellow}Execute as migrations SQL e valide RLS no Supabase.${colors.reset}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
