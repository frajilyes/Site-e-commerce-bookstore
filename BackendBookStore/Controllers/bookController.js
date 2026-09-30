const mongoose = require("mongoose");
const Book = require("../Models/book");
const Review = require("../Models/review");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");

const { decorate } = Book;

const FILTERABLE = [
  "category",
  "author",
  "price",
  "rating",
  "badge",
  "featured",
  "language",
  "tags",
  "isActive",
];

const findBookByIdOrSlug = (identifier) =>
  mongoose.isValidObjectId(identifier)
    ? Book.findById(identifier)
    : Book.findOne({ slug: identifier });

const getAllBooks = asyncHandler(async (req, res) => {
  const query = Book.find();

  if (!req.user || req.user.role !== "admin") query.where({ isActive: true });

  const features = new ApiFeatures(query, req.query, { allowedFields: FILTERABLE })
    .filter()
    .search(["title", "author", "category", "tags"])
    .sort("-createdAt")
    .limitFields()
    .paginate()
    .lean();

  const result = await features.execute(Book);
  result.data = result.data.map(decorate);

  sendPaginated(res, result);
});

const getFeaturedBooks = asyncHandler(async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 8, 50);

  const books = await Book.find({ isActive: true, featured: true })
    .sort("-rating -numReviews")
    .limit(limit)
    .lean();

  sendSuccess(res, 200, books.map(decorate), { total: books.length });
});

const getBestSellers = asyncHandler(async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 8, 50);

  const books = await Book.find({ isActive: true })
    .sort("-sold -rating")
    .limit(limit)
    .lean();

  sendSuccess(res, 200, books.map(decorate), { total: books.length });
});

const getCategories = asyncHandler(async (req, res) => {
  const categories = await Book.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
      },
    },
    { $project: { _id: 0, category: "$_id", count: 1, minPrice: 1, maxPrice: 1 } },
    { $sort: { category: 1 } },
  ]);

  sendSuccess(res, 200, categories, { total: categories.length });
});

const getBookById = asyncHandler(async (req, res) => {
  const book = await findBookByIdOrSlug(req.params.id).populate({
    path: "reviews",
    options: { sort: { createdAt: -1 }, limit: 10 },
  });

  if (!book) throw ApiError.notFound("Book not found");
  if (!book.isActive && (!req.user || req.user.role !== "admin")) {
    throw ApiError.notFound("Book not found");
  }

  sendSuccess(res, 200, book);
});

const getRelatedBooks = asyncHandler(async (req, res) => {
  const book = await findBookByIdOrSlug(req.params.id).lean();
  if (!book) throw ApiError.notFound("Book not found");

  const related = await Book.find({
    _id: { $ne: book._id },
    isActive: true,
    $or: [{ category: book.category }, { author: book.author }],
  })
    .sort("-rating")
    .limit(8)
    .lean();

  sendSuccess(res, 200, related.map(decorate), { total: related.length });
});

const createBook = asyncHandler(async (req, res) => {
  const payload = { ...req.body };

  const book = await Book.create(payload);
  sendSuccess(res, 201, book);
});

const updateBook = asyncHandler(async (req, res) => {
  const payload = { ...req.body };
  delete payload.slug;
  delete payload.rating;
  delete payload.numReviews;

  const book = await Book.findByIdAndUpdate(req.params.id, payload, {
    returnDocument: "after",
    runValidators: true,
  });

  if (!book) throw ApiError.notFound("Book not found");
  sendSuccess(res, 200, book);
});

const updateStock = asyncHandler(async (req, res) => {
  const { stock } = req.body;

  const book = await Book.findByIdAndUpdate(
    req.params.id,
    { stock },
    { returnDocument: "after", runValidators: true },
  );

  if (!book) throw ApiError.notFound("Book not found");
  sendSuccess(res, 200, book);
});

const deleteBookById = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) throw ApiError.notFound("Book not found");

  if (req.query.hard === "true") {
    await Promise.all([
      Book.deleteOne({ _id: book._id }),
      Review.deleteMany({ book: book._id }),
    ]);
    return res.status(200).json({ success: true, message: "Book permanently deleted" });
  }

  book.isActive = false;
  await book.save();

  res.status(200).json({ success: true, message: "Book archived" });
});

module.exports = {
  getAllBooks,
  getFeaturedBooks,
  getBestSellers,
  getCategories,
  getBookById,
  getRelatedBooks,
  createBook,
  updateBook,
  updateStock,
  deleteBookById,
};
