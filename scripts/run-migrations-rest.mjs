#!/usr/bin/env node

import fs from 'fs';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║  IMOBZY - Migrações via REST API     ║
╚════════════════════════════════════════╝
${colors.reset}`);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`${colors.red}❌ Credenciais não encontradas${colors.reset}`);
  process.exit(1);
}

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;
    const data = JSON.stringify({ sql });

    const options = {
      hostname: new URL(url).hostname,
      port: 443,
      path: new URL(url).pathname + new URL(url).search,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'apikey': SERVICE_ROLE_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          resolve({ error: `HTTP ${res.statusCode}: ${body}` });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runMigrations() {
  const migrations = [
    'definitive_imobzy_schema.sql',
    'fix_role_and_permissions_v2.sql',
    'fix_rpc_final.sql',
    'fix_landing_pages_rls.sql',
    'setup_landing_pages.sql',
    'seed_admin_user.sql',
  ];

  console.log(`\n${colors.blue}📋 Executando migrações...${colors.reset}\n`);

  for (let i = 0; i < migrations.length; i++) {
    const file = migrations[i];
    console.log(`${colors.blue}ℹ [${i + 1}/${migrations.length}] ${file}${colors.reset}`);

    if (!fs.existsSync(file)) {
      console.log(`${colors.red}❌ Arquivo não encontrado: ${file}${colors.reset}`);
      continue;
    }

    const sql = fs.readFileSync(file, 'utf-8');
    const result = await executeSQL(sql);

    if (result.error) {
      console.log(`${colors.red}❌ Erro: ${result.error}${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Executado com sucesso${colors.reset}`);
    }
  }

  console.log(`\n${colors.green}🎉 Processo concluído!${colors.reset}`);
}

runMigrations().catch(console.error);