const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

// Verifies the Bearer access token and attaches req.user = { id, role }.
function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(ApiError.unauthorized('Missing access token'));

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return next(ApiError.unauthorized('Invalid or expired access token'));
  }
}

module.exports = auth;
