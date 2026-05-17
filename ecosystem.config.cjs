const webPort = process.env.PORT || 3002;

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
      max_memory_restart: '400M',
      env: {
        PORT: 3100,
        NODE_URL: `http://127.0.0.1:${webPort}`,
        SUPABASE_DB_URL:
          process.env.SUPABASE_DB_URL ||
          process.env.DATABASE_URL ||
          process.env.DATABASE_PRIVATE_URL ||
          process.env.POSTGRES_URL ||
          process.env.POSTGRES_PRIVATE_URL ||
          process.env.POSTGRES_PRISMA_URL ||
          process.env.POSTGRES_URL_NON_POOLING ||
          process.env.PGDATABASE_URL,
        SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'whatsapp-media',
        WHATSAPP_INTERNAL_TOKEN: process.env.WHATSAPP_INTERNAL_TOKEN,
        WHATSAPP_AI_AUTOMATION: process.env.WHATSAPP_AI_AUTOMATION
      }
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
