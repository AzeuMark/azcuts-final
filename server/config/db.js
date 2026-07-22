const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

/**
 * Connect to MongoDB (azeubarbersalondb). Mongoose auto-creates the database
 * and its collections on the first write, so there is nothing to provision here.
 */
async function connectDB() {
  mongoose.connection.on('connected', () =>
    logger.info('MongoDB connected -> azeubarbersalondb')
  );
  mongoose.connection.on('error', (err) =>
    logger.error('MongoDB connection error:', err.message)
  );
  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected')
  );

  // Short server-selection timeout so a missing local MongoDB fails quickly
  // (instead of hanging for ~30s) during development.
  await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  return mongoose.connection;
}

module.exports = connectDB;
