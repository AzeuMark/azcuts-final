const { body } = require('express-validator');

// --- Admin: create / update users & staff ---
const adminCreateUserRules = [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().withMessage('A valid email is required'),
  body('password').isString().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').optional().isIn(['user', 'staff', 'admin']).withMessage('Invalid role'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('address').optional({ values: 'falsy' }).trim(),
  body('nickname').optional({ values: 'falsy' }).trim(),
];

const adminUpdateUserRules = [
  body('fullName').optional().trim().notEmpty(),
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
  body('email').optional().isEmail().withMessage('A valid email is required'),
  body('phone').optional({ values: 'falsy' }).trim(),
  body('address').optional({ values: 'falsy' }).trim(),
  body('nickname').optional({ values: 'falsy' }).trim(),
];

const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isString().isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

module.exports = {
  adminCreateUserRules,
  adminUpdateUserRules,
  discountRules,
  updateProfileRules,
  changePasswordRules,
};
