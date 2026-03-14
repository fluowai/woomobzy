#!/usr/bin/env node

/**
 * IMOBZY - PostgreSQL Direct Execution
 * Connects directly to Supabase PostgreSQL and executes migrations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Parse Supabase project ID from URL
const projectId = SUPABASE_URL?.match(/https:\/\/(\w+)\.supabase\.co/)?.[1];

// Supabase PostgreSQL connection details
const connectionConfig = {
  host: `${projectId}.pooler.supabase.com`,
  port: 6543,
  database: 'postgres',
  user: 'postgres.ltrmgfdpqtvypsxeknyd', // Format: postgres.{project-ref}
  password: SERVICE_ROLE_KEY || '',
  ssl: {
    rejectUnauthorized: false,
  },
};

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
╔═════════════════════════════════════════════════════════╗
║  IMOBZY - PostgreSQL Direct Migration Executor         ║
║  Conectando direto ao banco PostgreSQL do Supabase...  ║
╚═════════════════════════════════════════════════════════╝
${colors.reset}`);

const MIGRATIONS = [
  'definitive_imobzy_schema.sql',
  'fix_role_and_permissions_v2.sql',
  'fix_rpc_final.sql',
  'fix_landing_pages_rls.sql',
  'setup_landing_pages.sql',
];

async function executeMigrations() {
  if (!projectId) {
    log.error('Não foi possível extrair project ID do Supabase URL');
    process.exit(1);
  }

  const client = new Client(connectionConfig);

  try {
    // Connect to database
    log.info(`Conectando a: ${connectionConfig.host}:${connectionConfig.port}`);
    await client.connect();
    log.success('Conectado ao PostgreSQL do Supabase!\n');

    // List migrations
    console.log(`${colors.blue}📋 Migrações a executar:${colors.reset}`);
    const projectRoot = path.join(__dirname, '..');

    MIGRATIONS.forEach((file, i) => {
      const filePath = path.join(projectRoot, file);
      const exists = fs.existsSync(filePath);
      const status = exists ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
      console.log(`  ${status} ${i + 1}. ${file}`);
    });

    console.log(`\n${colors.cyan}▶️  Iniciando execução...${colors.reset}\n`);

    let successCount = 0;
    let failCount = 0;
    let totalStatements = 0;
    let totalErrors = 0;

    // Execute each migration
    for (let i = 0; i < MIGRATIONS.length; i++) {
      const migrationFile = MIGRATIONS[i];
      const filePath = path.join(projectRoot, migrationFile);
      const fileNum = i + 1;

      if (!fs.existsSync(filePath)) {
        log.warn(`[${fileNum}/${MIGRATIONS.length}] ${migrationFile} - Arquivo não encontrado`);
        failCount++;
        continue;
      }

      try {
        log.info(`[${fileNum}/${MIGRATIONS.length}] ${migrationFile}`);

        // Read SQL file
        const sqlContent = fs.readFileSync(filePath, 'utf-8');

        // Split statements more carefully (preserve multi-line statements)
        const statements = sqlContent
          .split(';')
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

        console.log(`    └─ ${statements.length} statements para executar`);
        totalStatements += statements.length;

        let executedCount = 0;
        let errorCount = 0;

        // Execute each statement
        for (let j = 0; j < statements.length; j++) {
          const statement = statements[j];

          try {
            await client.query(statement);
            executedCount++;
          } catch (err) {
            // Some errors are expected (already exists, etc)
            if (
              err.message.includes('already exists') ||
              err.message.includes('already present') ||
              err.message.includes('duplicate key') ||
              err.code === '42P07' || // relation already exists
              err.code === '23505'    // unique violation
            ) {
              // Expected error - consider as success
              executedCount++;
            } else {
              errorCount++;
              totalErrors++;
              console.log(`    ⚠️  Error no statement ${j + 1}: ${err.message.split('\n')[0]}`);
            }
          }
        }

        if (executedCount > 0) {
          log.success(`${migrationFile} (${executedCount}/${statements.length} statements)`);
          successCount++;
        } else {
          log.warn(`${migrationFile} - Nenhum statement foi executado`);
          failCount++;
        }
      } catch (error) {
        log.error(`${migrationFile}: ${error.message}`);
        failCount++;
      }
    }

    // Final summary
    console.log(`\n${colors.cyan}════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}📊 Resumo da Execução:${colors.reset}`);
    console.log(`  Total de statements: ${totalStatements}`);
    console.log(`  Migrações com sucesso: ${successCount}/${MIGRATIONS.length}`);
    console.log(`  Migrações com erro: ${failCount}/${MIGRATIONS.length}`);
    if (totalErrors > 0) {
      console.log(`  Statements com erro: ${totalErrors}`);
    }

    if (successCount > 0) {
      log.success(`${successCount}/${MIGRATIONS.length} migrações executadas com sucesso!`);
      console.log(`\n${colors.green}🎉 Banco de dados atualizado!${colors.reset}`);
      console.log(`
${colors.cyan}Próximos passos:${colors.reset}
1. Recarregue seu app: F5 em http://localhost:3005
2. Abra o console: F12
3. O erro PGRST205 deve ter desaparecido ✅
4. Faça login com suas credenciais Supabase
5. Crie sua primeira organização

${colors.cyan}Verificar status:${colors.reset}
npm run check-db
`);
    } else {
      log.error('Nenhuma migração foi executada com sucesso');
    }

    return successCount > 0;
  } catch (error) {
    log.error(`Erro ao conectar: ${error.message}`);
    console.log(`\n${colors.yellow}Dicas:${colors.reset}`);
    console.log('1. Verifique se as credenciais no .env estão corretas');
    console.log('2. Verifique se seu projeto Supabase está ativo');
    console.log('3. Tente executar manualmente em https://app.supabase.com/ → SQL Editor');
    return false;
  } finally {
    // Close connection
    await client.end();
  }
}

// Run
executeMigrations()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    log.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  });
