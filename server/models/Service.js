const mongoose = require('mongoose');

// services — haircuts & salon services (3.2).
const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['haircut', 'salon'], default: 'haircut' },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    durationMinutes: { type: Number, required: true, default: 30, min: 0 },
    // `image` is the servable URL (points at GET /api/services/:id/image when the
    // bytes live in the DB, or a legacy /uploads/* path). The binary itself is
    // stored on the document and kept out of list queries via `select: false`.
    image: { type: String },
    imageData: { type: Buffer, select: false },
    imageType: { type: String, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

serviceSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Service', serviceSchema);
