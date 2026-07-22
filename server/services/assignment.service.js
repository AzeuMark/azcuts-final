const User = require('../models/User');
const Appointment = require('../models/Appointment');
const scheduling = require('./scheduling.service');

// A staff member's "load" = number of appointments still on their plate
// (status pending or in_service), per the locked definition.
async function staffLoad(staffId) {
  return Appointment.countDocuments({
    assignedStaff: staffId,
    status: { $in: ['pending', 'in_service'] },
  });
}

/**
 * Least-loaded auto-assign (SERVER_PLAN 2.3).
 * Returns the best staff doc for [start, end), or null if none are eligible.
 *  1. Candidate = on-shift staff (active|in_service, i.e. not off-shift) who are
 *     FREE for the slot (overlap test), excluding any explicitly excluded ids.
 *  2. Pick the minimum load; break ties by fewest ratings, then earliest joiner
 *     (deterministic).
 */
async function pickLeastLoadedStaff({ start, end, excludeStaffIds = [] }) {
  const staff = await User.find({
    role: 'staff',
    status: { $in: ['active', 'in_service'] },
    _id: { $nin: excludeStaffIds },
  });
  if (!staff.length) return null;

  const freeFlags = await Promise.all(
    staff.map((s) => scheduling.isStaffFree(s._id, start, end))
  );
  const free = staff.filter((_, i) => freeFlags[i]);
  if (!free.length) return null;

  const loads = await Promise.all(free.map((s) => staffLoad(s._id)));
  const ranked = free
    .map((s, i) => ({ staff: s, load: loads[i] }))
    .sort((a, b) => {
      if (a.load !== b.load) return a.load - b.load;
      if ((a.staff.ratingCount || 0) !== (b.staff.ratingCount || 0)) {
        return (a.staff.ratingCount || 0) - (b.staff.ratingCount || 0);
      }
      return new Date(a.staff.createdAt) - new Date(b.staff.createdAt);
    });

  return ranked[0].staff;
}

module.exports = { staffLoad, pickLeastLoadedStaff };
