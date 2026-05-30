const webPort = process.env.PORT || 3002;

const firstEnv = (...keys) => keys.map((key) => process.env[key]).find(Boolean);

const compactEnv = (env) =>
  Object.fromEntries(Object.entries(env).filter(([, value]) => value !== undefined && value !== null && value !== ''));

const whatsappEnv = compactEnv({
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: 3100,
  NODE_URL: `http://127.0.0.1:${webPort}`,

  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_PRIVATE_URL: process.env.DATABASE_PRIVATE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  POSTGRES_URL: process.env.POSTGRES_URL,
  POSTGRES_PRIVATE_URL: process.env.POSTGRES_PRIVATE_URL,
  POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
  POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
  POSTGRESQL_URL: process.env.POSTGRESQL_URL,
  PGDATABASE_URL: process.env.PGDATABASE_URL,
  PG_URL: process.env.PG_URL,
  DB_URL: process.env.DB_URL,
  PGSSLMODE: process.env.PGSSLMODE || 'require',

  WHATSMEOW_URL: process.env.WHATSMEOW_URL || 'http://127.0.0.1:3100',
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || process.env.WHATSMEOW_URL || 'http://127.0.0.1:3100',

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
  MEDIA_STORAGE_PROVIDER: process.env.MEDIA_STORAGE_PROVIDER || 'minio',
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL,
  MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL || process.env.MINIO_PUBLIC_ENDPOINT || process.env.S3_PUBLIC_URL,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
  MINIO_REGION: process.env.MINIO_REGION || process.env.AWS_REGION || process.env.S3_REGION,
  MINIO_WHATSAPP_BUCKET: process.env.MINIO_WHATSAPP_BUCKET || process.env.S3_WHATSAPP_BUCKET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  CORS_ORIGINS:
    process.env.CORS_ORIGINS ||
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:3006,http://localhost:3002,https://consultio.com.br,https://imobzy.consultio.com.br,https://www.consultio.com.br,https://woomobzy-production.up.railway.app',
  WHATSAPP_INTERNAL_TOKEN: process.env.WHATSAPP_INTERNAL_TOKEN,
  WHATSAPP_AI_AUTOMATION: process.env.WHATSAPP_AI_AUTOMATION
});

const backendEnv = compactEnv({
  NODE_ENV: process.env.NODE_ENV || 'production',
  PORT: process.env.PORT || 3002,
  VITE_SUPABASE_URL: firstEnv('VITE_SUPABASE_URL', 'SUPABASE_URL'),
  SUPABASE_SERVICE_ROLE_KEY: firstEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'),
  MEDIA_STORAGE_PROVIDER: process.env.MEDIA_STORAGE_PROVIDER || 'minio',
  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT_URL,
  MINIO_PUBLIC_URL: process.env.MINIO_PUBLIC_URL || process.env.MINIO_PUBLIC_ENDPOINT || process.env.S3_PUBLIC_URL,
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID,
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY,
  MINIO_REGION: process.env.MINIO_REGION || process.env.AWS_REGION || process.env.S3_REGION,
  MINIO_MEDIA_BUCKET: process.env.MINIO_MEDIA_BUCKET || process.env.S3_MEDIA_BUCKET,
  MINIO_WHATSAPP_BUCKET: process.env.MINIO_WHATSAPP_BUCKET || process.env.S3_WHATSAPP_BUCKET,
  MINIO_DOCUMENTS_BUCKET: process.env.MINIO_DOCUMENTS_BUCKET || process.env.S3_DOCUMENTS_BUCKET,
  MINIO_EXPORTS_BUCKET: process.env.MINIO_EXPORTS_BUCKET || process.env.S3_EXPORTS_BUCKET,
  MINIO_BACKUPS_BUCKET: process.env.MINIO_BACKUPS_BUCKET || process.env.S3_BACKUPS_BUCKET,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL || process.env.WHATSMEOW_URL || 'http://127.0.0.1:3100',
  WHATSMEOW_URL: process.env.WHATSMEOW_URL || process.env.WHATSAPP_API_URL || 'http://127.0.0.1:3100',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  CORS_ORIGINS: process.env.CORS_ORIGINS,
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
      env: backendEnv
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
