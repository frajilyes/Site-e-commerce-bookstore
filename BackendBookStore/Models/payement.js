const mongoose = require("mongoose");

const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"];

const PAYMENT_METHODS = [
  "Stripe",
  "Visa",
  "MasterCard",
  "PayPal",
  "American Express",
];

const payementSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },

    contact: {
      email: { type: String, required: true, trim: true, lowercase: true },
      phone: { type: String, required: true, trim: true },
    },

    shipping: {
      firstName: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
      email: { type: String, required: true, trim: true, lowercase: true },
      address: { type: String, required: true, trim: true },
      city: { type: String, required: true, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, required: true, trim: true },
    },

    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },

    currency: { type: String, default: "USD", uppercase: true },

    paymentMethod: {
      type: String,
      enum: { values: PAYMENT_METHODS, message: "{VALUE} is not a supported payment method" },
      default: "Stripe",
    },

    status: {
      type: String,
      enum: { values: PAYMENT_STATUSES, message: "{VALUE} is not a valid payment status" },
      default: "pending",
      index: true,
    },

    paidAt: { type: Date },
    refundedAt: { type: Date },
    failureReason: { type: String, trim: true, maxlength: 500 },

    cardBrand: { type: String, trim: true },
    cardLast4: { type: String, trim: true, maxlength: 4 },

    stripeSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    stripeChargeId: { type: String },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

payementSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Payement", payementSchema);
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
