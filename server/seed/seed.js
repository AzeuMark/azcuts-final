// Idempotent seeder — run with: node seed/seed.js  (or: npm run seed)
// Seeds the Settings singleton and the admin account.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const logger = require('../utils/logger');
const Settings = require('../models/Settings');
const User = require('../models/User');
const Service = require('../models/Service');
const Extra = require('../models/Extra');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

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

// Upsert by name so re-running the seeder never creates duplicates.
async function seedCollection(Model, file, label) {
  const items = readJson(file);
  let inserted = 0;
  for (const item of items) {
    const result = await Model.updateOne(
      { name: item.name },
      { $setOnInsert: item },
      { upsert: true }
    );
    if (result.upsertedCount) inserted += 1;
  }
  logger.info(`Seeded ${label}: ${inserted} new, ${items.length - inserted} already present`);
}

async function seedStaff() {
  const staff = readJson('staff.seed.json'); // passwords are ALREADY bcrypt-hashed
  let inserted = 0;
  for (const member of staff) {
    const email = member.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) continue;
    // Raw insert preserves the pre-hashed password (bypasses the save hook).
    await User.collection.insertOne({
      ...member,
      email,
      totalServed: 0,
      avgRating: 0,
      ratingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    inserted += 1;
  }
  logger.info(`Seeded staff: ${inserted} new, ${staff.length - inserted} already present`);
}

// Products + opening stock (S1, school compliance). Upsert by name; the
// `openingStock` helper key in products.seed.json never reaches the DB — it
// becomes one `stock_in` ledger entry (recorded by the admin) on first seed.
async function seedProducts() {
  const items = readJson('products.seed.json');
  const admin = await User.findOne({ role: 'admin' });
  let inserted = 0;
  for (const item of items) {
    const { openingStock = 0, ...fields } = item;
    const result = await Product.updateOne(
      { name: fields.name },
      { $setOnInsert: fields },
      { upsert: true }
    );
    if (result.upsertedCount) inserted += 1;
    const product = await Product.findOne({ name: fields.name });
    const moves = await Inventory.countDocuments({ product: product._id });
    if (moves === 0 && openingStock > 0) {
      await Inventory.create({
        product: product._id,
        change: openingStock,
        type: 'stock_in',
        reason: 'Opening stock (seed)',
        byUser: admin?._id,
      });
      product.stockQuantity = openingStock;
      await product.save();
    }
  }
  logger.info(`Seeded products: ${inserted} new, ${items.length - inserted} already present`);
}

async function run() {
  await connectDB();
  await seedSettings();
  await seedAdmin();
  await seedStaff();
  await seedCollection(Service, 'services.seed.json', 'services');
  await seedCollection(Extra, 'extras.seed.json', 'extras');
  await seedProducts();
  await mongoose.connection.close();
  logger.info('Seeding complete.');
  process.exit(0);
}

run().catch((err) => {
  logger.error('Seeding failed:', err.message);
  process.exit(1);
});
