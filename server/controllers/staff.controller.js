const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const ApiError = require('../utils/ApiError');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const appointmentService = require('../services/appointment.service');

// GET /staff/appointments?scope=incoming|mine
// incoming = pending bookings routed to me OR sitting in the pool (unassigned)
// mine     = my accepted / in-service queue
const listAppointments = asyncHandler(async (req, res) => {
  const staffId = req.user.id;
  const scope = req.query.scope === 'mine' ? 'mine' : 'incoming';

  const filter =
    scope === 'mine'
      ? { assignedStaff: staffId, status: { $in: ['accepted', 'in_service'] } }
      : { status: 'pending', $or: [{ assignedStaff: staffId }, { assignedStaff: null }] };

  const appointments = await Appointment.find(filter)
    .sort({ scheduledStart: 1 })
    .populate(['service', 'extras', 'customer']);

  return ok(res, { scope, appointments });
});

const accept = asyncHandler(async (req, res) => {
  const appt = await appointmentService.acceptAppointment(req.params.id, req.user);
  return ok(res, { appointment: appt }, 'Appointment accepted');
});

const reject = asyncHandler(async (req, res) => {
  const appt = await appointmentService.rejectAppointment(req.params.id, req.user, req.body.reason);
  const message =
    appt.status === 'cancelled'
      ? 'Appointment rejected — no other staff available, so it was cancelled'
      : 'Appointment rejected and re-routed';
  return ok(res, { appointment: appt }, message);
});

// GET /staff/history — completed appointments + rolling stats.
const history = asyncHandler(async (req, res) => {
  const staffId = req.user.id;

  const appointments = await Appointment.find({ assignedStaff: staffId, status: 'done' })
    .sort({ finishedAt: -1 })
    .populate(['service', 'extras', 'customer']);

  const staff = await User.findById(staffId);
  const ratings = appointments
    .filter((a) => a.rating && a.rating.stars)
    .map((a) => ({
      appointmentId: a._id,
      stars: a.rating.stars,
      comment: a.rating.comment,
      ratedAt: a.rating.ratedAt,
    }));

  return ok(res, {
    appointments,
    stats: {
      totalServed: staff?.totalServed || 0,
      avgRating: staff?.avgRating || 0,
      ratingCount: staff?.ratingCount || 0,
    },
    ratings,
  });
});

// PATCH /staff/shift — toggle on/off shift.
const setShift = asyncHandler(async (req, res) => {
  const { status } = req.body; // active | inactive (validated)
  const staff = await User.findByIdAndUpdate(
    req.user.id,
    { status },
    { new: true }
  );
  if (!staff) throw ApiError.notFound('Staff not found');
  return ok(res, { status: staff.status }, `You are now ${status === 'active' ? 'on' : 'off'} shift`);
});

module.exports = { listAppointments, accept, reject, history, setShift };
