const Wishlist = require("../Models/wishList");
const Book = require("../Models/book");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");

const MAX_WISHLIST = 200;

const POPULATE_BOOKS = {
  path: "books",
  select: "title author image price oldPrice rating slug category badge stock",
  match: { isActive: true },
};

const getMyWishlist = asyncHandler(async (req, res) => {
  const found = await Wishlist.findOne({ user: req.user._id }).populate(POPULATE_BOOKS);
  sendSuccess(res, 200, found || new Wishlist({ user: req.user._id, books: [] }));
});

const addBook = asyncHandler(async (req, res) => {
  const bookId = req.body.bookId || req.params.bookId;

  const book = await Book.findOne({ _id: bookId, isActive: true }).select("_id");
  if (!book) throw ApiError.notFound("Book not found");

  const full = await Wishlist.exists({
    user: req.user._id,
    books: { $ne: book._id },
    [`books.${MAX_WISHLIST - 1}`]: { $exists: true },
  });
  if (full) throw ApiError.badRequest(`A wishlist holds at most ${MAX_WISHLIST} books`);

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $addToSet: { books: book._id } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  ).populate(POPULATE_BOOKS);

  sendSuccess(res, 200, wishlist);
});

const removeBook = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { books: req.params.bookId } },
    { returnDocument: "after" },
  ).populate(POPULATE_BOOKS);

  if (!wishlist) throw ApiError.notFound("Wishlist not found");
  sendSuccess(res, 200, wishlist);
});

const clearWishlist = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findOneAndUpdate(
    { user: req.user._id },
    { books: [] },
    { returnDocument: "after", upsert: true },
  );

  sendSuccess(res, 200, wishlist);
});

const getAllWishLists = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(
    Wishlist.find().populate("user", "fullName email"),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(Wishlist));
});

const getWishListById = asyncHandler(async (req, res) => {
  const wishlist = await Wishlist.findById(req.params.id)
    .populate("user", "fullName email")
    .populate(POPULATE_BOOKS);

  if (!wishlist) throw ApiError.notFound("Wishlist not found");
  sendSuccess(res, 200, wishlist);
});

module.exports = {
  getMyWishlist,
  addBook,
  removeBook,
  clearWishlist,
  getAllWishLists,
  getWishListById,
};
