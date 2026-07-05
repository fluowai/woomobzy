import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

const root = process.cwd();
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath, quiet: true });

const errors = [];
const warnings = [];

const requiredEnv = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'DATABASE_URL',
  'SUPABASE_DB_URL',
];

for (const key of requiredEnv) {
  if (!String(process.env[key] || '').trim()) {
    warnings.push(`.env nao define ${key}; confirme se o Portainer fornece essa variavel.`);
  }
}

validateSupabaseEnv();
validateStackFiles();

if (warnings.length) {
  for (const warning of warnings) console.warn(`[deploy-config] WARN ${warning}`);
}

if (errors.length) {
  for (const error of errors) console.error(`[deploy-config] ERROR ${error}`);
  process.exit(1);
}

console.log('[deploy-config] OK Supabase deploy configuration looks consistent.');

function validateSupabaseEnv() {
  const supabaseUrl = String(process.env.VITE_SUPABASE_URL || '').trim();
  const projectRef = getProjectRef(supabaseUrl);

  const anonKey = String(process.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const anon = describeSupabaseKey(anonKey);
  if (anonKey && !isUsableAnonKey(anon)) {
    errors.push('VITE_SUPABASE_ANON_KEY no .env nao parece uma anon/publishable key valida.');
  }
  if (anon.jwtRef && projectRef && anon.jwtRef !== projectRef) {
    errors.push('VITE_SUPABASE_ANON_KEY no .env pertence a outro projeto Supabase.');
  }

  const serviceKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const service = describeSupabaseKey(serviceKey);
  if (serviceKey && !isUsableServiceKey(service)) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY no .env nao parece uma service_role/secret key valida.');
  }
  if (service.jwtRef && projectRef && service.jwtRef !== projectRef) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY no .env pertence a outro projeto Supabase.');
  }
}

function validateStackFiles() {
  const stackFiles = [
    'portainer-stack.yml',
    'portainer-stack-fazendasbrasil-pronta.yml',
    'portainer-stack-imobfluow-filled.yml',
    'portainer-stack-imobfluow-flat-filled.yml',
    'docker-compose.yml',
    'docker-compose.local.yml',
  ];

  for (const file of stackFiles) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) continue;
    const text = fs.readFileSync(fullPath, 'utf8');
    const values = extractYamlEnvValues(text);

    for (const [key, value] of values) {
      if (!isSupabaseKeyName(key)) continue;
      if (isPlaceholder(value)) continue;

      const info = describeSupabaseKey(value);
      if (key.includes('SERVICE_ROLE') && !isUsableServiceKey(info)) {
        errors.push(`${file} contem ${key} literal malformada ou com role incorreta.`);
      }
      if (key.includes('ANON') && !isUsableAnonKey(info)) {
        errors.push(`${file} contem ${key} literal malformada ou com role incorreta.`);
      }
    }
  }
}

function extractYamlEnvValues(text) {
  const matches = text.matchAll(/^\s+([A-Z0-9_]+):\s*["']?([^"'\r\n]+)["']?\s*$/gm);
  return [...matches].map((match) => [match[1], match[2].trim()]);
}

function isSupabaseKeyName(key) {
  return key === 'VITE_SUPABASE_ANON_KEY' || key === 'SUPABASE_SERVICE_ROLE_KEY';
}

function isPlaceholder(value) {
  return value.startsWith('${') || value === 'runtime';
}

function isUsableAnonKey(info) {
  if (info.kind === 'publishable') return true;
  return info.kind === 'jwt' && info.role === 'anon';
}

function isUsableServiceKey(info) {
  if (info.kind === 'secret') return true;
  return info.kind === 'jwt' && info.role === 'service_role';
}

function describeSupabaseKey(value) {
  if (!value) return { kind: 'missing' };
  if (value.startsWith('sb_publishable_')) return { kind: 'publishable' };
  if (value.startsWith('sb_secret_')) return { kind: 'secret' };

  const parts = value.split('.');
  if (parts.length !== 3) return { kind: 'unknown' };

  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return {
      kind: 'jwt',
      role: payload.role || null,
      jwtRef: payload.ref || null,
      issuer: payload.iss || null,
    };
  } catch {
    return { kind: 'unknown' };
  }
}

function getProjectRef(url) {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}
