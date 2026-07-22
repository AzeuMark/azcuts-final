const { body } = require('express-validator');

// Usernames: 3–30 chars, lowercase letters/numbers/dot/underscore. Sanitized to
// lowercase so they match the schema's lowercased storage.
const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

// Email is validated + lowercased at the schema level (lowercase: true), so we
// deliberately avoid normalizeEmail() here to prevent surprising rewrites
// (e.g. gmail dot-stripping) that could desync login vs. register.
const registerRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(USERNAME_RE)
    .withMessage('Username can only contain letters, numbers, dots, and underscores')
    .customSanitizer((v) => String(v).toLowerCase()),
  body('email').isEmail().withMessage('A valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

// Login accepts a username OR an email (via `identifier`, with `email`/`username`
// as fallbacks for older callers).
const loginRules = [
  body('identifier').optional({ values: 'falsy' }).trim(),
  body('email').optional({ values: 'falsy' }).trim(),
  body('username').optional({ values: 'falsy' }).trim(),
  body().custom((_value, { req }) => {
    if (!(req.body.identifier || req.body.email || req.body.username)) {
      throw new Error('Username or email is required');
    }
    return true;
  }),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules, USERNAME_RE };
