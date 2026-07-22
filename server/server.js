const http = require('http');

const env = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');
const bootstrap = require('./config/bootstrap');
const logger = require('./utils/logger');

// Wrap the Express app in an HTTP server so Socket.io can attach later (Phase 9).
const server = http.createServer(app);

async function start() {
  // 1. Connect to MongoDB first — bootstrap's Settings seeding depends on it.
  //    If it is unreachable we still start the HTTP server so /api/health
  //    responds, and we log a clear, actionable message.
  try {
    await connectDB();
  } catch (err) {
    logger.error('Could not connect to MongoDB on startup:', err.message);
    logger.warn(
      'Starting the server anyway. Make sure MongoDB is running at your MONGO_URI, then restart.'
    );
  }

  // 2. Startup tasks (ensure /uploads dir + Settings singleton).
  await bootstrap();

  // 3. Start listening.
  server.listen(env.PORT, () => {
    logger.info(`AzCuts API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    logger.info(`Health check: http://localhost:${env.PORT}/api/health`);
  });
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down...');
  server.close(() => process.exit(0));
});

module.exports = server;
