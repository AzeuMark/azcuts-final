const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const features = require('../config/features');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { applyChange } = require('../services/inventory.service');

function availabilityOf(product) {
  if (product.stockQuantity <= 0) return 'out';
  if (product.stockQuantity <= product.lowStockThreshold) return 'low';
  return 'in';
}

// GET /inventory/levels?lowOnly — current stock per product (staff + admin).
const levels = asyncHandler(async (req, res) => {
  const products = await Product.find({}).sort({ name: 1 });
  let rows = products.map((p) => ({
    product: p._id,
    name: p.name,
    price: p.price,
    stockQuantity: p.stockQuantity,
    lowStockThreshold: p.lowStockThreshold,
    isActive: p.isActive,
    availability: availabilityOf(p),
  }));
  if (req.query.lowOnly) rows = rows.filter((r) => r.availability === 'low' || r.availability === 'out');
  return ok(res, { levels: rows }, 'OK');
});

// GET /inventory/movements?productId&limit — ledger (staff + admin).
const movements = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.productId) filter.product = req.query.productId;
  const limit = req.query.limit || 50;
  const moves = await Inventory.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('product', 'name')
    .populate('byUser', 'fullName role');
  return ok(res, { movements: moves }, 'OK');
});

// PATCH /inventory/update — record a stock movement.
// Admin: full access. Staff: requires canUpdateStock (per-barber grant, S1)
// plus the updateStockBarberWhenAuthorized flag.
const update = asyncHandler(async (req, res) => {
  const role = req.user?.role;
  if (role === 'staff') {
    if (!features.isEnabled('inventoryManagement.updateStockBarberWhenAuthorized')) {
      throw ApiError.forbidden('Feature disabled in school mode');
    }
    const me = await User.findById(req.user.id).select('canUpdateStock');
    if (!me?.canUpdateStock) {
      throw ApiError.forbidden('Your account is not authorized to update stock');
    }
  } else if (role !== 'admin') {
    throw ApiError.forbidden('Only staff and admin can update stock');
  }

  const { productId, change, type, reason } = req.body;
  const { product, movement } = await applyChange({
    productId,
    change,
    type,
    reason,
    byUser: req.user.id,
  });
  return ok(
    res,
    {
      product: {
        product: product._id,
        name: product.name,
        stockQuantity: product.stockQuantity,
        availability: availabilityOf(product),
      },
      movement,
    },
    'Stock updated'
  );
});

module.exports = { levels, movements, update };
