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
      cwd: './whatsapp-service',
      max_memory_restart: '200M',
      env: {
        PORT: 3100,
        NODE_URL: `http://127.0.0.1:${webPort}`
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
