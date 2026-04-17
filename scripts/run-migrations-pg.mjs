#!/usr/bin/env node

import fs from 'fs';
import pg from 'pg';
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
║  IMOBZY - Migrações PostgreSQL       ║
╚════════════════════════════════════════╝
${colors.reset}`);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`${colors.red}❌ Credenciais não encontradas${colors.reset}`);
  process.exit(1);
}

// Extrair informações da URL do Supabase
const url = new URL(SUPABASE_URL);
const host = `db.${url.hostname}`;
const database = 'postgres';
const user = 'postgres';
const password = SERVICE_ROLE_KEY;
const port = 5432;

const client = new pg.Client({
  host,
  port,
  database,
  user,
  password,
  ssl: { rejectUnauthorized: false }
});

async function runMigrations() {
  try {
    console.log(`${colors.blue}🔌 Conectando ao banco...${colors.reset}`);
    await client.connect();

    const migrations = [
      'create_exec_sql.sql',
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

      try {
        await client.query(sql);
        console.log(`${colors.green}✅ Executado com sucesso${colors.reset}`);
      } catch (error) {
        console.log(`${colors.red}❌ Erro: ${error.message}${colors.reset}`);
        // Continue com a próxima migração
      }
    }

    console.log(`\n${colors.green}🎉 Processo concluído!${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}❌ Erro de conexão: ${error.message}${colors.reset}`);
  } finally {
    await client.end();
  }
}

runMigrations();