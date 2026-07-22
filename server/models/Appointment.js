const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

// Frozen price breakdown, snapshotted at booking so later inventory edits
// never rewrite historical receipts (2.4).
const priceSnapshotSchema = new mongoose.Schema(
  {
    base: Number,
    extras: [
      {
        id: { type: ObjectId, ref: 'Extra' },
        name: String,
        price: Number,
      },
    ],
    subtotal: Number,
    discountPercent: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: Number,
    currency: { type: String, default: 'PHP' },
  },
  { _id: false }
);

// One audit entry per state transition (2.1).
const statusHistorySchema = new mongoose.Schema(
  {
    status: String,
    at: { type: Date, default: Date.now },
    byUser: { type: ObjectId, ref: 'User' },
    byRole: String,
    note: String,
  },
  { _id: false }
);

const ratingSchema = new mongoose.Schema(
  {
    stars: { type: Number, min: 1, max: 5 },
    comment: { type: String, trim: true },
    ratedAt: Date,
  },
  { _id: false }
);

// appointments — the central transactional collection (3.4).
const appointmentSchema = new mongoose.Schema(
  {
    receiptNo: { type: String, unique: true, sparse: true }, // e.g. AZ-20260715-0007
    customer: { type: ObjectId, ref: 'User', required: true },
    assignedStaff: { type: ObjectId, ref: 'User', default: null }, // null = pending pool
    service: { type: ObjectId, ref: 'Service', required: true },
    extras: [{ type: ObjectId, ref: 'Extra' }],
    priceSnapshot: priceSnapshotSchema,
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'in_service', 'done', 'cancelled'],
      default: 'pending',
    },
    statusHistory: [statusHistorySchema],
    paymentMethod: { type: String, enum: ['cash', 'gcash'], default: 'cash' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid'], default: 'unpaid' },
    cancelReason: String,
    cancelledBy: {
      userId: { type: ObjectId, ref: 'User' },
      role: String,
    },
    rating: { type: ratingSchema, default: null },
    autoAssigned: { type: Boolean, default: false },
    acceptedAt: Date,
    startedAt: Date,
    finishedAt: Date,
    cancelledAt: Date,
  },
  { timestamps: true }
);

appointmentSchema.index({ customer: 1, createdAt: -1 });
appointmentSchema.index({ assignedStaff: 1, scheduledStart: 1 });
appointmentSchema.index({ status: 1, scheduledStart: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
