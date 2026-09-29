const User = require("../Models/userAuth");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { verifyAccessToken, isRevoked } = require("../utils/jwt");

const extractToken = (req) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim() || null;
  return null;
};

const protect = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized("You are not logged in");

  const decoded = verifyAccessToken(token);

  const user = await User.findById(decoded.sub).select(
    "+active +passwordChangedAt +tokenVersion",
  );
  if (!user) throw ApiError.unauthorized("The owner of this token no longer exists");
  if (!user.active) throw ApiError.forbidden("This account has been deactivated");
  if (isRevoked(decoded, user)) throw ApiError.unauthorized("Session revoked, please log in again");

  if (env.REQUIRE_EMAIL_VERIFICATION && user.needsEmailVerification()) {
    throw ApiError.forbidden(
      "Confirmez votre adresse email pour acceder a votre compte.",
      "EMAIL_NOT_VERIFIED",
    );
  }

  if (user.hasChangedPasswordAfter(decoded.iat)) {
    throw ApiError.unauthorized("Password recently changed, please log in again");
  }

  req.user = user;
  next();
});

const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select("+active +tokenVersion");
    if (user && user.active && !isRevoked(decoded, user)) req.user = user;
  } catch {
  }

  next();
});

const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized("You are not logged in"));
    if (!roles.includes(req.user.role)) return next(ApiError.forbidden());
    next();
  };

module.exports = { protect, optionalAuth, restrictTo };
