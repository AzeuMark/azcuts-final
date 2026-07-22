const mongoose = require('mongoose');

// services — haircuts & salon services (3.2).
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['haircut', 'salon'], default: 'haircut' },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, default: 30, min: 0 },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
