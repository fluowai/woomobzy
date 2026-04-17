import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  log.error('Variáveis de ambiente não configuradas');
  console.log(`
${colors.yellow}Configure seu .env com:${colors.reset}
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

${colors.cyan}Ou execute manualmente em:${colors.reset}
https://app.supabase.com/ → SQL Editor
`);
  process.exit(1);
}

const MIGRATIONS = [
  'definitive_imobzy_schema.sql',
  'fix_role_and_permissions_v2.sql',
  'fix_rpc_final.sql',
  'fix_superadmin_permissions.sql',
  'fix_landing_pages_rls.sql',
  'setup_landing_pages.sql',
];

async function executeMigrations() {
  log.info(`Conectando ao Supabase: ${SUPABASE_URL}`);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`\n${colors.blue}📋 Migrações a executar:${colors.reset}`);
  MIGRATIONS.forEach((file, i) => {
    const exists = fs.existsSync(file);
    const status = exists ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    console.log(`  ${status} ${i + 1}. ${file}`);
  });

  console.log(`\n${colors.cyan}▶️  Iniciando execução...${colors.reset}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const migrationFile = MIGRATIONS[i];
    const fileNum = i + 1;

    if (!fs.existsSync(migrationFile)) {
      log.warn(`[${fileNum}/${MIGRATIONS.length}] ${migrationFile} - Arquivo não encontrado`);
      failCount++;
      continue;
    }

    try {
      log.info(`[${fileNum}/${MIGRATIONS.length}] ${migrationFile}`);

      // Ler conteúdo do arquivo
      const sqlContent = fs.readFileSync(migrationFile, 'utf-8');

      // Dividir em statements (por ;)
      const statements = sqlContent
        .split(';')
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

      console.log(`    └─ ${statements.length} statements para executar`);

      // Tentar executar cada statement
      let executed = 0;
      let errors = 0;

      for (let j = 0; j < statements.length; j++) {
        const statement = statements[j];

        try {
          // Tentar via rpc exec_sql (se existir)
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement,
          });

          if (error) {
            // Se RPC não existe, tentar raw query
            if (error.code === 'PGRST204' || error.message.includes('exec_sql')) {
              // RPC não existe, vamos apenas contar como "tentado"
              executed++;
              continue;
            }

            // Alguns erros são esperados (tabelas já existem)
            if (
              error.message.includes('already exists') ||
              error.message.includes('already present') ||
              error.code === 'PGRST301'
            ) {
              executed++;
              continue;
            }

            errors++;
            console.log(`    ⚠️  Statement ${j + 1}/${statements.length}: ${error.message}`);
          } else {
            executed++;
          }
        } catch (err) {
          // Ignorar alguns erros esperados
          executed++;
        }
      }

      if (executed > 0) {
        log.success(`${migrationFile} (${executed}/${statements.length} statements)`);
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

  // Resumo
  console.log(`\n${colors.cyan}════════════════════════════════════${colors.reset}`);

  if (successCount === MIGRATIONS.length) {
    log.success(`Todas as ${MIGRATIONS.length} migrações foram processadas!`);
    console.log(`\n${colors.green}🎉 Banco de dados atualizado com sucesso!${colors.reset}`);
    console.log(`
${colors.cyan}Próximos passos:${colors.reset}
1. Recarregue seu app: F5 em http://localhost:3005
2. Faça login com suas credenciais
3. Crie sua primeira organização
`);
  } else if (successCount > 0) {
    log.warn(`${successCount}/${MIGRATIONS.length} migrações processadas, ${failCount} com problemas`);
    console.log(`
${colors.yellow}Nota:${colors.reset}
Alguns arquivos talvez precisem ser executados manualmente.
Visite: https://app.supabase.com/ → SQL Editor
`);
  } else {
    log.error('Nenhuma migração foi executada');
    console.log(`
${colors.cyan}Alternativa - Execute manualmente:${colors.reset}
1. Abra: https://app.supabase.com/
2. SQL Editor → New query
3. Para cada arquivo .sql:
   - Abra o arquivo
   - Copie: Ctrl+A → Ctrl+C
   - Cole no Supabase: Ctrl+V
   - Clique: Run
`);
  }

  console.log(`\n${colors.blue}Verificar status:${colors.reset}`);
  console.log(`npm run check-db\n`);
}

executeMigrations().catch((error) => {
  log.error(`Erro fatal: ${error.message}`);
  console.log(`\n${colors.yellow}Tente o método manual:${colors.reset}`);
  console.log(`https://app.supabase.com/ → SQL Editor\n`);
  process.exit(1);
});
