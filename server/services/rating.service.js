const Appointment = require('../models/Appointment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

/**
 * Recompute a staff member's rolling rating FROM their rated appointments
 * (the appointments are the source of truth). Because ratingCount is derived
 * from the number of rated appointments, editing an existing rating updates the
 * average without ever inflating the count.
 */
async function recomputeStaffRating(staffId) {
  const rated = await Appointment.find({
    assignedStaff: staffId,
    'rating.stars': { $gte: 1 },
  }).select('rating.stars');

  const ratingCount = rated.length;
  const sum = rated.reduce((acc, a) => acc + a.rating.stars, 0);
  const avgRating = ratingCount ? Math.round((sum / ratingCount) * 100) / 100 : 0;

  await User.findByIdAndUpdate(staffId, { avgRating, ratingCount });
  return { avgRating, ratingCount };
}

/**
 * Add or edit the customer's rating on a completed appointment, then recompute
 * the assigned staff's stats.
 */
async function rateAppointment({ appointmentId, customerId, stars, comment }) {
  const appt = await Appointment.findById(appointmentId);
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.customer.toString() !== customerId) {
    throw ApiError.forbidden('You can only rate your own appointment');
  }
  if (appt.status !== 'done') {
    throw ApiError.badRequest('You can only rate a completed appointment');
  }

  const isEdit = !!(appt.rating && appt.rating.stars);
  appt.rating = { stars, comment: (comment || '').trim(), ratedAt: new Date() };
  await appt.save();

  let staffStats = null;
  if (appt.assignedStaff) {
    staffStats = await recomputeStaffRating(appt.assignedStaff);
  }
  // TODO (Phase 9): notify.ratingAdded(staffId, staffStats.avgRating)

  return { appointment: appt, isEdit, staffStats };
}

module.exports = { rateAppointment, recomputeStaffRating };
