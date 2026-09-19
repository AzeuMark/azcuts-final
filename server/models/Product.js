const mongoose = require('mongoose');

// products — retail items sold/used by the shop (school paper collection `Products`).
// Stock level lives here as the denormalized current on-hand count; every
// change is also recorded in the `inventory` ledger (Phase S1).
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    price: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    // Same MongoDB image pattern as services (Addendum C): `image` is the
    // servable URL (GET /api/products/:id/image when bytes live in the DB);
    // the binary itself stays out of list queries via `select: false`.
    image: { type: String },
    imageData: { type: Buffer, select: false },
    imageType: { type: String, select: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ isActive: 1 });
productSchema.index({ name: 1 });

module.exports = mongoose.model('Product', productSchema);
