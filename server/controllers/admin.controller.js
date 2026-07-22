const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Settings = require('../models/Settings');
const pricing = require('../services/pricing.service');
const { dayjs, DEFAULT_TZ, rangeBounds } = require('../utils/datetime');

const PAGE_SIZE = 20;

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pageParams(req) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || PAGE_SIZE));
  return { page, limit, skip: (page - 1) * limit };
}

// GET /admin/dashboard — live shop counters.
const dashboard = asyncHandler(async (req, res) => {
  const settings = await Settings.findById('system');
  const tz = settings?.timezone || DEFAULT_TZ;
  const start = dayjs().tz(tz).startOf('day').toDate();
  const end = dayjs().tz(tz).endOf('day').toDate();

  const [activeStaff, inService, bookingsToday, customersToday, salesAgg] = await Promise.all([
    User.countDocuments({ role: 'staff', status: { $in: ['active', 'in_service'] } }),
    Appointment.countDocuments({ status: 'in_service' }),
    Appointment.countDocuments({ scheduledStart: { $gte: start, $lte: end } }),
    Appointment.distinct('customer', { scheduledStart: { $gte: start, $lte: end } }),
    Appointment.aggregate([
      { $match: { status: 'done', finishedAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: '$priceSnapshot.total' }, count: { $sum: 1 } } },
    ]),
  ]);

  return ok(res, {
    dashboard: {
      activeStaff,
      inService,
      bookingsToday,
      customersToday: customersToday.length,
      salesToday: salesAgg[0]?.total || 0,
      completedToday: salesAgg[0]?.count || 0,
    },
  });
});

// Sort presets for the user manager.
const USER_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  name_asc: { fullName: 1 },
  name_desc: { fullName: -1 },
};

// GET /admin/users?role&status&search&sort&page&limit
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.search) {
    const rx = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { username: rx }];
  }

  const sort = USER_SORTS[req.query.sort] || USER_SORTS.newest;

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return ok(res, {
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /admin/users — create a customer OR staff (or admin).
const createUser = asyncHandler(async (req, res) => {
  const { fullName, username, email, phone, address, password, role = 'user', nickname } = req.body;

  const emailLc = String(email).toLowerCase();
  const usernameLc = String(username).toLowerCase();
  const exists = await User.findOne({ $or: [{ email: emailLc }, { username: usernameLc }] });
  if (exists) {
    if (exists.email === emailLc) throw ApiError.conflict('Email is already registered');
    throw ApiError.conflict('Username is already taken');
  }

  if (role === 'staff' && nickname) {
    const settings = await Settings.findById('system');
    if (settings && !settings.nicknames.includes(nickname)) {
      throw ApiError.badRequest('Nickname must be one of the configured staff nicknames');
    }
  }

  const user = await User.create({
    fullName,
    username: usernameLc,
    email: emailLc,
    phone,
    address,
    password,
    role,
    nickname,
    status: 'active',
    isApproved: true,
  });

  return created(res, { user: user.toPublic() }, `${role} account created`);
});

// PUT /admin/users/:id — edit any editable field (incl. password reset).
const updateUser = asyncHandler(async (req, res) => {
  // Select password so save-hook required validation passes; it only re-hashes
  // when the password field is actually modified.
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw ApiError.notFound('User not found');

  // Guard against self-lockout.
  if (req.params.id === req.user.id && req.body.role && req.body.role !== 'admin') {
    throw ApiError.badRequest('You cannot change your own role');
  }

  if (req.body.role === 'staff' && req.body.nickname) {
    const settings = await Settings.findById('system');
    if (settings && !settings.nicknames.includes(req.body.nickname)) {
      throw ApiError.badRequest('Nickname must be one of the configured staff nicknames');
    }
  }

  ['fullName', 'username', 'email', 'phone', 'address', 'nickname', 'role', 'status', 'isApproved', 'password'].forEach(
    (f) => {
      if (req.body[f] !== undefined) user[f] = req.body[f];
    }
  );

  await user.save();
  return ok(res, { user: user.toPublic() }, 'User updated');
});

// DELETE /admin/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw ApiError.badRequest('You cannot delete your own account');

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');

  // Admin accounts can't be deleted from the User Manager — an admin manages
  // their own credentials from their dashboard settings instead.
  if (user.role === 'admin') {
    throw ApiError.badRequest('Admin accounts cannot be deleted');
  }

  await user.deleteOne();
  return ok(res, { id: req.params.id }, 'User deleted');
});

// PATCH /admin/appointments/:id/discount — set per-booking discount % + recompute.
const setDiscount = asyncHandler(async (req, res) => {
  const { discountPercent } = req.body;
  const appt = await Appointment.findById(req.params.id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (['done', 'cancelled'].includes(appt.status)) {
    throw ApiError.conflict('Cannot change the discount on a finalized appointment');
  }

  appt.priceSnapshot = pricing.recomputeTotals(appt.priceSnapshot.toObject(), discountPercent);
  await appt.save();

  const populated = await appt.populate(['service', 'assignedStaff', 'extras', 'customer']);
  return ok(res, { appointment: populated }, 'Discount applied');
});

// Sort presets for the unified booking history.
const HISTORY_SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  upcoming: { scheduledStart: 1 },
  scheduled: { scheduledStart: -1 },
  total_desc: { 'priceSnapshot.total': -1 },
  total_asc: { 'priceSnapshot.total': 1 },
};

// GET /admin/history — unified appointment/booking history (replaces the old
// staff/users split, which rendered identical tables from the same data).
// Filters: ?status ?range ?assignment(all|assigned|unassigned) ?search ?sort ?page ?limit
const history = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pageParams(req);
  const filter = {};

  if (req.query.status) filter.status = req.query.status;

  const bounds = rangeBounds(req.query.range);
  if (bounds) filter.createdAt = { $gte: bounds.start, $lte: bounds.end };

  if (req.query.assignment === 'assigned') filter.assignedStaff = { $ne: null };
  else if (req.query.assignment === 'unassigned') filter.assignedStaff = null;

  // Free-text search across the receipt number and customer / staff names.
  const search = req.query.search && String(req.query.search).trim();
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i');
    const matchedUsers = await User.find({ fullName: rx }).select('_id');
    const userIds = matchedUsers.map((u) => u._id);
    filter.$or = [
      { receiptNo: rx },
      { customer: { $in: userIds } },
      { assignedStaff: { $in: userIds } },
    ];
  }

  const sort = HISTORY_SORTS[req.query.sort] || HISTORY_SORTS.newest;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(['service', 'assignedStaff', 'extras', 'customer']),
    Appointment.countDocuments(filter),
  ]);

  return ok(res, {
    appointments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

module.exports = {
  dashboard,
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  setDiscount,
  history,
};
