const mongoose = require("mongoose");

const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
];

const PAYMENT_METHODS = [
  "Stripe",
  "Visa",
  "MasterCard",
  "PayPal",
  "American Express",
  "CashOnDelivery",
];

const orderItemSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    title: { type: String, required: true },
    author: { type: String },
    image: { type: String },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      default: [],
      validate: {
        validator: (items) => items.length > 0,
        message: "An order must contain at least one item",
      },
    },

    shippingAddress: { type: shippingAddressSchema, required: true },

    itemsPrice: { type: Number, required: true, min: 0, default: 0 },
    shippingPrice: { type: Number, required: true, min: 0, default: 0 },
    taxPrice: { type: Number, required: true, min: 0, default: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    totalPrice: { type: Number, required: true, min: 0, default: 0 },
    currency: { type: String, default: "USD", uppercase: true },

    paymentMethod: {
      type: String,
      enum: { values: PAYMENT_METHODS, message: "{VALUE} is not a supported payment method" },
      default: "Stripe",
    },

    status: {
      type: String,
      enum: { values: ORDER_STATUSES, message: "{VALUE} is not a valid order status" },
      default: "pending",
      index: true,
    },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String, trim: true, maxlength: 500 },

    stripeSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },

    notes: { type: String, trim: true, maxlength: 1000 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

orderSchema.virtual("totalItems").get(function totalItems() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.pre("validate", function assignOrderNumber() {
  if (!this.orderNumber) {
    const stamp = Date.now().toString(36).toUpperCase();
    const suffix = this._id.toString().slice(-4).toUpperCase();
    this.orderNumber = `BK-${stamp}-${suffix}`;
  }
});

module.exports = mongoose.model("Order", orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
