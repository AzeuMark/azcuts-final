const Settings = require('../models/Settings');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { nextReceiptNo } = require('../utils/receiptNo');
const pricingService = require('./pricing.service');
const scheduling = require('./scheduling.service');
const assignment = require('./assignment.service');
const notify = require('./notify.service');
const salesService = require('./sales.service');
const features = require('../config/features');

// Legal appointment status transitions (SERVER_PLAN 2.1).
// 'accepted -> pending' is the staff-reject-to-pool path handled specially below.
// Once accepted, a booking can no longer be cancelled — only pending can.
const ALLOWED = {
  pending: ['accepted', 'cancelled'],
  accepted: ['in_service', 'pending'],
  in_service: ['done'],
  done: [],
  cancelled: [],
};

// A booking is "active" (in flight) until it reaches a terminal state.
// Used to enforce the one-active-booking-per-customer rule at creation time.
const ACTIVE_STATUSES = ['pending', 'accepted', 'in_service'];

function assertTransition(from, to) {
  if (!ALLOWED[from] || !ALLOWED[from].includes(to)) {
    throw ApiError.conflict(`Cannot change status from '${from}' to '${to}'`);
  }
}

function pushHistory(appt, status, actor, note) {
  appt.statusHistory.push({
    status,
    at: new Date(),
    byUser: actor?.id || null,
    byRole: actor?.role || 'system',
    note,
  });
}

function assertAssignedOrAdmin(appt, actor) {
  if (actor.role === 'admin') return;
  if (appt.assignedStaff && appt.assignedStaff.toString() === actor.id) return;
  throw ApiError.forbidden('You are not assigned to this appointment');
}

const POPULATE = ['service', 'assignedStaff', 'extras', 'customer'];

/**
 * Create a booking (SERVER_PLAN Phase 3).
 * The server computes everything: total duration, price snapshot, receipt number,
 * and staff assignment. Auto-assign least-loaded ROUTING is layered in Phase 4;
 * for now an "auto" booking lands in the pending pool (assignedStaff = null).
 */
async function createBooking({
  customerId,
  serviceId,
  extraIds = [],
  scheduledStart,
  staffId = null,
  paymentMethod = 'cash',
}) {
  // gcash exists in the schema but is disabled (never processed).
  if (paymentMethod && paymentMethod !== 'cash') {
    throw ApiError.badRequest('GCash is not available yet — please choose cash');
  }

  // One active booking at a time (gated — off in school mode, S5).
  if (features.isEnabled('appointmentManagement.oneActiveBookingLimit')) {
    const activeBooking = await Appointment.findOne({
      customer: customerId,
      status: { $in: ACTIVE_STATUSES },
    }).select('_id status');
    if (activeBooking) {
      throw ApiError.conflict(
        'You already have a booking in progress. Please wait until it is completed or cancelled before booking again.'
      );
    }
  }

  const settings = await Settings.findById('system');
  const tz = settings?.timezone || undefined;

  // S5: extras are a non-paper feature — rejected in school mode (booking is
  // service-only; the client hides the extras step behind its own flag).
  if (extraIds.length > 0 && !features.isEnabled('extras.enabled')) {
    throw ApiError.badRequest('Extras are disabled in school mode — please book a service only');
  }

  const { service, extras, totalDuration } = await scheduling.resolveServiceAndExtras(
    serviceId,
    extraIds
  );

  const start = new Date(scheduledStart);
  if (Number.isNaN(start.getTime())) throw ApiError.badRequest('Invalid scheduledStart');
  if (start < new Date()) throw ApiError.badRequest('Cannot book a time in the past');

  const end = scheduling.addMinutes(start, totalDuration);

  // Must fall inside the shop's open hours for that day.
  scheduling.assertWithinStoreHours(start, end, settings, tz);

  // Staff assignment — customers may pick a specific barber (or Auto).
  // A specific pick is validated (on-shift + free) and booked assigned-pending
  // for that barber to accept. Auto (no staffId) stays unassigned for the
  // owner to assign, but still requires at least one free on-shift barber.
  let assignedStaff = null;
  let autoAssigned = false;

  if (staffId) {
    const staff = await User.findOne({ _id: staffId, role: 'staff' });
    if (!staff) throw ApiError.notFound('Staff not found');
    if (staff.status === 'inactive') throw ApiError.badRequest('That staff member is off shift');

    const free = await scheduling.isStaffFree(staff._id, start, end);
    if (!free) throw ApiError.conflict('That staff member is already booked for this time');

    assignedStaff = staff._id;
  } else if (features.isEnabled('appointmentManagement.autoAssignLeastLoaded')) {
    // Auto: route to the least-loaded free staff (2.3). If none are eligible,
    // the booking lands in the pending pool (assignedStaff = null, awaiting staff).
    autoAssigned = true;
    const picked = await assignment.pickLeastLoadedStaff({ start, end });
    assignedStaff = picked ? picked._id : null;
  } else {
    // School mode: booking stays unassigned for the owner, but the slot must
    // have at least one free on-shift barber or it could never be served.
    const anyFree = await assignment.pickLeastLoadedStaff({ start, end });
    if (!anyFree) {
      throw ApiError.conflict('No barber is free for this time — please choose another slot');
    }
  }

  // Price snapshot (discount 0 at booking; tax from settings).
  const priceSnapshot = pricingService.computePricing({
    service,
    extras,
    discountPercent: 0,
    taxRate: settings?.taxRate || 0,
    currency: settings?.currency || 'PHP',
  });

  const receiptNo = await nextReceiptNo(tz);

  const appointment = await Appointment.create({
    receiptNo,
    customer: customerId,
    assignedStaff,
    service: service._id,
    extras: extras.map((e) => e._id),
    priceSnapshot,
    scheduledStart: start,
    scheduledEnd: end,
    status: 'pending',
    autoAssigned,
    paymentMethod: 'cash',
    paymentStatus: 'unpaid',
    statusHistory: [
      {
        status: 'pending',
        at: new Date(),
        byUser: customerId,
        byRole: 'user',
        note: assignedStaff ? 'Booked (staff selected)' : 'Booked (awaiting staff)',
      },
    ],
  });

  const populated = await appointment.populate(POPULATE);
  notify.appointmentNew(populated);
  if (populated.assignedStaff) notify.appointmentAssigned(populated);
  return populated;
}

// pending -> accepted. A staff accepts an appointment routed to them, or claims
// one from the pending pool (assignedStaff = null). Done atomically to avoid two
// staff claiming the same pooled booking.
async function acceptAppointment(id, staffActor) {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.status !== 'pending') {
    throw ApiError.conflict(`Cannot accept an appointment in status '${appt.status}'`);
  }
  if (appt.assignedStaff && appt.assignedStaff.toString() !== staffActor.id) {
    throw ApiError.forbidden('This appointment is routed to another staff member');
  }
  // S5 school mode: no pending pool — staff may only confirm appointments the
  // admin assigned to them (no self-claiming unassigned bookings).
  if (!appt.assignedStaff && !features.isEnabled('appointmentManagement.pendingPool')) {
    throw ApiError.forbidden('This booking is awaiting admin assignment');
  }

  const free = await scheduling.isStaffFree(staffActor.id, appt.scheduledStart, appt.scheduledEnd, {
    excludeAppointmentId: appt._id,
  });
  if (!free) throw ApiError.conflict('You have an overlapping appointment for this time');

  const updated = await Appointment.findOneAndUpdate(
    { _id: id, status: 'pending', $or: [{ assignedStaff: null }, { assignedStaff: staffActor.id }] },
    {
      $set: { assignedStaff: staffActor.id, status: 'accepted', acceptedAt: new Date() },
      $push: {
        statusHistory: {
          status: 'accepted',
          at: new Date(),
          byUser: staffActor.id,
          byRole: staffActor.role,
          note: 'Accepted by staff',
        },
      },
    },
    { new: true }
  );
  if (!updated) throw ApiError.conflict('Appointment is no longer available');
  const populated = await updated.populate(POPULATE);
  notify.appointmentUpdated(populated);
  notify.appointmentAssigned(populated);
  return populated;
}

// Staff reject (accepted/pending -> pending pool). Clears assignment, keeps the
// booking pending, then re-routes to the next least-loaded staff (excluding the
// rejecting one). If nobody is left, the booking is cancelled.
async function rejectAppointment(id, staffActor, reason) {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (!appt.assignedStaff || appt.assignedStaff.toString() !== staffActor.id) {
    throw ApiError.forbidden('This appointment is not assigned to you');
  }
  if (!['pending', 'accepted'].includes(appt.status)) {
    throw ApiError.conflict(`Cannot reject an appointment in status '${appt.status}'`);
  }

  const rejectingStaffId = appt.assignedStaff;
  appt.assignedStaff = null;
  appt.status = 'pending';
  pushHistory(appt, 'pending', staffActor, reason ? `Rejected: ${reason}` : 'Rejected by staff');

  // S5 school mode: no re-route — the booking returns to the admin for manual
  // re-assignment (it must NOT auto-cancel a customer's booking).
  if (!features.isEnabled('appointmentManagement.rejectReRoute')) {
    pushHistory(appt, 'pending', null, 'Returned for admin assignment after reject');
    await appt.save();
    const returned = await appt.populate(POPULATE);
    notify.appointmentUpdated(returned);
    return returned;
  }

  const picked = await assignment.pickLeastLoadedStaff({
    start: appt.scheduledStart,
    end: appt.scheduledEnd,
    excludeStaffIds: [rejectingStaffId],
  });

  if (picked) {
    appt.assignedStaff = picked._id;
    appt.autoAssigned = true;
    pushHistory(appt, 'pending', null, `Re-routed to ${picked.fullName}`);
  } else {
    appt.status = 'cancelled';
    appt.cancelReason = 'No staff available';
    appt.cancelledBy = { userId: null, role: 'system' };
    appt.cancelledAt = new Date();
    pushHistory(appt, 'cancelled', null, 'Cancelled — no staff available after reject');
  }

  await appt.save();
  const populated = await appt.populate(POPULATE);
  notify.appointmentUpdated(populated);
  if (populated.assignedStaff) notify.appointmentAssigned(populated);
  return populated;
}

// accepted -> in_service -> done, driven by PATCH /appointments/:id/status.
async function advanceStatus(id, targetStatus, actor) {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  assertAssignedOrAdmin(appt, actor);
  assertTransition(appt.status, targetStatus);

  if (targetStatus === 'in_service') {
    appt.status = 'in_service';
    appt.startedAt = new Date();
    pushHistory(appt, 'in_service', actor, 'Service started');
    if (appt.assignedStaff) {
      await User.findByIdAndUpdate(appt.assignedStaff, { status: 'in_service' });
    }
  } else if (targetStatus === 'done') {
    appt.status = 'done';
    appt.finishedAt = new Date();
    pushHistory(appt, 'done', actor, 'Service completed');
    if (appt.assignedStaff) {
      // freeze counters + free the staff back to active
      await User.findByIdAndUpdate(appt.assignedStaff, {
        $inc: { totalServed: 1 },
        $set: { status: 'active' },
      });
    }
    // S4 (school paper: Sales) — auto-create the service sale. Best-effort:
    // salesService logs and continues on failure so `done` never breaks.
    const populatedForSale = await appt.populate(['service', 'assignedStaff', 'customer']);
    await salesService.autoCreateServiceSale(populatedForSale, actor);
  } else {
    throw ApiError.badRequest('This endpoint only advances to in_service or done');
  }

  await appt.save();
  const populated = await appt.populate(POPULATE);
  notify.appointmentUpdated(populated);
  return populated;
}

// Admin manual assign (S5, school paper: "Assign available barber/stylist").
// Sets/replaces the barber on a pending booking: the staff must exist, be
// on-shift, and be free for the booked block (same overlap test as booking).
async function assignAppointment(id, staffId, adminActor) {
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');
  if (appt.status !== 'pending') {
    throw ApiError.conflict(`Only pending bookings can be assigned (status: '${appt.status}')`);
  }

  const staff = await User.findOne({ _id: staffId, role: 'staff' });
  if (!staff) throw ApiError.notFound('Staff not found');
  if (staff.status === 'inactive') throw ApiError.badRequest('That staff member is off shift');

  const free = await scheduling.isStaffFree(staff._id, appt.scheduledStart, appt.scheduledEnd, {
    excludeAppointmentId: appt._id,
  });
  if (!free) throw ApiError.conflict('That staff member is already booked for this time');

  appt.assignedStaff = staff._id;
  appt.assignedBy = adminActor.id;
  appt.autoAssigned = false;
  pushHistory(appt, 'pending', adminActor, `Assigned to ${staff.fullName} by admin`);

  await appt.save();
  const populated = await appt.populate(POPULATE);
  notify.appointmentUpdated(populated);
  notify.appointmentAssigned(populated);
  return populated;
}

// pending -> cancelled. Allowed for the owner, the assigned staff, or admin.
// Once accepted, a booking can no longer be cancelled (409 via the map above).
// S5: the reason is optional in school mode (defaults to 'Cancelled').
async function cancelAppointment(id, actor, reason) {
  if (!reason || !String(reason).trim()) {
    if (features.isEnabled('appointmentManagement.cancelWithReason')) {
      throw ApiError.badRequest('A cancellation reason is required');
    }
    reason = 'Cancelled';
  }
  const appt = await Appointment.findById(id);
  if (!appt) throw ApiError.notFound('Appointment not found');

  const isOwner = actor.role === 'user' && appt.customer.toString() === actor.id;
  const isAssignedStaff =
    actor.role === 'staff' && appt.assignedStaff && appt.assignedStaff.toString() === actor.id;
  const isAdmin = actor.role === 'admin';
  if (!isOwner && !isAssignedStaff && !isAdmin) {
    throw ApiError.forbidden('You cannot cancel this appointment');
  }

  assertTransition(appt.status, 'cancelled'); // 409 if done / in_service

  appt.status = 'cancelled';
  appt.cancelReason = String(reason).trim();
  appt.cancelledBy = { userId: actor.id, role: actor.role };
  appt.cancelledAt = new Date();
  pushHistory(appt, 'cancelled', actor, appt.cancelReason);

  await appt.save();
  const populated = await appt.populate(POPULATE);
  notify.appointmentUpdated(populated);
  return populated;
}

module.exports = {
  createBooking,
  acceptAppointment,
  rejectAppointment,
  assignAppointment,
  advanceStatus,
  cancelAppointment,
  ALLOWED,
};
