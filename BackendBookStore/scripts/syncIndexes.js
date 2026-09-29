const { connectDB, disconnectDB } = require("../config/db");

const MODELS = [
  require("../Models/book"),
  require("../Models/userAuth"),
  require("../Models/cart"),
  require("../Models/order"),
  require("../Models/review"),
  require("../Models/wishList"),
  require("../Models/payement"),
  require("../Models/webHook"),
];

const run = async () => {
  await connectDB();

  for (const Model of MODELS) {
    await Model.syncIndexes();
    console.log(`[indexes] ${Model.modelName} synchronised`);
  }

  await disconnectDB();
  process.exit(0);
};

run().catch((error) => {
  console.error("[indexes] failed:", error.message);
  process.exit(1);
});
