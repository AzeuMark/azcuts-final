const { body, query } = require('express-validator');

// Stock moves only through PATCH /inventory/update (S3) so every change has a
// ledger entry. `stockQuantity` is never writable via the product endpoints.

const updateStockRules = [
  body('productId').notEmpty().withMessage('productId is required').bail().isMongoId().withMessage('Invalid product id'),
  body('change')
    .notEmpty()
    .withMessage('change is required')
    .bail()
    .isInt()
    .withMessage('change must be an integer')
    .toInt()
    .custom((v) => v !== 0)
    .withMessage('change cannot be 0'),
  body('type')
    .notEmpty()
    .withMessage('type is required')
    .bail()
    .isIn(['stock_in', 'sale', 'usage', 'adjustment'])
    .withMessage('type must be stock_in, sale, usage or adjustment'),
  body('reason').optional().trim(),
];

const levelsRules = [
  query('lowOnly').optional().isBoolean().withMessage('lowOnly must be boolean').toBoolean(),
];

const movementsRules = [
  query('productId').optional().isMongoId().withMessage('Invalid product id'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100').toInt(),
];

module.exports = {
  updateStockRules,
  levelsRules,
  movementsRules,
};
