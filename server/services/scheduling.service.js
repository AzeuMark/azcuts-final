const Settings = require('../models/Settings');
const Service = require('../models/Service');
const Extra = require('../models/Extra');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const ApiError = require('../utils/ApiError');
const { dayjs, DEFAULT_TZ, weekdayKey } = require('../utils/datetime');

// Statuses that occupy a staff member's time (block the slot).
const ACTIVE_STATUSES = ['pending', 'accepted', 'in_service'];

// Two intervals overlap iff aStart < bEnd && aEnd > bStart.
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60000);
}

// Resolve a booking's service + selected extras and the total block length.
async function resolveServiceAndExtras(serviceId, extraIds = []) {
  const service = await Service.findById(serviceId);
  if (!service || !service.isActive) throw ApiError.notFound('Service not found');

  const extras = extraIds.length
    ? await Extra.find({ _id: { $in: extraIds }, isActive: true })
    : [];

  // Guard against unknown/inactive extra ids being silently dropped.
  if (extras.length !== extraIds.length) {
    throw ApiError.badRequest('One or more selected extras are unavailable');
  }

  const totalDuration =
    service.durationMinutes + extras.reduce((sum, e) => sum + (e.durationMinutes || 0), 0);

  return { service, extras, totalDuration };
}

// Is a specific staff member free for [start, end)? (no overlapping active appt)
async function isStaffFree(staffId, start, end, { excludeAppointmentId } = {}) {
  const query = {
    assignedStaff: staffId,
    status: { $in: ACTIVE_STATUSES },
    scheduledStart: { $lt: end },
    scheduledEnd: { $gt: start },
  };
  if (excludeAppointmentId) query._id = { $ne: excludeAppointmentId };
  const conflict = await Appointment.findOne(query).select('_id');
  return !conflict;
}

// Throw if [start, end) falls outside the shop's open hours for that day.
function assertWithinStoreHours(start, end, settings, tz) {
  const startZ = dayjs(start).tz(tz);
  const dateStr = startZ.format('YYYY-MM-DD');
  const key = weekdayKey(dateStr, tz);
  const hours = settings?.storeHours?.[key];

  if (!hours || hours.closed) {
    throw ApiError.badRequest('The shop is closed on the selected day');
  }
  const open = dayjs.tz(`${dateStr} ${hours.open}`, 'YYYY-MM-DD HH:mm', tz).toDate();
  const close = dayjs.tz(`${dateStr} ${hours.close}`, 'YYYY-MM-DD HH:mm', tz).toDate();

  if (start < open || end > close) {
    throw ApiError.badRequest('Selected time is outside store hours');
  }
}

/**
 * Slot availability (SERVER_PLAN 2.2).
 * Returns every non-past candidate slot for the day with how many staff are free.
 */
async function getAvailableSlots({ serviceId, date, extraIds = [], staffId = null }) {
  const settings = await Settings.findById('system');
  const tz = settings?.timezone || DEFAULT_TZ;
  const step = settings?.slotStepMinutes || 30;

  const { totalDuration } = await resolveServiceAndExtras(serviceId, extraIds);

  const key = weekdayKey(date, tz);
  const hours = settings?.storeHours?.[key];
  if (!hours || hours.closed) {
    return { date, totalDuration, tz, closed: true, slots: [] };
  }

  const openDt = dayjs.tz(`${date} ${hours.open}`, 'YYYY-MM-DD HH:mm', tz);
  const closeDt = dayjs.tz(`${date} ${hours.close}`, 'YYYY-MM-DD HH:mm', tz);
  const lastStart = closeDt.subtract(totalDuration, 'minute');

  // Determine the candidate pool of staff.
  let staffList;
  if (staffId) {
    const staff = await User.findOne({ _id: staffId, role: 'staff' });
    if (!staff) throw ApiError.notFound('Staff not found');
    staffList = [staff];
  } else {
    staffList = await User.find({ role: 'staff', status: { $in: ['active', 'in_service'] } });
  }

  // Preload each staff member's active appointments across the day window.
  const dayStart = openDt.toDate();
  const dayEnd = closeDt.toDate();
  const busyByStaff = new Map();
  await Promise.all(
    staffList.map(async (s) => {
      const appts = await Appointment.find({
        assignedStaff: s._id,
        status: { $in: ACTIVE_STATUSES },
        scheduledStart: { $lt: dayEnd },
        scheduledEnd: { $gt: dayStart },
      }).select('scheduledStart scheduledEnd');
      busyByStaff.set(String(s._id), appts);
    })
  );

  const now = new Date();
  const slots = [];
  let cursor = openDt;

  while (!cursor.isAfter(lastStart)) {
    const start = cursor.toDate();
    const end = addMinutes(start, totalDuration);

    if (start >= now) {
      let freeCount = 0;
      for (const s of staffList) {
        const busy = busyByStaff.get(String(s._id)) || [];
        const conflict = busy.some((a) => overlaps(start, end, a.scheduledStart, a.scheduledEnd));
        if (!conflict) freeCount += 1;
      }
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        availableStaffCount: freeCount,
      });
    }
    cursor = cursor.add(step, 'minute');
  }

  return { date, tz, totalDuration, closed: false, slots };
}

module.exports = {
  ACTIVE_STATUSES,
  overlaps,
  addMinutes,
  resolveServiceAndExtras,
  isStaffFree,
  assertWithinStoreHours,
  getAvailableSlots,
};
