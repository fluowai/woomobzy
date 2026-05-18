const webPort = process.env.PORT || 3002;

const firstEnv = (...keys) => keys.map((key) => process.env[key]).find(Boolean);

const compactEnv = (env) =>
  Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined && value !== null && value !== ''));

const whatsappEnv = compactEnv({
  PORT: 3100,
  NODE_URL: `http://127.0.0.1:${webPort}`,
  SUPABASE_DB_URL: firstEnv(
    'SUPABASE_DB_URL',
    'DATABASE_URL',
    'DATABASE_PRIVATE_URL',
    'DIRECT_URL',
    'POSTGRES_URL',
    'POSTGRES_PRIVATE_URL',
    'POSTGRES_PRISMA_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRESQL_URL',
    'PGDATABASE_URL',
    'PG_URL',
    'DB_URL'
  ),
  SUPABASE_URL: firstEnv('SUPABASE_URL', 'VITE_SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: firstEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'),
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'whatsapp-media',
  CORS_ORIGINS:
    process.env.CORS_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:3006,http://localhost:3002,https://consultio.com.br,https://imobzy.consultio.com.br,https://www.consultio.com.br,https://woomobzy-production.up.railway.app',
  WHATSAPP_INTERNAL_TOKEN: process.env.WHATSAPP_INTERNAL_TOKEN,
  WHATSAPP_AI_AUTOMATION: process.env.WHATSAPP_AI_AUTOMATION
});

module.exports = {
  apps: [
    {
      name: 'imobisaas-backend',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '450M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'whatsapp-service',
      script: './whatsapp-service/whatsapp-service-bin',
      interpreter: 'none',
      max_memory_restart: '400M',
      env: whatsappEnv
    },
    {
      name: 'agro-intelligence',
      script: 'python3',
      args: 'server/agro-intelligence/main.py',
      interpreter: 'none',
      instances: 1,
      max_memory_restart: '300M',
      env: {
        PORT: 8000,
        PYTHONPATH: './server/agro-intelligence/.python-deps'
      }
    }
  ]
};
