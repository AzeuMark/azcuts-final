const Settings = require('../models/Settings');
const ApiError = require('../utils/ApiError');

// Roles permitted to use protected routes / log in, per system mode (2.5).
const ALLOWED_BY_MODE = {
  online: ['user', 'staff', 'admin'],
  maintenance: ['staff', 'admin'],
  offline: ['admin'],
};

function isAllowed(mode, role) {
  const allowed = ALLOWED_BY_MODE[mode] || ALLOWED_BY_MODE.online;
  return allowed.includes(role);
}

function messageFor(mode) {
  return mode === 'offline'
    ? 'AzCuts is currently offline. Please try again later.'
    : 'AzCuts is under maintenance. Please check back soon.';
}

// Gate protected routes by the current system mode. Runs after `auth`
// (so req.user is set); public/unauthenticated requests pass through.
async function systemMode(req, res, next) {
  const settings = await Settings.findById('system').select('systemMode');
  const mode = settings?.systemMode || 'online';
  const role = req.user?.role;

  if (!role || isAllowed(mode, role)) return next();
  return next(new ApiError(503, messageFor(mode)));
}

module.exports = systemMode;
module.exports.isAllowed = isAllowed;
module.exports.messageFor = messageFor;
module.exports.ALLOWED_BY_MODE = ALLOWED_BY_MODE;
