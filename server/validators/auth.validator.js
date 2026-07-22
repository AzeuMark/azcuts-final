const { body } = require('express-validator');

// Email is validated + lowercased at the schema level (lowercase: true), so we
// deliberately avoid normalizeEmail() here to prevent surprising rewrites
// (e.g. gmail dot-stripping) that could desync login vs. register.
const registerRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
];

const loginRules = [
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

module.exports = { registerRules, loginRules };
