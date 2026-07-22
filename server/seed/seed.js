// Idempotent seeder — run with: node seed/seed.js  (or: npm run seed)
// Seeds the Settings singleton and the admin account.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const logger = require('../utils/logger');
const Settings = require('../models/Settings');
const User = require('../models/User');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(__dirname, file), 'utf-8'));
}

async function seedSettings() {
  const data = readJson('settings.seed.json');
  const existing = await Settings.findById(data._id || 'system');
  if (existing) {
    logger.info('Settings singleton already present — skipping');
    return;
  }
  await Settings.create(data);
  logger.info('Seeded Settings singleton');
}

async function seedAdmin() {
  const data = readJson('admin.seed.json'); // password is ALREADY bcrypt-hashed
  const email = data.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    logger.info(`Admin ${email} already exists — skipping`);
    return;
  }
  // Insert raw so the pre-hashed password is preserved (bypasses the save hook
  // so it is not hashed a second time). Mirrors the Compass import path (10).
  await User.collection.insertOne({
    ...data,
    email,
    totalServed: 0,
    avgRating: 0,
    ratingCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  logger.info(`Seeded admin account: ${email} (password: Admin@123)`);
}

async function run() {
  await connectDB();
  await seedSettings();
  await seedAdmin();
  await mongoose.connection.close();
  logger.info('Seeding complete.');
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seeding failed:', err.message);
  process.exit(1);
});
