const { body } = require('express-validator');

// Fields may arrive as multipart/form-data (strings) when an image is attached,
// so numeric/boolean fields are coerced with toFloat/toInt/toBoolean.

const createServiceRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Price must be a number >= 0')
    .toFloat(),
  body('category')
    .optional()
    .isIn(['haircut', 'salon'])
    .withMessage('Category must be haircut or salon'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be an integer >= 0')
    .toInt(),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean').toBoolean(),
  // `image` as text = an external URL (a file upload arrives via multer, not here).
  body('image')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Image must be a valid http(s) URL'),
];

const updateServiceRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a number >= 0').toFloat(),
  body('category').optional().isIn(['haircut', 'salon']),
  body('durationMinutes').optional().isInt({ min: 0 }).toInt(),
  body('description').optional().trim(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('image')
    .optional({ values: 'falsy' })
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Image must be a valid http(s) URL'),
];

const createExtraRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .bail()
    .isFloat({ min: 0 })
    .withMessage('Price must be a number >= 0')
    .toFloat(),
  body('durationMinutes').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

const updateExtraRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('price').optional().isFloat({ min: 0 }).toFloat(),
  body('durationMinutes').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
];

module.exports = {
  createServiceRules,
  updateServiceRules,
  createExtraRules,
  updateExtraRules,
};
