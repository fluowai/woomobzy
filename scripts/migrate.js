#!/usr/bin/env node

/**
 * IMOBZY - Supabase Migration Helper
 * Verifica status do banco e guia executar migrações
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Ler .env
require('dotenv').config();

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

console.log(`${colors.cyan}
╔════════════════════════════════════════╗
║   IMOBZY - Supabase Migration Helper   ║
╚════════════════════════════════════════╝
${colors.reset}`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(`${colors.red}❌ Erro: Variáveis de ambiente não configuradas${colors.reset}`);
  console.log(`
${colors.yellow}Configure seu arquivo .env:${colors.reset}
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
`);
  process.exit(1);
}

// Verificar conectividade
async function checkConnection() {
  return new Promise((resolve) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/`);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      resolve(res.statusCode === 200 || res.statusCode === 404);
    });

    req.on('error', () => resolve(false));
    req.setTimeout(5000, () => resolve(false));
    req.end();
  });
}

async function main() {
  console.log(`${colors.blue}📍 Verificando conexão com Supabase...${colors.reset}\n`);

  const connected = await checkConnection();

  if (!connected) {
    console.error(`${colors.red}❌ Não consegui conectar ao Supabase${colors.reset}`);
    console.log(`
${colors.yellow}Verifique:${colors.reset}
1. URL do Supabase está correta: ${SUPABASE_URL}
2. Sua internet está funcionando
3. O projeto Supabase está ativo
`);
    process.exit(1);
  }

  console.log(`${colors.green}✅ Conectado ao Supabase!${colors.reset}\n`);

  // Informações
  console.log(`${colors.cyan}📋 Informações da Migração:${colors.reset}`);

  const MIGRATIONS = [
    'definitive_imobzy_schema.sql',
    'fix_role_and_permissions_v2.sql',
    'fix_rpc_final.sql',
    'fix_landing_pages_rls.sql',
    'setup_landing_pages.sql',
  ];

  console.log(`${colors.blue}Arquivos a executar:${colors.reset}`);
  MIGRATIONS.forEach((file, i) => {
    const exists = fs.existsSync(file);
    const status = exists ? `${colors.green}✅${colors.reset}` : `${colors.red}❌${colors.reset}`;
    console.log(`  ${status} ${i + 1}. ${file}`);
  });

  console.log(`\n${colors.yellow}⚠️  IMPORTANTE:${colors.reset}`);
  console.log(`A execução de migrações via API não é suportada diretamente no Supabase.`);
  console.log(`${colors.cyan}Use uma destas opções:${colors.reset}\n`);

  console.log(`${colors.green}OPÇÃO 1: Web Interface (Recomendado - 5 minutos)${colors.reset}`);
  console.log(`
  1. Acesse: ${colors.cyan}https://app.supabase.com/${colors.reset}
  2. Vá para: ${colors.cyan}SQL Editor${colors.reset}
  3. Clique: ${colors.cyan}New query${colors.reset}
  4. Para cada arquivo .sql (na ordem acima):
     - Abra o arquivo
     - Copie TODO seu conteúdo (Ctrl+A)
     - Cole no SQL Editor do Supabase
     - Clique em ${colors.cyan}Run${colors.reset}
  5. Recarregue seu app: ${colors.cyan}F5${colors.reset}
`);

  console.log(`${colors.green}OPÇÃO 2: Supabase CLI${colors.reset}`);
  console.log(`
  1. Instale: ${colors.cyan}npm install -g @supabase/cli${colors.reset}
  2. Login:   ${colors.cyan}supabase login${colors.reset}
  3. Execute: ${colors.cyan}supabase link --project-ref <project-id>${colors.reset}
  4. Depois:  ${colors.cyan}supabase db push${colors.reset}
`);

  console.log(`${colors.green}OPÇÃO 3: Executar Manualmente via Node.js${colors.reset}`);
  console.log(`
  npm install @supabase/supabase-js dotenv
  node scripts/migrate-supabase.js
`);

  console.log(`\n${colors.cyan}📊 Dashboard Supabase:${colors.reset}`);
  const projectId = SUPABASE_URL.match(/https:\/\/(\w+)\.supabase\.co/)?.[1];
  if (projectId) {
    console.log(`https://app.supabase.com/project/${projectId}/sql`);
  }

  console.log(`\n${colors.cyan}🔍 Para verificar status depois, execute:${colors.reset}`);
  console.log(`npm run check-db`);

  console.log(`\n`);
}

main().catch(console.error);
