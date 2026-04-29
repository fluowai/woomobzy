module.exports = {
  apps: [{
    name: 'imobisaas-backend',
    script: './server/index.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  },
  {
    name: 'agro-intelligence',
    script: 'python3',
    args: 'server/agro-intelligence/main.py',
    interpreter: 'none',
    instances: 1,
    exec_mode: 'fork',
    env: {
      PORT: 8000
    }
  }]
};
