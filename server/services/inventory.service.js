const ApiError = require('../utils/ApiError');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');

// Central stock writer (S3). Every mutation goes through here — product
// endpoints never touch stockQuantity — so the ledger and the level stay in
// agreement. Negative moves are oversell-safe via an atomic guarded $inc.
async function applyChange({ productId, change, type, reason, byUser, referenceSale = null }) {
  const product = await Product.findById(productId);
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.isActive) throw ApiError.badRequest('Product is not available');

  // Type/direction rules (paper: stock in, sales, usage, corrections).
  if (type === 'stock_in' && change <= 0) {
    throw ApiError.badRequest('stock_in requires a positive change');
  }
  if ((type === 'sale' || type === 'usage') && change >= 0) {
    throw ApiError.badRequest(`${type} requires a negative change`);
  }
  if (type === 'adjustment' && (!reason || !reason.trim())) {
    throw ApiError.badRequest('adjustment requires a reason');
  }

  // Atomic level update. The $gte guard makes concurrent sales race-safe:
  // only one of two simultaneous last-unit sales can win the guard.
  const filter =
    change < 0
      ? { _id: productId, stockQuantity: { $gte: -change } }
      : { _id: productId };
  const updated = await Product.findOneAndUpdate(
    filter,
    { $inc: { stockQuantity: change } },
    { new: true }
  );
  if (!updated) throw ApiError.badRequest('Insufficient stock');

  const movement = await Inventory.create({
    product: productId,
    change,
    type,
    reason: reason?.trim() || undefined,
    referenceSale,
    byUser,
  });

  return { product: updated, movement };
}

module.exports = { applyChange };
