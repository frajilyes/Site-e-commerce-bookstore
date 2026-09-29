const env = require("./config/env");
const app = require("./app");
const { connectDB, disconnectDB } = require("./config/db");
const { verifyMailTransport } = require("./utils/mailer");

let server;

const start = async () => {
  await connectDB();

  verifyMailTransport();

  server = app.listen(env.PORT, () => {
    console.log(`[server] ${env.NODE_ENV} API listening on http://localhost:${env.PORT}`);
    console.log(`[server] health check: http://localhost:${env.PORT}/health`);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;
};

const shutdown = async (signal, code = 0) => {
  console.log(`[server] ${signal} received, shutting down gracefully`);

  const forceExit = setTimeout(() => {
    console.error("[server] forced shutdown after 10s");
    process.exit(1);
  }, 10000).unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    clearTimeout(forceExit);
    process.exit(code);
  } catch (error) {
    console.error("[server] error during shutdown", error);
    process.exit(1);
  }
};

process.on("unhandledRejection", (reason) => {
  console.error("[server] unhandled rejection:", reason);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  console.error("[server] uncaught exception:", error);
  shutdown("uncaughtException", 1);
});

["SIGTERM", "SIGINT"].forEach((signal) => {
  process.on(signal, () => shutdown(signal));
});

start().catch((error) => {
  console.error("[server] failed to start:", error.message);
  process.exit(1);
});
