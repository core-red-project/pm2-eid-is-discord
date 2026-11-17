/**
 * @file ecosystem.config.cjs
 * @description PM2 ecosystem file for launching development test fixtures.
 * Usage: npx pm2 start fixtures/ecosystem.config.cjs
 */

module.exports = {
  apps: [
    {
      name: 'fixture-discord-bot',
      script: './fixtures/bot-service.js',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'fixture-flaky-api',
      script: './fixtures/flaky-service.js',
      instances: 1,
      autorestart: true,
      max_restarts: 15,
      min_uptime: '5s',
      env: {
        NODE_ENV: 'development',
      },
    },
    {
      name: 'fixture-memory-worker',
      script: './fixtures/memory-hog.js',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      env: {
        NODE_ENV: 'development',
      },
    },
  ],
};

