const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const Appointment = require('../models/Appointment');
const scheduling = require('../services/scheduling.service');
const appointmentService = require('../services/appointment.service');
const receiptService = require('../services/receipt.service');

// (declared below) changeStatus + cancel handlers

// Ownership guard: owner (customer), the assigned staff, or an admin.
function assertCanView(user, appt) {
  if (user.role === 'admin') return;
  const customerId = appt.customer?._id ? appt.customer._id.toString() : String(appt.customer);
  if (user.role === 'user' && customerId === user.id) return;
  if (user.role === 'staff' && appt.assignedStaff) {
    const staffId = appt.assignedStaff._id ? appt.assignedStaff._id.toString() : String(appt.assignedStaff);
    if (staffId === user.id) return;
  }
  throw ApiError.forbidden('You cannot access this appointment');
}

// Normalize the extras query param (?extras=a&extras=b OR ?extras=a,b).
function parseExtras(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return String(raw).split(',').map((s) => s.trim()).filter(Boolean);
}

const availableSlots = asyncHandler(async (req, res) => {
  const { serviceId, date, staffId } = req.query;
  const extraIds = parseExtras(req.query.extras);
  const result = await scheduling.getAvailableSlots({
    serviceId,
    date,
    extraIds,
    staffId: staffId || null,
  });
  return ok(res, result, 'OK');
});

const createBooking = asyncHandler(async (req, res) => {
  const { serviceId, extras = [], scheduledStart, staffId, paymentMethod } = req.body;
  const appointment = await appointmentService.createBooking({
    customerId: req.user.id,
    serviceId,
    extraIds: extras,
    scheduledStart,
    staffId: staffId || null,
    paymentMethod,
  });
  return created(res, { appointment }, 'Booking created');
});

const listMine = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const filter = { customer: req.user.id };
  if (req.query.status) filter.status = req.query.status;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(['service', 'assignedStaff', 'extras']),
    Appointment.countDocuments(filter),
  ]);

  return ok(res, {
    appointments,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getOne = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate([
    'customer',
    'service',
    'assignedStaff',
    'extras',
  ]);
  if (!appt) throw ApiError.notFound('Appointment not found');
  assertCanView(req.user, appt);
  return ok(res, { appointment: appt });
});

const getReceipt = asyncHandler(async (req, res) => {
  const appt = await Appointment.findById(req.params.id).populate([
    'customer',
    'service',
    'assignedStaff',
    'extras',
  ]);
  if (!appt) throw ApiError.notFound('Appointment not found');
  assertCanView(req.user, appt);
  const receipt = await receiptService.buildReceipt(appt);
  return ok(res, { receipt });
});

const changeStatus = asyncHandler(async (req, res) => {
  const appt = await appointmentService.advanceStatus(req.params.id, req.body.status, req.user);
  return ok(res, { appointment: appt }, `Appointment marked ${req.body.status}`);
});

const cancel = asyncHandler(async (req, res) => {
  const appt = await appointmentService.cancelAppointment(req.params.id, req.user, req.body.cancelReason);
  return ok(res, { appointment: appt }, 'Appointment cancelled');
});

module.exports = {
  availableSlots,
  createBooking,
  listMine,
  getOne,
  getReceipt,
  changeStatus,
  cancel,
};
