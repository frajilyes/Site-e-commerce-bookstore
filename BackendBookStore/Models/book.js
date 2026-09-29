const mongoose = require("mongoose");

const BADGES = ["Best Seller", "Popular", "Hot", "New", "Sale", "Classic", ""];

const slugify = (value) =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);

const discountPercentage = (book) =>
  !book.oldPrice || book.oldPrice <= book.price
    ? 0
    : Math.round(((book.oldPrice - book.price) / book.oldPrice) * 100);

const decorate = (row) =>
  !row
    ? row
    : { ...row, discountPercentage: discountPercentage(row), inStock: row.stock > 0 };

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title must be at most 200 characters"],
    },

    slug: { type: String, unique: true, lowercase: true, trim: true },

    author: {
      type: String,
      required: [true, "Author is required"],
      trim: true,
      maxlength: [120, "Author must be at most 120 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [5000, "Description must be at most 5000 characters"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
      set: (value) => Math.round(value * 100) / 100,
    },

    oldPrice: {
      type: Number,
      min: [0, "Old price cannot be negative"],
      default: 0,
      set: (value) => Math.round(value * 100) / 100,
    },

    image: {
      type: String,
      required: [true, "Cover image is required"],
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, "Stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Stock must be a whole number",
      },
    },

    sold: { type: Number, default: 0, min: 0 },

    rating: {
      type: Number,
      default: 0,
      min: [0, "Rating cannot be below 0"],
      max: [5, "Rating cannot be above 5"],
      set: (value) => Math.round(value * 10) / 10,
    },

    numReviews: { type: Number, default: 0, min: 0 },

    badge: {
      type: String,
      enum: { values: BADGES, message: "{VALUE} is not a supported badge" },
      default: "",
      trim: true,
    },

    pages: { type: Number, min: [1, "A book has at least one page"] },
    language: { type: String, trim: true, default: "English" },
    publisher: { type: String, trim: true, maxlength: 120 },
    isbn: { type: String, trim: true, maxlength: 20 },
    tags: { type: [String], default: [] },

    featured: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

bookSchema.index({ isActive: 1, category: 1, price: 1 });
bookSchema.index({ isActive: 1, featured: 1, rating: -1 });
bookSchema.index({ isActive: 1, sold: -1 });
bookSchema.index({ isActive: 1, createdAt: -1 });
bookSchema.index({ author: 1 });

bookSchema.virtual("discountPercentage").get(function getDiscountPercentage() {
  return discountPercentage(this);
});

bookSchema.virtual("inStock").get(function inStock() {
  return this.stock > 0;
});

bookSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "book",
});

const uniqueSlug = async function uniqueSlug(model, title, excludeId) {
  const base = slugify(title) || "book";

  for (let suffix = 0; suffix < 50; suffix += 1) {
    const candidate = suffix ? `${base}-${suffix + 1}` : base;
    const clash = await model
      .findOne({ slug: candidate, _id: { $ne: excludeId } })
      .select("_id")
      .lean();
    if (!clash) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
};

bookSchema.pre("validate", async function assignSlug() {
  if (this.slug && !this.isModified("title")) return;
  this.slug = await uniqueSlug(this.constructor, this.title, this._id);
});

bookSchema.pre("findOneAndUpdate", async function resyncSlug() {
  const update = this.getUpdate() || {};
  const title = update.title || update.$set?.title;
  if (!title) return;

  const current = await this.model.findOne(this.getQuery()).select("_id").lean();
  this.set("slug", await uniqueSlug(this.model, title, current?._id));
});

module.exports = mongoose.model("Book", bookSchema);
module.exports.BADGES = BADGES;
module.exports.decorate = decorate;
