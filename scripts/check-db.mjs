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

console.log(`${colors.cyan}🔍 Verificando status do banco de dados...${colors.reset}\n`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`${colors.red}❌ Variáveis de ambiente não configuradas${colors.reset}`);
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
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => resolve(false));
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

  console.log(`${colors.blue}📋 Verificando tabelas:${colors.reset}\n`);

  let allExist = true;
  for (const table of tables) {
    const exists = await checkTable(table);
    const status = exists ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    console.log(`  ${status} ${table}`);
    if (!exists) allExist = false;
  }

  console.log();
  if (allExist) {
    console.log(`${colors.green}✅ Todas as tabelas existem!${colors.reset}`);
    console.log(`${colors.cyan}Seu banco está pronto para usar.${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ Algumas tabelas faltam${colors.reset}`);
    console.log(`${colors.yellow}Execute as migrações SQL:${colors.reset}`);
    console.log(`
  1. Abra: https://app.supabase.com/
  2. SQL Editor → New query
  3. Para cada arquivo .sql (na ordem):
     - definitive_imobzy_schema.sql (PRIMEIRO!)
     - fix_role_and_permissions_v2.sql
     - fix_rpc_final.sql
     - fix_landing_pages_rls.sql
     - setup_landing_pages.sql
  4. Recarregue seu app: F5
    `);
  }
}

main().catch(console.error);
