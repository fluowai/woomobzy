#!/usr/bin/env node

/**
 * IMOBZY - Executar Migrações SQL via Supabase CLI
 *
 * Como o Supabase não permite SQL raw via API por segurança,
 * este script tenta usar a CLI ou abre o dashboard para execução manual.
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║  IMOBZY - Executar Migrações SQL      ║
╚════════════════════════════════════════╝
${colors.reset}`);

// Verificar se Supabase CLI está disponível
function hasSupabaseCLI() {
  try {
    execSync('supabase --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function checkDatabaseTables() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const tables = [
    'organizations',
    'profiles',
    'properties',
    'leads',
    'landing_pages',
    'site_settings',
  ];

  const results = {};
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(0);
      results[table] = !error || error.code !== 'PGRST204';
    } catch {
      results[table] = false;
    }
  }
  return results;
}

async function main() {
  // 1. Tentar verificar tabelas
  console.log(
    `${colors.blue}📋 Verificando banco de dados...${colors.reset}\n`
  );

  const dbStatus = await checkDatabaseTables();

  if (dbStatus) {
    const totalTables = Object.values(dbStatus).length;
    const existingTables = Object.values(dbStatus).filter(Boolean).length;

    console.log(`${colors.blue}Tabelas encontradas:${colors.reset}`);
    Object.entries(dbStatus).forEach(([table, exists]) => {
      const status = exists
        ? `${colors.green}✅${colors.reset}`
        : `${colors.red}❌${colors.reset}`;
      console.log(`  ${status} ${table}`);
    });

    if (existingTables === totalTables) {
      log.success('Todas as tabelas existem! Banco pronto para usar.');
      console.log(
        `\n${colors.green}🎉 Sua aplicação está completamente pronta!${colors.reset}`
      );
      console.log(`
${colors.cyan}Próximos passos:${colors.reset}
1. Recarregue seu app: F5 em http://localhost:3005
2. Faça login com suas credenciais
3. Crie sua primeira organização
`);
      return;
    }
  }

  // 2. Migrações não estão disponíveis via API
  console.log(
    `\n${colors.yellow}⚠️  Migrações SQL precisam ser executadas manualmente${colors.reset}`
  );

  // 3. Verificar sistema operacional para abrir URL
  const platform = process.platform;
  const projectId = SUPABASE_URL?.match(/https:\/\/(\w+)\.supabase\.co/)?.[1];

  if (!projectId) {
    log.error('Não foi possível extrair ID do projeto');
    return;
  }

  const sqlEditorUrl = `https://app.supabase.com/project/${projectId}/sql/`;

  console.log(`
${colors.green}📝 Método 1: Web Interface (Recomendado - 5 minutos)${colors.reset}

  1. Abrindo Supabase Dashboard...
  2. SQL Editor será aberto automaticamente
  3. Para cada arquivo .sql:
     - Abra o arquivo localmente
     - Copie: Ctrl+A → Ctrl+C
     - Cole no Supabase: Ctrl+V
     - Clique: Run
  4. Ordem (IMPORTANTE):
     1️⃣  definitive_imobzy_schema.sql
     2️⃣  fix_role_and_permissions_v2.sql
     3️⃣  fix_rpc_final.sql
     4️⃣  fix_landing_pages_rls.sql
     5️⃣  setup_landing_pages.sql

${colors.blue}Abrindo no navegador...${colors.reset}
`);

  // Tentar abrir o navegador
  try {
    if (platform === 'win32') {
      execSync(`start ${sqlEditorUrl}`);
    } else if (platform === 'darwin') {
      execSync(`open "${sqlEditorUrl}"`);
    } else {
      execSync(`xdg-open "${sqlEditorUrl}"`);
    }
    log.success('Dashboard aberto no navegador!');
  } catch (error) {
    log.warn('Não foi possível abrir o navegador automaticamente');
    console.log(
      `\nAcesse manualmente: ${colors.cyan}${sqlEditorUrl}${colors.reset}`
    );
  }

  // 4. Sugerir alternativa CLI
  if (!hasSupabaseCLI()) {
    console.log(`\n${colors.green}📦 Método 2: Supabase CLI (Alternativo)${colors.reset}

  Se preferir usar CLI:

  npm install -g @supabase/cli
  supabase login
  supabase link --project-ref ${projectId}
  supabase db push
`);
  }

  console.log(
    `\n${colors.cyan}📊 Quando terminar, verifique o status:${colors.reset}`
  );
  console.log(`npm run check-db\n`);
}

main().catch(console.error);
