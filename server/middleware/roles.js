const ApiError = require('../utils/ApiError');

// Authorization guard. Usage: requireRole('admin') or requireRole('staff','admin').
// Must run after the `auth` middleware (which sets req.user).
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Insufficient permissions'));
    }
    return next();
  };
}

module.exports = requireRole;
