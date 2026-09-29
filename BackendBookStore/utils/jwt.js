const jwt = require("jsonwebtoken");
const env = require("../config/env");

const ALGORITHM = "HS256";
const ISSUER = "bookstore-api";

const signAccessToken = (user) =>
  jwt.sign(
    { sub: String(user._id), role: user.role, type: "access", ver: user.tokenVersion || 0 },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN, algorithm: ALGORITHM, issuer: ISSUER },
  );

const signRefreshToken = (user) =>
  jwt.sign(
    { sub: String(user._id), type: "refresh", ver: user.tokenVersion || 0 },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN, algorithm: ALGORITHM, issuer: ISSUER },
  );

const verifyTyped = (token, secret, type) => {
  const decoded = jwt.verify(token, secret, { algorithms: [ALGORITHM], issuer: ISSUER });
  if (decoded.type !== type) {
    const error = new Error("Invalid token type");
    error.name = "JsonWebTokenError";
    throw error;
  }
  return decoded;
};

const verifyAccessToken = (token) => verifyTyped(token, env.JWT_SECRET, "access");

const verifyRefreshToken = (token) => verifyTyped(token, env.JWT_REFRESH_SECRET, "refresh");

const isRevoked = (decoded, user) => (decoded.ver || 0) !== (user.tokenVersion || 0);

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  path: "/api/auth",
  maxAge: 30 * 24 * 60 * 60 * 1000,
});

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  isRevoked,
  refreshCookieOptions,
};
