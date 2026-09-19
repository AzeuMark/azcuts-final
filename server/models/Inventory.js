const mongoose = require('mongoose');

const { ObjectId } = mongoose.Schema.Types;

// inventory — stock movement ledger (school paper collection `Inventory`).
// One document per movement; the current level is denormalized onto
// `products.stockQuantity`. Types:
//   stock_in   — delivery / restock (+change, admin)
//   sale       — product sold to a customer (−change, links referenceSale)
//   usage      — barber consumed product while performing a service (−change)
//   adjustment — manual correction, requires a reason (±change, admin)
const inventorySchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: 'Product', required: true },
    change: { type: Number, required: true }, // +in / −out, never 0
    type: {
      type: String,
      enum: ['stock_in', 'sale', 'usage', 'adjustment'],
      required: true,
    },
    reason: { type: String, trim: true }, // required for adjustment (enforced in service)
    referenceSale: { type: ObjectId, ref: 'Sale', default: null },
    byUser: { type: ObjectId, ref: 'User' }, // who recorded it
  },
  { timestamps: true }
);

inventorySchema.index({ product: 1, createdAt: -1 });
inventorySchema.index({ type: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
