const { body, query } = require('express-validator');

// Manual sale recording (S4). Prices are always looked up live — the client
// never sends money, only { kind, refId, qty }.

const recordSaleRules = [
  body('items')
    .isArray({ min: 1, max: 20 })
    .withMessage('items must be an array of 1-20 entries'),
  body('items.*.kind').isIn(['service', 'product']).withMessage('kind must be service or product'),
  body('items.*.refId').isMongoId().withMessage('Invalid item id'),
  body('items.*.qty')
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage('qty must be 1-99')
    .toInt(),
  body('customerId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid customer id'),
  body('appointmentId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid appointment id'),
  body('barberId').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid barber id'),
];

const listSalesRules = [
  query('barber').optional({ values: 'falsy' }).isMongoId().withMessage('Invalid barber id'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100').toInt(),
];

module.exports = {
  recordSaleRules,
  listSalesRules,
};
