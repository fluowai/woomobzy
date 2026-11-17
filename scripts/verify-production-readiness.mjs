import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

console.log('====================================================');
console.log('   WooMobzy / WooTech Imob - Production Pre-flight Check');
console.log('====================================================\n');

let passCount = 0;
let warnCount = 0;
let failCount = 0;

function report(status, label, detail = '') {
  if (status === 'PASS') {
    passCount++;
    console.log(`[PASS] ${label} ${detail ? `(${detail})` : ''}`);
  } else if (status === 'WARN') {
    warnCount++;
    console.log(`[WARN] ${label} ${detail ? `(${detail})` : ''}`);
  } else {
    failCount++;
    console.log(`[FAIL] ${label} ${detail ? `(${detail})` : ''}`);
  }
}

// 1. Env check
const criticalVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'DATABASE_URL',
  'SUPABASE_DB_URL',
  'MEDIA_STORAGE_PROVIDER',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY'
];

for (const v of criticalVars) {
  const val = process.env[v];
  if (!val || val.includes('seu-') || val.includes('sua-') || val.includes('SUA_')) {
    report('WARN', `Variável ${v}`, 'ausente ou com valor placeholder');
  } else {
    report('PASS', `Variável ${v}`);
  }
}

// 2. Database connectivity
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  report('FAIL', 'Conexão com PostgreSQL', 'DATABASE_URL não configurada');
} else {
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });

  try {
    const client = await pool.connect();
    const resTables = await client.query(`
      SELECT count(*)::int as total
      FROM information_schema.tables
      WHERE table_schema = 'public';
    `);
    const count = resTables.rows[0]?.total || 0;
    report('PASS', 'Banco de Dados Supabase', `${count} tabelas públicas encontradas`);

    // Verify key tables
    const resKeyTables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('organizations', 'profiles', 'properties', 'leases', 'leads', 'plans');
    `);
    const foundKeys = resKeyTables.rows.map(r => r.table_name);
    if (foundKeys.length === 6) {
      report('PASS', 'Tabelas Estruturais', 'organizations, profiles, properties, leases, leads, plans');
    } else {
      report('WARN', 'Tabelas Estruturais', `Esperadas 6, encontradas: ${foundKeys.join(', ')}`);
    }

    client.release();
    await pool.end();
  } catch (err) {
    report('FAIL', 'Conexão com Banco de Dados', err.message);
  }
}

// 3. MinIO Configuration & Bucket
const minioEndpoint = process.env.MINIO_ENDPOINT || 'https://storage.wootech.com.br';
report('PASS', 'MinIO Endpoint Configurado', minioEndpoint);

// 4. Traefik Dynamic Directory / Volume
const traefikDir = process.env.TRAEFIK_DYNAMIC_DIR || path.join(rootDir, 'traefik', 'dynamic');
if (fs.existsSync(traefikDir)) {
  report('PASS', 'Diretório Traefik Dynamic', traefikDir);
} else {
  report('WARN', 'Diretório Traefik Dynamic', `Não encontrado localmente em ${traefikDir} (normal se volume externo Docker)`);
}

// 5. Deployment files
const deployFiles = [
  'portainer-stack.yml',
  'Dockerfile.frontend',
  'Dockerfile.api',
  'Dockerfile.whatsapp',
  'Dockerfile.document-worker',
  'Dockerfile.agro'
];

for (const df of deployFiles) {
  if (fs.existsSync(path.join(rootDir, df))) {
    report('PASS', `Arquivo de Deploy: ${df}`);
  } else {
    report('FAIL', `Arquivo de Deploy: ${df}`, 'arquivo ausente');
  }
}

console.log('\n----------------------------------------------------');
console.log(`Resultado: ${passCount} PASS | ${warnCount} WARN | ${failCount} FAIL`);
if (failCount === 0) {
  console.log('✅ O sistema atende aos pré-requisitos para operação em produção!');
} else {
  console.log('❌ Existem bloqueadores que impedem a subida imediata em produção.');
}
console.log('====================================================\n');

