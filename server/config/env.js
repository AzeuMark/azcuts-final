// Centralized, validated environment access.
// Loading .env here means every other file can just `require('./config/env')`.
require('dotenv').config();

/**
 * Read a required variable. Throws on boot if it is missing so we fail fast
 * instead of hitting a confusing runtime error later.
 */
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT, 10) || 5000,

  // Database
  MONGO_URI: required('MONGO_URI'),

  // JWT (used from Phase 1 onward; safe dev fallbacks so the skeleton still boots)
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
  REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d',

  // CORS / client
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',

  // Locale
  DEFAULT_TZ: process.env.DEFAULT_TZ || 'Asia/Manila',

  // Reversible field encryption (utils/AESCrypt.js) — placeholder key, change later
  AES_SECRET_KEY: process.env.AES_SECRET_KEY || 'azeumark',

  get isProd() {
    return this.NODE_ENV === 'production';
  },
};

module.exports = env;
