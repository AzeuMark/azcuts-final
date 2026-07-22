const { body } = require('express-validator');

const updateSettingsRules = [
  body('systemMode').optional().isIn(['online', 'maintenance', 'offline']).withMessage('Invalid system mode'),
  body('timezone').optional().isString().trim().notEmpty(),
  body('region').optional().isString().trim(),
  body('country').optional().isString().trim(),
  body('currency').optional().isString().trim(),
  body('taxRate').optional().isFloat({ min: 0, max: 1 }).withMessage('taxRate must be a fraction between 0 and 1').toFloat(),
  body('slotStepMinutes').optional().isInt({ min: 5, max: 240 }).withMessage('slotStepMinutes must be 5-240').toInt(),
  body('storeHours').optional().isObject().withMessage('storeHours must be an object'),
  body('shopInfo').optional().isObject().withMessage('shopInfo must be an object'),
];

const addNicknameRules = [
  body('value').trim().notEmpty().withMessage('Nickname value is required'),
];

const updateNicknameRules = [
  body('value').trim().notEmpty().withMessage('Existing nickname value is required'),
  body('newValue').trim().notEmpty().withMessage('New nickname value is required'),
];

const removeNicknameRules = [
  body('value').trim().notEmpty().withMessage('Nickname value is required'),
];

module.exports = {
  updateSettingsRules,
  addNicknameRules,
  updateNicknameRules,
  removeNicknameRules,
};
