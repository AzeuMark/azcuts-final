const mongoose = require('mongoose');

// extras — additionals (bleaching, treatments, etc.) (3.3).
const extraSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 }, // optionally extends slot length
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Extra', extraSchema);
