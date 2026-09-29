class ApiError extends Error {
  constructor(statusCode, message, details = undefined, code = undefined) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith("4") ? "fail" : "error";
    this.isOperational = true;
    if (details) this.details = details;
    if (code) this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", details, code) {
    return new ApiError(400, message, details, code);
  }

  static unauthorized(message = "Authentication required") {
    return new ApiError(401, message);
  }

  static forbidden(message = "You do not have permission to perform this action", code) {
    return new ApiError(403, message, undefined, code);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Resource already exists") {
    return new ApiError(409, message);
  }

  static unprocessable(message = "Unprocessable entity", details) {
    return new ApiError(422, message, details);
  }
}

module.exports = ApiError;
