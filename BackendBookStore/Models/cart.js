const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    book: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Book",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      max: [99, "Quantity must be at most 99"],
      default: 1,
    },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: { type: [cartItemSchema], default: [] },

    coupon: { type: String, trim: true, uppercase: true, maxlength: 40 },
    discount: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

cartSchema.virtual("totalItems").get(function totalItems() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

cartSchema.virtual("subtotal").get(function subtotal() {
  const total = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  return Math.round(total * 100) / 100;
});

cartSchema.virtual("total").get(function total() {
  return Math.round(Math.max(this.subtotal - this.discount, 0) * 100) / 100;
});

module.exports = mongoose.model("Cart", cartSchema);
