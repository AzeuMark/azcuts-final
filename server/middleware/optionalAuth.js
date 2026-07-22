const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Attaches req.user if a valid Bearer access token is present, but never
// rejects the request when it is missing/invalid. Used for endpoints that are
// public yet return richer data to authenticated (e.g. admin) callers.
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
  } catch (err) {
    // Ignore invalid/expired tokens for optional auth.
  }
  return next();
}

module.exports = optionalAuth;
