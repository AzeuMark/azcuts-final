const { body } = require('express-validator');

const rejectRules = [
  body('reason').optional().trim().isLength({ max: 300 }).withMessage('Reason too long'),
];

const shiftRules = [
  body('status')
    .isIn(['active', 'inactive'])
    .withMessage('Shift status must be active or inactive'),
];

module.exports = { rejectRules, shiftRules };
