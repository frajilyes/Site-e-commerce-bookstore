const { connectDB, disconnectDB } = require("../config/db");

const Book = require("../Models/book");
const User = require("../Models/userAuth");
const Cart = require("../Models/cart");
const Order = require("../Models/order");
const Review = require("../Models/review");
const Wishlist = require("../Models/wishList");
const Payement = require("../Models/payement");
const WebHook = require("../Models/webHook");

const dedupe = async (Model, field) => {
  const orphans = await Model.deleteMany({ [field]: { $in: [null, undefined] } });

  const groups = await Model.aggregate([
    { $sort: { updatedAt: -1, _id: -1 } },
    { $group: { _id: `$${field}`, ids: { $push: "$_id" }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);

  const stale = groups.flatMap((group) => group.ids.slice(1));
  if (stale.length) await Model.deleteMany({ _id: { $in: stale } });

  const removed = orphans.deletedCount + stale.length;
  if (removed) {
    console.log(`[migrate] ${Model.modelName}: removed ${removed} legacy document(s)`);
  }
};

const backfillBooks = async () => {
  const result = await Book.updateMany(
    { $or: [{ isActive: { $exists: false } }, { stock: { $exists: false } }] },
    { $set: { isActive: true } },
  );

  await Book.updateMany({ stock: { $exists: false } }, { $set: { stock: 0 } });
  await Book.updateMany({ sold: { $exists: false } }, { $set: { sold: 0 } });
  await Book.updateMany({ numReviews: { $exists: false } }, { $set: { numReviews: 0 } });
  await Book.updateMany({ badge: null }, { $set: { badge: "" } });

  if (result.modifiedCount) {
    console.log(`[migrate] Book: backfilled ${result.modifiedCount} document(s)`);
  }

  const legacy = await Book.find({ slug: { $in: [null, undefined] } });
  for (const book of legacy) {
    book.slug = undefined;
    await book.save();
  }
  if (legacy.length) console.log(`[migrate] Book: generated ${legacy.length} slug(s)`);
};

const backfillEmailVerification = async () => {
  const result = await User.updateMany(
    { emailVerified: { $exists: false } },
    { $set: { emailVerified: true, emailVerifiedAt: new Date() } },
  );

  if (result.modifiedCount) {
    console.log(
      `[migrate] User: ${result.modifiedCount} compte(s) anterieur(s) marque(s) comme confirme(s)`,
    );
  }

  const stale = await User.updateMany(
    { "emailVerification.expiresAt": { $lt: new Date() } },
    { $unset: { emailVerification: "" } },
  );

  if (stale.modifiedCount) {
    console.log(`[migrate] User: ${stale.modifiedCount} code(s) expire(s) purge(s)`);
  }
};

const backfillOrders = async () => {
  const legacy = await Order.collection
    .find({ orderNumber: { $in: [null, undefined] } })
    .project({ _id: 1 })
    .toArray();

  if (!legacy.length) return;

  await Order.collection.bulkWrite(
    legacy.map((doc) => ({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: {
            orderNumber: `BK-${doc._id.toString().slice(-8).toUpperCase()}`,
          },
        },
      },
    })),
  );

  console.log(`[migrate] Order: numbered ${legacy.length} legacy order(s)`);
};

const dropStaleIndexes = async (Model) => {
  let existing;
  try {
    existing = await Model.collection.indexes();
  } catch {
    return;
  }

  const declared = new Set(
    Model.schema.indexes().map(([spec]) => Object.keys(spec).join("_")),
  );

  for (const index of existing) {
    if (index.name === "_id_") continue;

    const stillDeclared =
      declared.has(Object.keys(index.key).join("_")) ||
      Object.keys(Model.schema.paths).some(
        (path) => index.name === `${path}_1` && Model.schema.path(path)?.options?.index,
      ) ||
      Object.keys(Model.schema.paths).some(
        (path) => index.name === `${path}_1` && Model.schema.path(path)?.options?.unique,
      );

    if (!stillDeclared && !Model.schema.path(index.name.replace(/_-?1$/, ""))) {
      await Model.collection.dropIndex(index.name);
      console.log(`[migrate] ${Model.modelName}: dropped stale index ${index.name}`);
    }
  }
};

const run = async () => {
  await connectDB();

  await dedupe(Cart, "user");
  await dedupe(Wishlist, "user");
  await backfillBooks();
  await backfillOrders();
  await backfillEmailVerification();

  const models = [Book, User, Cart, Order, Review, Wishlist, Payement, WebHook];

  for (const Model of models) await dropStaleIndexes(Model);
  for (const Model of models) {
    await Model.syncIndexes();
    console.log(`[migrate] ${Model.modelName}: indexes synchronised`);
  }

  await disconnectDB();
  console.log("[migrate] done");
  process.exit(0);
};

if (require.main === module) {
  run().catch((error) => {
    console.error("[migrate] failed:", error.message);
    process.exit(1);
  });
}

module.exports = {
  dedupe,
  backfillBooks,
  backfillOrders,
  backfillEmailVerification,
  dropStaleIndexes,
};
