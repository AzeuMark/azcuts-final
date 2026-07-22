// PM2 process configuration.
// Start:  pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'azcuts-api',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
