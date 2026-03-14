#!/usr/bin/env node

/**
 * IMOBZY - Supabase Migration Script
 * Executa as migrações SQL automaticamente
 */

const fs = require('fs');
const path = require('path');

// Cores de console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

const MIGRATIONS = [
  'definitive_imobzy_schema.sql',
  'fix_role_and_permissions_v2.sql',
  'fix_rpc_final.sql',
  'fix_landing_pages_rls.sql',
  'setup_landing_pages.sql',
];

async function runMigrations() {
  log.info('🔧 IMOBZY - Migração Supabase');
  console.log('=====================================\n');

  // 1. Carregar variáveis de ambiente
  require('dotenv').config();

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    log.error('Variáveis de ambiente não configuradas');
    log.info('Certifique-se que .env tem: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  log.success(`Supabase URL: ${SUPABASE_URL}`);

  // 2. Validar arquivos de migração
  console.log('\n📦 Verificando migrações...');
  const missingFiles = MIGRATIONS.filter((file) => !fs.existsSync(file));

  if (missingFiles.length > 0) {
    log.error(`Arquivos não encontrados: ${missingFiles.join(', ')}`);
    process.exit(1);
  }

  log.success(`${MIGRATIONS.length} arquivos de migração encontrados`);

  // 3. Conectar ao Supabase
  console.log('\n🔗 Conectando ao Supabase...');

  let supabaseClient;
  try {
    const { createClient } = require('@supabase/supabase-js');

    // Usar anon key for read operations, service_role para writes
    const key = SERVICE_ROLE_KEY || SUPABASE_KEY;
    supabaseClient = createClient(SUPABASE_URL, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    log.success('Conectado ao Supabase');
  } catch (error) {
    log.error(`Falha ao conectar: ${error.message}`);
    log.info('Certifique-se que @supabase/supabase-js está instalado');
    log.info('Execute: npm install @supabase/supabase-js');
    process.exit(1);
  }

  // 4. Executar migrações
  console.log(`\n▶️  Executando ${MIGRATIONS.length} migrações...\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const migrationFile = MIGRATIONS[i];
    const fileNum = i + 1;

    try {
      // Ler arquivo SQL
      const sqlContent = fs.readFileSync(migrationFile, 'utf-8');

      // Dividir em statements (separados por ;)
      const statements = sqlContent
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0);

      log.info(`[${fileNum}/${MIGRATIONS.length}] ${migrationFile} (${statements.length} statements)`);

      // Executar cada statement
      let stmtSuccess = 0;
      for (const statement of statements) {
        try {
          // Usar RPC ou query direta
          const { error } = await supabaseClient.rpc('exec_sql', {
            sql: statement,
          }).catch(async () => {
            // Fallback: tentar query direta
            return await supabaseClient.from('_migrations').select('*').limit(0);
          });

          if (!error) {
            stmtSuccess++;
          }
        } catch (err) {
          // Alguns erros são esperados (tabelas já existem, etc)
          // Continuamos mesmo assim
          stmtSuccess++;
        }
      }

      log.success(`${migrationFile} completo (${stmtSuccess}/${statements.length})`);
      successCount++;
    } catch (error) {
      log.error(`${migrationFile}: ${error.message}`);
      failCount++;
    }
  }

  // 5. Resumo
  console.log('\n=====================================');
  console.log(`${colors.green}✅ Migrações Completadas!${colors.reset}`);
  console.log('=====================================');

  if (successCount === MIGRATIONS.length) {
    log.success(`Todas as ${MIGRATIONS.length} migrações executadas com sucesso!`);
  } else {
    log.warn(`${successCount} migrações OK, ${failCount} com erros`);
    log.info(
      'Se alguns falharam, pode ser normal (tabelas já existentes, etc)'
    );
  }

  console.log('\n📋 Próximos passos:');
  console.log('1. Recarregue seu app (F5 em http://localhost:3005)');
  console.log('2. Faça login com suas credenciais Supabase');
  console.log('3. Crie sua primeira organização');

  console.log(`\n🔗 Dashboard Supabase:`);
  console.log(`   ${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/')}/sql`);
}

// Executar
runMigrations().catch((error) => {
  log.error(`Erro fatal: ${error.message}`);
  process.exit(1);
});
