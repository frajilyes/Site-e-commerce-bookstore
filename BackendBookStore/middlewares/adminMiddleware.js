const ApiError = require("../utils/ApiError");
const { protect, restrictTo } = require("./auth");

const ADMIN_ROLE = "admin";

const hasAdminRole = (user) => Boolean(user) && user.role === ADMIN_ROLE;

const isAdmin = restrictTo(ADMIN_ROLE);

const adminOnly = [protect, isAdmin];

const ownsOrAdmin = (ownerId, user) => {
  if (!user) return false;
  if (hasAdminRole(user)) return true;

  const owner = ownerId && ownerId._id ? ownerId._id : ownerId;
  return Boolean(owner) && String(owner) === String(user._id);
};

const assertOwnerOrAdmin = (ownerId, user, message) => {
  if (!user) throw ApiError.unauthorized("You are not logged in");
  if (!ownsOrAdmin(ownerId, user)) throw ApiError.forbidden(message);
};

const assertNotSelf = (targetId, user, message) => {
  if (String(targetId) === String(user._id)) throw ApiError.badRequest(message);
};

module.exports = {
  ADMIN_ROLE,
  hasAdminRole,
  isAdmin,
  adminOnly,
  ownsOrAdmin,
  assertOwnerOrAdmin,
  assertNotSelf,
};
