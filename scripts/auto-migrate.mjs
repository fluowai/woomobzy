#!/usr/bin/env node

/**
 * IMOBZY - Run Migrations via Server API
 * Inicia o servidor e executa as migrações via API
 */

import axios from 'axios';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

const __dirname = dirname(fileURLToPath(import.meta.url));

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
╔════════════════════════════════════════════════╗
║  IMOBZY - Automatic Migration Executor        ║
║  Iniciando servidor e executando migrações... ║
╚════════════════════════════════════════════════╝
${colors.reset}`);

let serverProcess = null;
let attempts = 0;
const maxAttempts = 10;

async function waitForServer(port = 3002) {
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      attempts++;
      try {
        // Try a simple HTTP request to any endpoint
        const { default: http } = await import('http');

        const options = {
          hostname: 'localhost',
          port: port,
          path: '/api/migrations/execute',
          method: 'POST',
          timeout: 500,
        };

        const req = http.request(options, (res) => {
          clearInterval(interval);
          resolve(true);
        });

        req.on('error', () => {
          log.info(`Aguardando servidor iniciar... (${attempts}/${maxAttempts})`);
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            resolve(false);
          }
        });

        req.setTimeout(500, () => {
          req.destroy();
          log.info(`Aguardando servidor iniciar... (${attempts}/${maxAttempts})`);
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            resolve(false);
          }
        });

        req.end();
      } catch (error) {
        log.info(`Aguardando servidor iniciar... (${attempts}/${maxAttempts})`);
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve(false);
        }
      }
    }, 1500);
  });
}

async function runMigrations() {
  try {
    // Start server in background
    log.info('Iniciando servidor Express em background...');

    const projectRoot = dirname(__dirname);
    const serverCmd = `cd "${projectRoot}" && npm run server`;

    // Start server but don't wait
    const serverProcess = exec(serverCmd, { timeout: 120000 });

    serverProcess.stderr?.on('data', (data) => {
      console.log(`[SERVER] ${data}`);
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[SERVER] ${data}`);
    });

    // Wait for server to be ready
    log.info('Esperando servidor ficar pronto...');
    const serverReady = await waitForServer();

    if (!serverReady) {
      log.error('Servidor não iniciou em tempo');
      process.exit(1);
    }

    log.success('Servidor está pronto!');
    console.log('');

    // Execute migrations via API
    log.info('Enviando request para executar migrações...');

    const response = await axios.post(
      'http://localhost:3002/api/migrations/execute',
      {},
      { timeout: 120000 }
    );

    const { success, message, results } = response.data;

    // Display results
    console.log(`\n${colors.cyan}════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}📊 Resultado das Migrações:${colors.reset}`);
    console.log(`  ✅ Com sucesso: ${results.success.length}/5`);
    console.log(`  ❌ Falhadas: ${results.failed.length}/5`);
    console.log(`  📝 Total statements: ${results.totalStatements}`);

    if (success) {
      log.success(message);
      console.log(`
${colors.green}🎉 Migrações Executadas com Sucesso!${colors.reset}

${colors.cyan}Próximos passos:${colors.reset}
1. Recarregue seu app: F5 em http://localhost:3005
2. Abra o console: F12
3. O erro PGRST205 deve ter desaparecido ✅
4. Faça login com suas credenciais
5. Crie sua primeira organização

${colors.cyan}Verificar status:${colors.reset}
npm run check-db
`);
      process.exit(0);
    } else {
      log.warn(message);
      console.log('\nDetalhes:');
      results.success.forEach((r) => {
        console.log(`  ✅ ${r.file} (${r.executed}/${r.statements} statements)`);
      });
      results.failed.forEach((r) => {
        console.log(`  ❌ ${r.file}: ${r.error}`);
      });
      process.exit(1);
    }
  } catch (error) {
    log.error(`Erro ao executar migrações: ${error.message}`);
    if (error.response) {
      console.log('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run
runMigrations().catch(console.error);
