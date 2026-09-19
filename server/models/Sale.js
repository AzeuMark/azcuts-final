const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

// One line item inside a sale — price snapshotted so later catalog edits
// never rewrite historical sales (same idea as the appointment priceSnapshot).
const saleItemSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['service', 'product'], required: true },
    refId: { type: ObjectId, required: true }, // Service or Product id
    name: { type: String, required: true }, // snapshot
    qty: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 }, // snapshot per unit
  },
  { _id: false }
);

// sales — explicit sales records (school paper collection `Sales`).
// Service sales are auto-created when an appointment flips to `done`
// (S4); product sales are recorded by barber/admin (S4). Revenue reports
// aggregate from here instead of re-deriving from appointments.
const saleSchema = new mongoose.Schema(
  {
    saleNo: { type: String, unique: true, sparse: true }, // e.g. SL-20260715-0007
    customer: { type: ObjectId, ref: 'User', default: null }, // null = walk-in
    barber: { type: ObjectId, ref: 'User', default: null },
    recordedBy: { type: ObjectId, ref: 'User', required: true },
    appointment: { type: ObjectId, ref: 'Appointment', default: null },
    items: { type: [saleItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }, // = subtotal in school mode
    paymentMethod: { type: String, enum: ['cash'], default: 'cash' },
  },
  { timestamps: true }
);

saleSchema.index({ recordedBy: 1, createdAt: -1 });
saleSchema.index({ barber: 1, createdAt: -1 });

module.exports = mongoose.model('Sale', saleSchema);
