const mongoose = require("mongoose");
const env = require("./env");

mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", true);
if (!env.isProduction) mongoose.set("debug", process.env.DB_DEBUG === "true");

let connection = null;

const connectDB = async ({ retries = 5, delayMs = 3000 } = {}) => {
  if (connection) return connection;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      connection = await mongoose.connect(env.DB_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        maxPoolSize: 20,
        minPoolSize: 2,
        autoIndex: !env.isProduction,
      });

      const { host, name } = mongoose.connection;
      console.log(`[db] connected to ${host}/${name}`);
      return connection;
    } catch (error) {
      console.error(
        `[db] connection attempt ${attempt}/${retries} failed: ${error.message}`,
      );
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return connection;
};

mongoose.connection.on("disconnected", () => {
  connection = null;
  console.warn("[db] disconnected");
});

mongoose.connection.on("error", (error) => {
  console.error(`[db] error: ${error.message}`);
});

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    connection = null;
    console.log("[db] connection closed");
  }
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
