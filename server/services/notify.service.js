const { getIO } = require('../socket');
const { EVENTS, ROOMS } = require('../socket/events');

// Single funnel for all real-time emits. No-ops safely if Socket.io hasn't been
// initialized (e.g. during scripts/tests without a running server).
function emit(room, event, payload) {
  const io = getIO();
  if (!io) return;
  io.to(room).emit(event, payload);
}

const idOf = (ref) => (ref && ref._id ? String(ref._id) : ref ? String(ref) : null);

// Minimal appointment card for list/feed updates.
function card(appt) {
  return {
    id: String(appt._id),
    receiptNo: appt.receiptNo,
    status: appt.status,
    scheduledStart: appt.scheduledStart,
    scheduledEnd: appt.scheduledEnd,
    customer: idOf(appt.customer),
    customerName: appt.customer?.fullName,
    service: appt.service?.name || idOf(appt.service),
    assignedStaff: idOf(appt.assignedStaff),
    total: appt.priceSnapshot?.total,
  };
}

function statusPayload(appt) {
  return {
    id: String(appt._id),
    receiptNo: appt.receiptNo,
    status: appt.status,
    assignedStaff: idOf(appt.assignedStaff),
    acceptedAt: appt.acceptedAt,
    startedAt: appt.startedAt,
    finishedAt: appt.finishedAt,
    cancelledAt: appt.cancelledAt,
  };
}

// A new booking appeared → tell staff + admin, and nudge the dashboard.
function appointmentNew(appt) {
  emit(ROOMS.STAFF, EVENTS.APPOINTMENT_NEW, card(appt));
  emit(ROOMS.ADMIN, EVENTS.APPOINTMENT_NEW, card(appt));
  dashboardRefresh();
}

// A booking was routed/assigned to a specific staff member.
function appointmentAssigned(appt) {
  const staffId = idOf(appt.assignedStaff);
  if (staffId) emit(ROOMS.user(staffId), EVENTS.APPOINTMENT_ASSIGNED, card(appt));
}

// Any status change → notify the customer, the assigned staff, and admin.
function appointmentUpdated(appt) {
  const payload = statusPayload(appt);
  const customerId = idOf(appt.customer);
  const staffId = idOf(appt.assignedStaff);
  if (customerId) emit(ROOMS.user(customerId), EVENTS.APPOINTMENT_UPDATED, payload);
  if (staffId) emit(ROOMS.user(staffId), EVENTS.APPOINTMENT_UPDATED, payload);
  emit(ROOMS.ADMIN, EVENTS.APPOINTMENT_UPDATED, payload);
  dashboardRefresh();
}

// A rating was added/edited → update the staff member and admin.
function ratingAdded(staffId, newAvg) {
  const id = idOf(staffId);
  if (!id) return;
  emit(ROOMS.user(id), EVENTS.RATING_ADDED, { staffId: id, newAvg });
  emit(ROOMS.ADMIN, EVENTS.RATING_ADDED, { staffId: id, newAvg });
}

// Lightweight signal so admin dashboards refetch their counters.
function dashboardRefresh() {
  emit(ROOMS.ADMIN, EVENTS.DASHBOARD_REFRESH, { at: new Date().toISOString() });
}

module.exports = {
  appointmentNew,
  appointmentAssigned,
  appointmentUpdated,
  ratingAdded,
  dashboardRefresh,
  card,
};
