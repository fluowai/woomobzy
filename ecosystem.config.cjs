module.exports = {
  apps: [
    {
      name: 'imobisaas-backend',
      script: './server/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      }
    },
    {
      name: 'whatsapp-service',
      script: './whatsapp-service/whatsapp-service-bin',
      cwd: './whatsapp-service',
      env: {
        PORT: 3100
      }
    },
    {
      name: 'agro-intelligence',
      script: 'python3',
      args: 'server/agro-intelligence/main.py',
      interpreter: 'none',
      instances: 1,
      env: {
        PORT: 8000
      }
    }
  ]
};
