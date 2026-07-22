/*
 * seeder.js — quick admin reset for local testing.
 *
 * Run from the /server folder:   node seeder.js
 *
 * What it does: removes the existing admin account(s) and creates a fresh admin
 * using the credentials below. The password is hashed automatically by the User
 * model, so you type it in plaintext here.
 *
 * ⚠️  Testing helper only — do not run against production data.
 */

const mongoose = require('mongoose');
const env = require('./config/env'); // loads .env + gives MONGO_URI
const User = require('./models/User');

/* ────────────────────────────────────────────────────────────────────────────
 *  EDIT YOUR ADMIN CREDENTIALS HERE
 * ──────────────────────────────────────────────────────────────────────────── */
const ADMIN = {
  fullName: 'Administrator',
  username: 'admin',
  email: 'admin@azcuts.com',
  password: 'admin',
  phone: '', // optional
  nickname: '', // optional
};
/* ──────────────────────────────────────────────────────────────────────────── */

async function run() {
  await mongoose.connect(env.MONGO_URI);
  console.log(`\nConnected to MongoDB → ${mongoose.connection.name}`);

  const email = ADMIN.email.trim().toLowerCase();
  const username = ADMIN.username.trim().toLowerCase();

  // Overwrite: drop any existing admin account(s) and anyone already using the
  // target email or username, so we end up with exactly this one admin.
  const removed = await User.deleteMany({
    $or: [{ role: 'admin' }, { email }, { username }],
  });
  if (removed.deletedCount) {
    console.log(`Removed ${removed.deletedCount} existing account(s).`);
  }

  // Create the new admin (password hashed by the model's pre-save hook).
  const admin = await User.create({
    fullName: ADMIN.fullName,
    username,
    email,
    phone: ADMIN.phone || undefined,
    nickname: ADMIN.nickname || undefined,
    password: ADMIN.password,
    role: 'admin',
    status: 'active',
    isApproved: true,
  });

  console.log('\n✅ Admin account ready:');
  console.log(`   username: ${admin.username}`);
  console.log(`   email:    ${admin.email}`);
  console.log(`   password: ${ADMIN.password}   (stored hashed; shown here once)`);
  console.log('\nYou can now log in with these credentials.\n');
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\n❌ Seeder failed:', err.message);
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
    process.exit(1);
  });
