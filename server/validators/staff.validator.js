const { body } = require('express-validator');

const rejectRules = [
  // Rejecting without a reason is not allowed — the admin sees it when
  // re-assigning, so it must say something useful.
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('A rejection reason is required')
    .isLength({ min: 3, max: 300 })
    .withMessage('Reason must be 3–300 characters'),
];

const shiftRules = [
  body('status')
    .isIn(['active', 'inactive'])
    .withMessage('Shift status must be active or inactive'),
];

module.exports = { rejectRules, shiftRules };
