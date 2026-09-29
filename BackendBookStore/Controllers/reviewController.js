const Review = require("../Models/review");
const Book = require("../Models/book");
const Order = require("../Models/order");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");
const { assertOwnerOrAdmin } = require("../middlewares/adminMiddleware");

const getReviews = asyncHandler(async (req, res) => {
  const filter = req.params.bookId ? { book: req.params.bookId } : {};

  const features = new ApiFeatures(Review.find(filter), req.query, {
    allowedFields: ["rating", "verifiedPurchase"],
  })
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(Review));
});

const getMyReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find({ user: req.user._id })
    .populate("book", "title image slug")
    .sort("-createdAt")
    .lean();

  sendSuccess(res, 200, reviews, { total: reviews.length });
});

const createReview = asyncHandler(async (req, res) => {
  const bookId = req.params.bookId || req.body.book;

  const book = await Book.findOne({ _id: bookId, isActive: true }).select("_id");
  if (!book) throw ApiError.notFound("Book not found");

  const existing = await Review.findOne({ book: bookId, user: req.user._id }).lean();
  if (existing) throw ApiError.conflict("You have already reviewed this book");

  const purchased = await Order.exists({
    user: req.user._id,
    "items.book": bookId,
    isPaid: true,
  });

  const review = await Review.create({
    book: bookId,
    user: req.user._id,
    rating: req.body.rating,
    title: req.body.title,
    comment: req.body.comment,
    verifiedPurchase: Boolean(purchased),
  });

  sendSuccess(res, 201, review);
});

const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound("Review not found");

  if (String(review.user._id || review.user) !== String(req.user._id)) {
    throw ApiError.forbidden("You can only edit your own review");
  }

  const { rating, title, comment } = req.body;
  if (rating !== undefined) review.rating = rating;
  if (title !== undefined) review.title = title;
  if (comment !== undefined) review.comment = comment;

  await review.save();
  await Review.syncBookRating(review.book);

  sendSuccess(res, 200, review);
});

const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound("Review not found");

  assertOwnerOrAdmin(review.user, req.user, "You can only delete your own review");

  await review.deleteOne();
  await Review.syncBookRating(review.book);

  res.status(200).json({ success: true, message: "Review deleted" });
});

module.exports = {
  getReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
};
