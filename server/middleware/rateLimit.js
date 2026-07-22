const rateLimit = require('express-rate-limit');
const env = require('../config/env');

// Strict limiter for auth endpoints (brute-force / credential-stuffing defense).
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isProd ? 30 : 200, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a little while.' },
});

// Lenient global limiter for the rest of the API.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: env.isProd ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
