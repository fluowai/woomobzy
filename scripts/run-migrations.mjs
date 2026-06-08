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
  info: (msg) => console.log(`${colors.blue}\u2139${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}\u2705 ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}\u274C ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}\u26A0\uFE0F  ${msg}${colors.reset}`),
};

console.log(
  colors.cyan +
    '\n\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557\n\u2551  IMOBZY - Executar Migra\u00E7\u00F5es SQL      \u2551\n\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D\n' +
    colors.reset
);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  log.error('Vari\u00E1veis de ambiente n\u00E3o configuradas');
  console.log(
    '\n' +
      colors.yellow +
      'Configure seu .env com:' +
      colors.reset +
      '\nVITE_SUPABASE_URL=https://your-project.supabase.co\nSUPABASE_SERVICE_ROLE_KEY=your-service-role-key\n\n' +
      colors.cyan +
      'Ou execute manualmente em:' +
      colors.reset +
      '\nhttps://app.supabase.com/ \u2192 SQL Editor\n'
  );
  process.exit(1);
}

const MIGRATIONS = [
  'sql/definitive_imobzy_schema.sql',
  'sql/fix_role_and_permissions_v2.sql',
  'sql/fix_rpc_final.sql',
  'sql/fix_landing_pages_rls.sql',
  'sql/setup_landing_pages.sql',
  'migrations/v6_rural_search_logs.sql',
  'migrations/20260530_fluowai_cloud_migration_control.sql',
  'migrations/20260516_ai_agents_whatsapp_automation.sql',
  'migrations/20260603_whatsapp_media_pipeline.sql',
  'migrations/20260604_email_center.sql',
];

async function executeMigrations() {
  log.info('Conectando ao Supabase: ' + SUPABASE_URL);

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('\n' + colors.blue + '\uD83D\uDCCB Migra\u00E7\u00F5es a executar:' + colors.reset);
  MIGRATIONS.forEach((file, i) => {
    const exists = fs.existsSync(file);
    const status = exists
      ? colors.green + '\u2705' + colors.reset
      : colors.red + '\u274C' + colors.reset;
    console.log('  ' + status + ' ' + (i + 1) + '. ' + file);
  });

  console.log('\n' + colors.cyan + '\u25B6\uFE0F  Iniciando execu\u00E7\u00E3o...' + colors.reset + '\n');

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < MIGRATIONS.length; i++) {
    const migrationFile = MIGRATIONS[i];
    const fileNum = i + 1;

    if (!fs.existsSync(migrationFile)) {
      log.warn('[' + fileNum + '/' + MIGRATIONS.length + '] ' + migrationFile + ' - Arquivo n\u00E3o encontrado');
      failCount++;
      continue;
    }

    try {
      log.info('[' + fileNum + '/' + MIGRATIONS.length + '] ' + migrationFile);

      // Ler conteúdo do arquivo
      const sqlContent = fs.readFileSync(migrationFile, 'utf-8');

      // Dividir por ; mas respeitando blocos $$ (funções)
      const statements = [];
      let currentStatement = '';
      let inDollarBlock = false;

      const lines = sqlContent.split('\n');
      for (let line of lines) {
        if (line.includes('$$')) inDollarBlock = !inDollarBlock;
        currentStatement += line + '\n';

        if (!inDollarBlock && line.trim().endsWith(';')) {
          statements.push(currentStatement.trim());
          currentStatement = '';
        }
      }
      if (currentStatement.trim()) statements.push(currentStatement.trim());

      const filteredStatements = statements.filter(
        (stmt) => stmt.length > 0 && !stmt.startsWith('--')
      );

      console.log('    \u2514\u2500 ' + filteredStatements.length + ' statements para executar');

      // Tentar executar cada statement
      let executed = 0;
      let errors = 0;

      for (let j = 0; j < filteredStatements.length; j++) {
        const statement = filteredStatements[j];

        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: statement,
          });

          if (error) {
            // Ignorar erros de "já existe"
            if (
              error.message.includes('already exists') ||
              error.message.includes('already present')
            ) {
              executed++;
              continue;
            }

            errors++;
            console.log(
              '    \u26A0\uFE0F  Statement ' +
                (j + 1) +
                '/' +
                filteredStatements.length +
                ': ' +
                error.message
            );
          } else {
            executed++;
          }
        } catch (err) {
          executed++;
        }
      }

      if (executed > 0) {
        log.success(migrationFile + ' (' + executed + '/' + statements.length + ' statements)');
        successCount++;
      } else {
        log.warn(migrationFile + ' - Nenhum statement foi executado');
        failCount++;
      }
    } catch (error) {
      log.error(migrationFile + ': ' + error.message);
      failCount++;
    }
  }

  // Resumo
  console.log('\n' + colors.cyan + '\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550' + colors.reset);

  if (successCount === MIGRATIONS.length) {
    log.success('Todas as ' + MIGRATIONS.length + ' migra\u00E7\u00F5es foram processadas!');
    console.log(
      '\n' +
        colors.green +
        '\uD83C\uDF89 Banco de dados atualizado com sucesso!' +
        colors.reset +
        '\n\n' +
        colors.cyan +
        'Pr\u00F3ximos passos:' +
        colors.reset +
        '\n1. Recarregue seu app: F5 em http://localhost:3006\n2. Fa\u00E7a login com suas credenciais\n3. Crie sua primeira organiza\u00E7\u00E3o\n'
    );
  } else if (successCount > 0) {
    log.warn(
      successCount +
        '/' +
        MIGRATIONS.length +
        ' migra\u00E7\u00F5es processadas, ' +
        failCount +
        ' com problemas'
    );
    console.log(
      '\n' +
        colors.yellow +
        'Nota:' +
        colors.reset +
        '\nAlguns arquivos talvez precisem ser executados manualmente.\nVisite: https://app.supabase.com/ \u2192 SQL Editor\n'
    );
  } else {
    log.error('Nenhuma migra\u00E7\u00E3o foi executada');
    console.log(
      '\n' +
        colors.cyan +
        'Alternativa - Execute manualmente:' +
        colors.reset +
        '\n1. Abra: https://app.supabase.com/\n2. SQL Editor \u2192 New query\n3. Para cada arquivo .sql:\n   - Abra o arquivo\n   - Copie: Ctrl+A \u2192 Ctrl+C\n   - Cole no Supabase: Ctrl+V\n   - Clique: Run\n'
    );
  }

  console.log('\n' + colors.blue + 'Verificar status:' + colors.reset);
  console.log('npm run check-db\n');
}

executeMigrations().catch((error) => {
  log.error('Erro fatal: ' + error.message);
  console.log('\n' + colors.yellow + 'Tente o m\u00E9todo manual:' + colors.reset);
  console.log('https://app.supabase.com/ \u2192 SQL Editor\n');
  process.exit(1);
});
