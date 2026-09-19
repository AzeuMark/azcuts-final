const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const features = require('../config/features');
const User = require('../models/User');
const Sale = require('../models/Sale');
const { recordSale } = require('../services/sales.service');

// POST /sales — record a service/product sale (staff + admin).
// Staff always record as themselves; admin may attribute via barberId.
const record = asyncHandler(async (req, res) => {
  const role = req.user?.role;
  const kinds = new Set((req.body.items || []).map((i) => i.kind));
  if (kinds.has('service') && !features.isEnabled('salesManagement.recordServiceSale')) {
    throw ApiError.forbidden('Feature disabled in school mode');
  }
  if (kinds.has('product') && !features.isEnabled('salesManagement.recordProductSale')) {
    throw ApiError.forbidden('Feature disabled in school mode');
  }

  let barberId = null;
  if (role === 'staff') {
    barberId = req.user.id;
  } else if (role === 'admin' && req.body.barberId) {
    const barber = await User.findById(req.body.barberId).select('role');
    if (!barber || barber.role !== 'staff') throw ApiError.badRequest('barberId must be a staff account');
    barberId = barber._id;
  } else if (role !== 'admin') {
    throw ApiError.forbidden('Only staff and admin can record sales');
  }

  const sale = await recordSale({
    items: req.body.items,
    customerId: req.body.customerId || null,
    barberId,
    recordedById: req.user.id,
    appointmentId: req.body.appointmentId || null,
  });
  return created(res, { sale }, 'Sale recorded');
});

// GET /sales/mine — the calling staff's relevant sales records.
const mine = asyncHandler(async (req, res) => {
  const limit = req.query.limit || 50;
  const me = req.user.id;
  const sales = await Sale.find({ $or: [{ barber: me }, { recordedBy: me }] })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customer', 'fullName')
    .populate('barber', 'fullName');
  return ok(res, { sales }, 'OK');
});

// GET /sales?barber&limit — review/monitor all sales (admin).
const list = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.barber) filter.barber = req.query.barber;
  const limit = req.query.limit || 50;
  const sales = await Sale.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('customer', 'fullName')
    .populate('barber', 'fullName')
    .populate('recordedBy', 'fullName role');
  return ok(res, { sales }, 'OK');
});

module.exports = { record, mine, list };
