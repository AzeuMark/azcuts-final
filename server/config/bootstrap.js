const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const Settings = require('../models/Settings');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/**
 * One-time startup tasks that must run before the server accepts traffic.
 *  1. Ensure the /uploads directory exists (Multer writes here; static-served).
 *  2. Ensure the Settings singleton exists (created with schema defaults on
 *     first boot). Requires an active DB connection.
 */
async function bootstrap() {
  // 1. Uploads directory
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    logger.info('Created /uploads directory');
  }

  // 2. Settings singleton (id "system")
  try {
    const existing = await Settings.findById('system');
    if (!existing) {
      await Settings.create({ _id: 'system' }); // all fields fall back to defaults
      logger.info('Seeded default Settings singleton');
    }
  } catch (err) {
    // Don't crash boot if the DB isn't ready yet; log for visibility.
    logger.warn('Could not ensure Settings singleton:', err.message);
  }
}

module.exports = bootstrap;
