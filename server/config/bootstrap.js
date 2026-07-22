const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * One-time startup tasks that must run before the server accepts traffic.
 *
 * Phase 0: ensure the /uploads directory exists (Multer writes images here and
 * they are static-served at /uploads).
 *
 * Phase 1 (TODO): once the Settings model exists, seed the Settings singleton
 * (default systemMode, timezone, storeHours, nicknames, shopInfo) here if missing.
 */
async function bootstrap() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    logger.info('Created /uploads directory');
  }
}

module.exports = bootstrap;
