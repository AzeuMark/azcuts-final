const logger = require('../utils/logger');

// Central error handler. Must be mounted LAST (after routes).
// Produces a consistent shape: { success: false, message, errors? }.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || undefined;

  // Mongoose: duplicate key (e.g. email already exists)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {}).join(', ');
    message = field ? `Duplicate value for: ${field}` : 'Duplicate key';
  }

  // Mongoose: schema validation
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose: bad ObjectId etc.
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }

  // Multer: upload errors (e.g. file too large, unexpected field)
  if (err.name === 'MulterError') {
    statusCode = 400;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File too large (max 5MB)'
        : `Upload error: ${err.message}`;
  }

  if (statusCode >= 500) logger.error(err.stack || err.message);

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
}

module.exports = errorHandler;
