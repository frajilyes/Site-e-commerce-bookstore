const mongoose = require("mongoose");
const env = require("../config/env");
const { connectDB, disconnectDB } = require("../config/db");

const Book = require("../Models/book");
const User = require("../Models/userAuth");
const Cart = require("../Models/cart");
const Order = require("../Models/order");
const Review = require("../Models/review");
const Wishlist = require("../Models/wishList");
const Payement = require("../Models/payement");
const WebHook = require("../Models/webHook");

const books = require("./books");
const {
  dedupe,
  backfillBooks,
  backfillOrders,
  dropStaleIndexes,
} = require("../scripts/migrate");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@bookstore.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin12345";

const importData = async () => {
  await dedupe(Cart, "user");
  await dedupe(Wishlist, "user");
  await backfillBooks();
  await backfillOrders();
  for (const Model of [Book, User, Cart, Order, Review, Wishlist, Payement, WebHook]) {
    await dropStaleIndexes(Model);
  }

  await Promise.all([
    Book.syncIndexes(),
    User.syncIndexes(),
    Order.syncIndexes(),
    Review.syncIndexes(),
    Cart.syncIndexes(),
    Wishlist.syncIndexes(),
    Payement.syncIndexes(),
    WebHook.syncIndexes(),
  ]);
  console.log("[seed] indexes synchronised");

  await Book.deleteMany();
  const created = await Book.create(books);
  console.log(`[seed] inserted ${created.length} books`);

  const admin = await User.findOne({ email: ADMIN_EMAIL });
  if (admin) {
    console.log(`[seed] admin already exists: ${ADMIN_EMAIL}`);
  } else {
    await User.create({
      fullName: "Store Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
    console.log(`[seed] admin created: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  }

};

const destroyData = async () => {
  await Promise.all([
    Book.deleteMany(),
    User.deleteMany(),
    Cart.deleteMany(),
    Order.deleteMany(),
    Review.deleteMany(),
    Wishlist.deleteMany(),
    Payement.deleteMany(),
    WebHook.deleteMany(),
  ]);
  console.log("[seed] all collections cleared");
};

const run = async () => {
  await connectDB();

  const destroy = process.argv.includes("--destroy") || process.argv.includes("-d");
  if (destroy) {
    await destroyData();
  } else {
    await importData();
  }

  await disconnectDB();
  console.log(`[seed] done (${env.DB_URI.split("/").pop()})`);
  process.exit(0);
};

run().catch(async (error) => {
  console.error("[seed] failed:", error.message);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
