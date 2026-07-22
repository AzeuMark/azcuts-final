// Typed error carrying an HTTP status code (and optional field errors).
// Throw these anywhere; the central error handler turns them into JSON.
class ApiError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    if (errors) this.errors = errors;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static badRequest(message = 'Bad request', errors) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
  static unprocessable(message = 'Validation failed', errors) {
    return new ApiError(422, message, errors);
  }
}

module.exports = ApiError;
