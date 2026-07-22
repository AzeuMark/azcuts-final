const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

// Runs after a set of express-validator chains. If any failed, responds 422
// with the list of field errors; otherwise passes through.
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));
  return next(ApiError.unprocessable('Validation failed', errors));
}

module.exports = validate;
