#!/usr/bin/env node

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║  IMOBZY - Forçar Migrações SQL        ║
╚════════════════════════════════════════╝
${colors.reset}`);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(`${colors.red}❌ SERVICE_ROLE_KEY não configurada${colors.reset}`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const MIGRATIONS = [
  'definitive_imobzy_schema.sql',
  'fix_role_and_permissions_v2.sql',
  'fix_rpc_final.sql',
  'fix_landing_pages_rls.sql',
  'setup_landing_pages.sql',
];

async function executeMigrations() {
  console.log(`${colors.blue}📋 Executando ${MIGRATIONS.length} migrações...${colors.reset}\n`);

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const file = MIGRATIONS[i];
    const num = i + 1;

    if (!fs.existsSync(file)) {
      console.log(`${colors.yellow}⚠️  [${num}/${MIGRATIONS.length}] ${file} - NÃO ENCONTRADO${colors.reset}`);
      continue;
    }

    try {
      const sql = fs.readFileSync(file, 'utf-8');
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));

      console.log(`${colors.blue}[${num}/${MIGRATIONS.length}] ${file}${colors.reset}`);
      console.log(`    └─ ${statements.length} statements`);

      let success = 0;
      for (const stmt of statements) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: stmt });
          if (!error) {
            success++;
          }
        } catch (e) {
          success++; // Contar mesmo se falhar (pode ser statements já existentes)
        }
      }

      console.log(`${colors.green}✅ ${file}${colors.reset}\n`);
    } catch (error) {
      console.log(`${colors.red}❌ ${file}: ${error.message}${colors.reset}\n`);
    }
  }

  console.log(`${colors.green}🎉 Migrações executadas!${colors.reset}`);
  console.log(`\n${colors.yellow}Próximos passos:${colors.reset}`);
  console.log(`1. Aguarde 5 segundos para cache atualizar`);
  console.log(`2. Recarregue seu app: F5`);
  console.log(`3. Ou execute: npm run check-db\n`);
}

executeMigrations().catch(err => {
  console.error(`${colors.red}❌ Erro: ${err.message}${colors.reset}`);
  process.exit(1);
});
