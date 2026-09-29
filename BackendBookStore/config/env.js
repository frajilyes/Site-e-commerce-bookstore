const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const NODE_ENV = process.env.NODE_ENV || "development";

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback) => {
  if (value === undefined || value === "") return fallback;
  return !["0", "false", "no", "off"].includes(String(value).toLowerCase());
};

const toList = (value, fallback) =>
  (value || fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const trimSlash = (value) => value.replace(/\/+$/, "");

const env = {
  NODE_ENV,
  isProduction: NODE_ENV === "production",
  isTest: NODE_ENV === "test",
  PORT: toInt(process.env.PORT, 5000),

  DB_URI: process.env.DB_URI || "mongodb://127.0.0.1:27017/librarybooks",

  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "1d",
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  COOKIE_SECRET: process.env.COOKIE_SECRET || process.env.JWT_SECRET,

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",

  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: toInt(process.env.SMTP_PORT, 587),
  SMTP_SECURE: toBool(process.env.SMTP_SECURE, toInt(process.env.SMTP_PORT, 587) === 465),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASS: process.env.SMTP_PASS || "",
  MAIL_FROM: process.env.MAIL_FROM || "BookStore <no-reply@bookstore.local>",

  REQUIRE_EMAIL_VERIFICATION: toBool(process.env.REQUIRE_EMAIL_VERIFICATION, true),
  EMAIL_CODE_TTL_MIN: toInt(process.env.EMAIL_CODE_TTL_MIN, 15),
  EMAIL_CODE_RESEND_COOLDOWN_S: toInt(process.env.EMAIL_CODE_RESEND_COOLDOWN_S, 60),
  EMAIL_CODE_MAX_ATTEMPTS: toInt(process.env.EMAIL_CODE_MAX_ATTEMPTS, 5),
  PASSWORD_RESET_TTL_MIN: toInt(process.env.PASSWORD_RESET_TTL_MIN, 15),

  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
  CORS_ORIGINS: toList(
    process.env.CORS_ORIGINS,
    "http://localhost:3000,http://localhost:5000,http://localhost:5173",
  ).map(trimSlash),

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  CURRENCY: (process.env.CURRENCY || "usd").toLowerCase(),

  TAX_RATE: Number.parseFloat(process.env.TAX_RATE || "0"),
  SHIPPING_FLAT_RATE: Number.parseFloat(process.env.SHIPPING_FLAT_RATE || "4.99"),
  FREE_SHIPPING_THRESHOLD: Number.parseFloat(
    process.env.FREE_SHIPPING_THRESHOLD || "50",
  ),

  RATE_LIMIT_WINDOW_MS: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  RATE_LIMIT_MAX: toInt(process.env.RATE_LIMIT_MAX, 300),
  AUTH_RATE_LIMIT_MAX: toInt(process.env.AUTH_RATE_LIMIT_MAX, 20),
  AUTH_IP_RATE_LIMIT_MAX: toInt(process.env.AUTH_IP_RATE_LIMIT_MAX, 100),
  MAX_PENDING_ORDERS: toInt(process.env.MAX_PENDING_ORDERS, 5),

  MAX_UPLOAD_SIZE: toInt(process.env.MAX_UPLOAD_SIZE, 5 * 1024 * 1024),
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",

  DEFAULT_PAGE_SIZE: toInt(process.env.DEFAULT_PAGE_SIZE, 12),
  MAX_PAGE_SIZE: toInt(process.env.MAX_PAGE_SIZE, 100),
};

const missing = ["DB_URI", "JWT_SECRET"].filter((key) => !env[key]);

if (missing.length) {
  console.error(
    `[config] Missing required environment variable(s): ${missing.join(", ")}. See .env.example.`,
  );
  process.exit(1);
}

if (env.isProduction) {
  const secrets = {
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    COOKIE_SECRET: process.env.COOKIE_SECRET,
  };
  const problems = Object.entries(secrets)
    .filter(([, value]) => !value || value.length < 32)
    .map(([key]) => `${key} must be set and at least 32 characters`);

  if (new Set(Object.values(secrets)).size !== Object.keys(secrets).length) {
    problems.push("JWT_SECRET, JWT_REFRESH_SECRET and COOKIE_SECRET must all differ");
  }
  if (env.CORS_ORIGINS.some((origin) => /localhost|127\.0\.0\.1/.test(origin))) {
    problems.push("CORS_ORIGINS must not list localhost origins");
  }
  if (!env.CLIENT_URL.startsWith("https://")) {
    problems.push("CLIENT_URL must be an https:// URL");
  }

  if (problems.length) {
    problems.forEach((problem) => console.error(`[config] ${problem} in production.`));
    process.exit(1);
  }
}

env.stripeEnabled = Boolean(
  env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.includes("xxx"),
);

env.mailEnabled =
  Boolean(env.SMTP_HOST && !env.SMTP_HOST.includes("xxx")) && !env.isTest;

env.googleAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.includes("xxx"),
);

module.exports = env;
