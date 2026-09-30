const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const env = require("./config/env");
const sanitize = require("./middlewares/sanitize");
const { apiLimiter } = require("./middlewares/rateLimiter");
const { notFound, errorHandler } = require("./middlewares/error");
const ApiError = require("./utils/ApiError");
const { handleStripeWebhook } = require("./Controllers/webHookController");

const userRouter = require("./Routers/routeAuth");
const bookRouter = require("./Routers/bookRouter");
const reviewRouter = require("./Routers/reviewRouter");
const orderRouter = require("./Routers/orderRouter");
const cartRouter = require("./Routers/cartRouter");
const wishListRouter = require("./Routers/wishListRouter");
const payementRouter = require("./Routers/payementRouter");
const webHookRouter = require("./Routers/webHookRouter");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.set("etag", "strong");
app.set("query parser", "extended");


app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    strictTransportSecurity: env.isProduction
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,
    referrerPolicy: { policy: "no-referrer" },
  }),
);

app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  next();
});

app.use(
  cors({
    origin(origin, callback) {
      const normalized = origin && origin.replace(/\/+$/, "");
      if (!origin || env.CORS_ORIGINS.includes(normalized)) return callback(null, true);
      callback(ApiError.forbidden(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposedHeaders: ["RateLimit", "RateLimit-Policy"],
    maxAge: 86400,
  }),
);


app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json", limit: "1mb" }),
  handleStripeWebhook,
);


app.use(express.json({ limit: "100kb", strict: true }));
app.use(express.urlencoded({ extended: true, limit: "100kb", parameterLimit: 100 }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(sanitize);


app.use(compression({ threshold: 1024 }));

if (!env.isTest) {
  app.use(morgan(env.isProduction ? "combined" : "dev"));
}

const STATES = ["disconnected", "connected", "connecting", "disconnecting"];

app.get("/health", (req, res) => {
  const dbState = STATES[mongoose.connection.readyState] || "unknown";
  res.status(dbState === "connected" ? 200 : 503).json({
    success: dbState === "connected",
    status: dbState === "connected" ? "ok" : "degraded",
    database: dbState,
    ...(env.isProduction
      ? {}
      : { uptime: Math.round(process.uptime()), environment: env.NODE_ENV }),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    name: "BookStore API",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      books: "/api/books",
      reviews: "/api/reviews",
      carts: "/api/carts",
      wishlists: "/api/wishlists",
      orders: "/api/orders",
      payments: "/api/payments",
      webhooks: "/api/webhook",
      health: "/health",
    },
  });
});


app.use("/api", apiLimiter);

app.use("/api/auth", userRouter);
app.use("/api/books", bookRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/carts", cartRouter);
app.use("/api/wishlists", wishListRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payments", payementRouter);
app.use("/api/webhook", webHookRouter);


app.use(notFound);
app.use(errorHandler);

module.exports = app;
