/**
 * scripts/check-env.mjs
 * Verifica se todas as variáveis de ambiente obrigatórias estão configuradas.
 * Execute: node scripts/check-env.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Carrega o .env local se existir
const envPath = join(ROOT, '.env');
let envVars = {};
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const [key, ...vals] = line.split('=');
    if (key && !key.startsWith('#')) {
      envVars[key.trim()] = vals.join('=').trim();
    }
  });
  console.log('✅ Arquivo .env encontrado em:', envPath);
} else {
  console.warn('⚠️  Arquivo .env NÃO encontrado. Verificando process.env...');
  envVars = process.env;
}

const required = [
  { key: 'VITE_SUPABASE_URL', desc: 'URL do projeto Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', desc: 'Chave service_role do Supabase' },
  { key: 'VITE_SUPABASE_ANON_KEY', desc: 'Chave anon/pública do Supabase' },
];

const optional = [
  { key: 'SUPABASE_JWT_SECRET', desc: 'JWT Secret do Supabase' },
  { key: 'NODE_ENV', desc: 'Ambiente (production/development)' },
  { key: 'PORT', desc: 'Porta do servidor backend' },
  { key: 'VITE_PANEL_URL', desc: 'URL do painel front-end' },
];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📋  VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE — IMOBZY');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let hasErrors = false;

console.log('🔴 OBRIGATÓRIAS:');
required.forEach(({ key, desc }) => {
  const val = envVars[key] || process.env[key];
  if (
    !val ||
    val.trim() === '' ||
    val.includes('sua-') ||
    val.includes('placeholder')
  ) {
    console.log(`   ❌  ${key}`);
    console.log(`        → ${desc}`);
    hasErrors = true;
  } else {
    console.log(`   ✅  ${key} configurada`);
  }
});

console.log('\n🟡 OPCIONAIS:');
optional.forEach(({ key, desc }) => {
  const val = envVars[key] || process.env[key];
  if (!val) {
    console.log(`   ⚪  ${key} (não configurado — ${desc})`);
  } else {
    console.log(`   ✅  ${key} configurada`);
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
if (hasErrors) {
  console.log('❌  RESULTADO: Variáveis obrigatórias faltando!');
  console.log('');
  console.log(
    '   👉 Configure as variáveis marcadas com ❌ no ambiente do servidor.'
  );
  console.log(
    '   👉 Para desenvolvimento local, edite o arquivo .env na raiz.'
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(1);
} else {
  console.log(
    '✅  RESULTADO: Todas as variáveis obrigatórias estão configuradas!'
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
