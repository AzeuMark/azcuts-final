// Socket.io event names + room helpers (shared contract, SERVER_PLAN 7).
const EVENTS = {
  APPOINTMENT_NEW: 'appointment:new',
  APPOINTMENT_UPDATED: 'appointment:updated',
  APPOINTMENT_ASSIGNED: 'appointment:assigned',
  DASHBOARD_REFRESH: 'dashboard:refresh',
  RATING_ADDED: 'rating:added',
};

const ROOMS = {
  STAFF: 'staff',
  ADMIN: 'admin',
  user: (id) => `user:${id}`,
};

module.exports = { EVENTS, ROOMS };
