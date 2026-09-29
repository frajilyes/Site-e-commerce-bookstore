const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const env = require("../config/env");
const { normalizeEmail } = require("../utils/email");

const base = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: () => env.isTest,
  message: {
    success: false,
    status: "fail",
    message: "Too many requests, please try again later",
  },
};

const apiLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

const authLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}:${normalizeEmail(req.body && req.body.email)}`,
  message: {
    success: false,
    status: "fail",
    message: "Too many authentication attempts, please try again later",
  },
});

const authIpLimiter = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_IP_RATE_LIMIT_MAX,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
  message: {
    success: false,
    status: "fail",
    message: "Too many authentication attempts, please try again later",
  },
});

const writeLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 60,
});

module.exports = {
  apiLimiter,
  authLimiter: [authIpLimiter, authLimiter],
  authIpLimiter,
  writeLimiter,
};
