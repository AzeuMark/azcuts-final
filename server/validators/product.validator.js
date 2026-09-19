const { body } = require('express-validator');

// Product fields may arrive as multipart/form-data (strings) when an image is
// attached, so numeric/boolean fields are coerced — same pattern as services.
// NOTE (S2): `stockQuantity` is deliberately NOT writable here. Stock moves
// only through PATCH /inventory/update (S3) so every change has a ledger
// entry; create/update manage catalog fields (name/price/threshold/etc.).

const createProductRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Price must be a number >= 0')
    .toFloat(),
  body('description').optional().trim(),
  body('lowStockThreshold')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Low-stock threshold must be an integer >= 0')
    .toInt(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
  // `image` as text = an external URL (a file upload arrives via multer, not here).
  body('image')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Image must be a valid http(s) URL'),
];

const updateProductRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a number >= 0').toFloat(),
  body('description').optional().trim(),
  body('lowStockThreshold').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('image')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Image must be a valid http(s) URL'),
];

module.exports = {
  createProductRules,
  updateProductRules,
};
