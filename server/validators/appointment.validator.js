const { body, query } = require('express-validator');

const slotsRules = [
  query('serviceId').isMongoId().withMessage('A valid serviceId is required'),
  query('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be in YYYY-MM-DD format'),
  query('staffId').optional({ values: 'falsy' }).isMongoId().withMessage('staffId must be a valid id'),
];

const createBookingRules = [
  body('serviceId').isMongoId().withMessage('A valid serviceId is required'),
  body('extras').optional().isArray().withMessage('extras must be an array'),
  body('extras.*').isMongoId().withMessage('Each extra must be a valid id'),
  body('scheduledStart').isISO8601().withMessage('scheduledStart must be a valid ISO date/time'),
  body('staffId').optional({ values: 'falsy' }).isMongoId().withMessage('staffId must be a valid id'),
  body('paymentMethod').optional().isIn(['cash', 'gcash']).withMessage('Invalid payment method'),
];

const statusChangeRules = [
  body('status')
    .isIn(['in_service', 'done'])
    .withMessage('status must be in_service or done'),
];

const cancelRules = [
  body('cancelReason').trim().notEmpty().withMessage('A cancellation reason is required'),
];

const rateRules = [
  body('stars').isInt({ min: 1, max: 5 }).withMessage('stars must be an integer 1-5').toInt(),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Comment too long'),
];

module.exports = { slotsRules, createBookingRules, statusChangeRules, cancelRules, rateRules };
