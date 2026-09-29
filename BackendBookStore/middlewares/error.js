const ApiError = require("../utils/ApiError");
const env = require("../config/env");
const stripeError = require("../utils/stripeError");

const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

const normalize = (err) => {
  if (err instanceof ApiError) return err;

  if (stripeError.isStripeError(err)) return stripeError.toApiError(err);

  if (err.name === "CastError") {
    return ApiError.badRequest(`Invalid ${err.path}`);
  }

  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return ApiError.unprocessable("Validation failed", details);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return ApiError.conflict(`${field} already exists`);
  }

  if (err.name === "JsonWebTokenError") {
    return ApiError.unauthorized("Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    return ApiError.unauthorized("Token expired, please log in again");
  }

  if (err.type === "entity.parse.failed") {
    return ApiError.badRequest("Malformed JSON body");
  }

  if (err.type === "entity.too.large") {
    return new ApiError(413, "Payload too large");
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return new ApiError(413, "File too large");
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return ApiError.badRequest(`Unexpected file field: ${err.field}`);
  }

  const statusCode = [err.statusCode, err.status].find(Number.isInteger) || 500;

  if (statusCode >= 500 && env.isProduction) {
    return new ApiError(500, "Internal server error");
  }

  return new ApiError(statusCode, err.message || "Internal server error");
};

// eslint-disable-next-line no-unused-vars -- Express identifies handlers by arity
const errorHandler = (err, req, res, next) => {
  const error = normalize(err);

  if (error.statusCode >= 500) {
    const where = `[error] ${req.method} ${req.originalUrl}`;
    if (error.isOperational && err.isOperational) {
      console.error(`${where} -> ${error.statusCode} ${error.message}`);
    } else {
      console.error(where, err);
    }
  }

  res.status(error.statusCode).json({
    success: false,
    status: error.status,
    message: error.message,
    ...(error.code ? { code: error.code } : {}),
    ...(error.details ? { errors: error.details } : {}),
    ...(env.isProduction || env.isTest ? {} : { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
