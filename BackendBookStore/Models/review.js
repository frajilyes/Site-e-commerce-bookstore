const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: [true, "A review must belong to a book"],
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "A review must belong to a user"],
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
    },

    title: { type: String, trim: true, maxlength: 120 },

    comment: {
      type: String,
      trim: true,
      required: [true, "Comment is required"],
      maxlength: [2000, "Comment must be at most 2000 characters"],
    },

    verifiedPurchase: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

reviewSchema.index({ book: 1, user: 1 }, { unique: true });
reviewSchema.index({ book: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

reviewSchema.pre(/^find/, function populateAuthor() {
  this.populate({ path: "user", select: "fullName avatar" });
});

reviewSchema.statics.syncBookRating = async function syncBookRating(bookId) {
  const [stats] = await this.aggregate([
    { $match: { book: new mongoose.Types.ObjectId(String(bookId)) } },
    {
      $group: {
        _id: "$book",
        numReviews: { $sum: 1 },
        rating: { $avg: "$rating" },
      },
    },
  ]);

  await mongoose.model("Book").findByIdAndUpdate(bookId, {
    rating: stats ? Math.round(stats.rating * 10) / 10 : 0,
    numReviews: stats ? stats.numReviews : 0,
  });
};

reviewSchema.post("save", async function afterSave(doc) {
  await doc.constructor.syncBookRating(doc.book);
});

reviewSchema.post("deleteOne", { document: true, query: false }, async function afterDelete() {
  await this.constructor.syncBookRating(this.book);
});

reviewSchema.post(
  ["findOneAndUpdate", "findOneAndDelete"],
  async function afterWrite(doc) {
    if (doc) await doc.constructor.syncBookRating(doc.book);
  },
);

module.exports = mongoose.model("Review", reviewSchema);
