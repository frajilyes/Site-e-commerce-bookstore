const Book = require("../Models/book");
const ApiError = require("../utils/ApiError");

const reserveStock = async (items) => {
  const taken = [];

  try {
    for (const item of items) {
      const result = await Book.updateOne(
        { _id: item.book, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity, sold: item.quantity } },
      );

      if (result.modifiedCount !== 1) {
        throw ApiError.conflict(
          `${item.title || "A book in your cart"} is out of stock`,
        );
      }

      taken.push(item);
    }
  } catch (error) {
    await releaseStock(taken);
    throw error;
  }

  return taken;
};

const releaseStock = async (items) => {
  if (!items.length) return;

  await Book.bulkWrite(
    items.map((item) => ({
      updateOne: {
        filter: { _id: item.book },
        update: { $inc: { stock: item.quantity, sold: -item.quantity } },
      },
    })),
    { ordered: false },
  );
};

module.exports = { reserveStock, releaseStock };
