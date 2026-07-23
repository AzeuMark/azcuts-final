const { body } = require('express-validator');

const USERNAME_RE = /^[a-zA-Z0-9._]+$/;

// Reusable username chain: optional flag controls whether it's required.
function usernameRule(optional) {
  const chain = body('username');
  if (optional) chain.optional({ values: 'falsy' });
  return chain
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3–30 characters')
    .matches(USERNAME_RE)
    .withMessage('Username can only contain letters, numbers, dots, and underscores')
    .customSanitizer((v) => String(v).toLowerCase());
}

// --- Admin: create / update users & staff ---
const adminCreateUserRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  usernameRule(false),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'staff', 'admin']).withMessage('Invalid role'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('address').optional({ values: 'falsy' }).trim(),
  body('nickname').optional({ values: 'falsy' }).trim(),
];

const adminUpdateUserRules = [
  body('fullName').optional().trim().notEmpty(),
  usernameRule(true),
  body('email').optional().isEmail().withMessage('A valid email is required'),
  body('password').optional().isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'staff', 'admin']),
  body('status').optional().isIn(['active', 'inactive', 'in_service']),
  body('isApproved').optional().isBoolean().toBoolean(),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('address').optional({ values: 'falsy' }).trim(),
  body('nickname').optional({ values: 'falsy' }).trim(),
];

const discountRules = [
  body('discountPercent')
    .isFloat({ min: 0, max: 100 })
    .withMessage('discountPercent must be between 0 and 100')
    .toFloat(),
];

// --- Self profile ---
const updateProfileRules = [
  body('fullName').optional().trim().notEmpty(),
  usernameRule(true),
  body('email').optional().isEmail().withMessage('A valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('address').optional({ values: 'falsy' }).trim(),
  body('nickname').optional({ values: 'falsy' }).trim(),
  // avatar = an external image URL (file uploads use POST /users/avatar).
  body('avatar')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Avatar must be a valid http(s) URL'),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isString().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

const setThemeRules = [
  body('theme').isIn(['light', 'dark']).withMessage('theme must be "light" or "dark"'),
];

module.exports = {
  adminCreateUserRules,
  adminUpdateUserRules,
  discountRules,
  updateProfileRules,
  changePasswordRules,
  setThemeRules,
};
