const http = require('http');

const env = require('./config/env');
const app = require('./app');
const connectDB = require('./config/db');
const bootstrap = require('./config/bootstrap');
const logger = require('./utils/logger');
const { initSocket } = require('./socket');

// Wrap the Express app in an HTTP server and attach Socket.io.
const server = http.createServer(app);
initSocket(server);

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
function shutdown(signal) {
  logger.info(`${signal} received — shutting down...`);
  server.close(() => process.exit(0));
  // Force-exit if connections linger.
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Last-resort safety nets.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason?.message || reason);
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err.stack || err.message);
  // A crashed process is unpredictable; exit so the manager (PM2) restarts it.
  process.exit(1);
});

module.exports = server;
