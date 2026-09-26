const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const features = require('../config/features');
const User = require('../models/User');
const Sale = require('../models/Sale');
const { recordSale } = require('../services/sales.service');
const { rangeBounds } = require('../utils/datetime');

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

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SALE_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  total_desc: { total: -1 },
  total_asc: { total: 1 },
};

function salePageParams(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  return { page, limit, skip: (page - 1) * limit };
}

// Shared filter builder for both mine + admin list:
// ?search (saleNo/customer/barber) ?sort ?range ?type(booking|counter)
async function buildSaleFilter(req, base = {}) {
  const filter = { ...base };

  const bounds = rangeBounds(req.query.range);
  if (bounds) filter.createdAt = { $gte: bounds.start, $lte: bounds.end };

  if (req.query.type === 'booking') filter.appointment = { $ne: null };
  else if (req.query.type === 'counter') filter.appointment = null;

  const search = req.query.search && String(req.query.search).trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const matchedUsers = await User.find({ fullName: rx }).select('_id');
    const userIds = matchedUsers.map((u) => u._id);
    filter.$or = [
      { saleNo: rx },
      { customer: { $in: userIds } },
      { barber: { $in: userIds } },
    ];
  }

  return filter;
}

// GET /sales/mine — the calling staff's relevant sales records.
const mine = asyncHandler(async (req, res) => {
  const { page, limit, skip } = salePageParams(req);
  const me = req.user.id;
  const base = { $or: [{ barber: me }, { recordedBy: me }] };
  // $or base + additional filters must combine via $and.
  const extra = await buildSaleFilter(req);
  const filter = Object.keys(extra).length ? { $and: [base, extra] } : base;
  const sort = SALE_SORTS[req.query.sort] || SALE_SORTS.newest;

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'fullName')
      .populate('barber', 'fullName'),
    Sale.countDocuments(filter),
  ]);
  return ok(res, { sales, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, 'OK');
});

// GET /sales?barber&limit — review/monitor all sales (admin).
const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = salePageParams(req);
  const base = {};
  if (req.query.barber) base.barber = req.query.barber;
  const filter = await buildSaleFilter(req, base);
  const sort = SALE_SORTS[req.query.sort] || SALE_SORTS.newest;

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'fullName')
      .populate('barber', 'fullName')
      .populate('recordedBy', 'fullName role'),
    Sale.countDocuments(filter),
  ]);
  return ok(res, { sales, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }, 'OK');
});

module.exports = { record, mine, list };
