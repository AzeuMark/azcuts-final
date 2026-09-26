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
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
  query('search').optional({ values: 'falsy' }).trim(),
  query('sort')
    .optional({ values: 'falsy' })
    .isIn(['newest', 'oldest', 'total_desc', 'total_asc'])
    .withMessage('Invalid sort'),
  query('range')
    .optional({ values: 'falsy' })
    .isIn(['all', 'daily', 'weekly', 'monthly', 'yearly'])
    .withMessage('Invalid range'),
  query('type')
    .optional({ values: 'falsy' })
    .isIn(['all', 'booking', 'counter'])
    .withMessage('Invalid type'),
];

module.exports = {
  recordSaleRules,
  listSalesRules,
};
