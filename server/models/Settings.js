const mongoose = require('mongoose');

const dayHoursSchema = new mongoose.Schema(
  {
    open: { type: String, default: '09:00' },
    close: { type: String, default: '20:00' },
    closed: { type: Boolean, default: false },
  },
  { _id: false }
);

const shopInfoSchema = new mongoose.Schema(
  {
    name: { type: String, default: 'AzCuts' },
    tagline: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    mapEmbedUrl: { type: String, default: '' },
    socials: { type: Object, default: () => ({}) },
  },
  { _id: false }
);

// settings — single system-config document with a fixed string _id "system" (3.5).
const settingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'system' },
    systemMode: {
      type: String,
      enum: ['online', 'maintenance', 'offline'],
      default: 'online',
    },
    timezone: { type: String, default: 'Asia/Manila' },
    region: { type: String, default: 'PH' },
    country: { type: String, default: 'PH' },
    currency: { type: String, default: 'PHP' },
    taxRate: { type: Number, default: 0 },
    storeHours: {
      mon: { type: dayHoursSchema, default: () => ({}) },
      tue: { type: dayHoursSchema, default: () => ({}) },
      wed: { type: dayHoursSchema, default: () => ({}) },
      thu: { type: dayHoursSchema, default: () => ({}) },
      fri: { type: dayHoursSchema, default: () => ({}) },
      sat: { type: dayHoursSchema, default: () => ({}) },
      sun: { type: dayHoursSchema, default: () => ({ closed: true }) },
    },
    slotStepMinutes: { type: Number, default: 30 },
    nicknames: {
      type: [String],
      default: ['Barber', 'Hairstylist', 'Hairdresser', 'Stylist', 'No Input'],
    },
    shopInfo: { type: shopInfoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
