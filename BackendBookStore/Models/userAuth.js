const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;
const SALT_ROUNDS = 12;

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 40 },
    address: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    country: { type: String, required: true, trim: true, maxlength: 80 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const emailVerificationSchema = new mongoose.Schema(
  {
    codeHash: { type: String },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must be at least 2 characters"],
      maxlength: [80, "Full name must be at most 80 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, "Please provide a valid email address"],
    },

    password: {
      type: String,
      required: [
        function requiredForLocalAccounts() {
          return this.authProvider === "local";
        },
        "Password is required",
      ],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    authProvider: {
      type: String,
      enum: {
        values: ["local", "google"],
        message: "{VALUE} is not a valid authentication provider",
      },
      default: "local",
    },

    emailVerified: { type: Boolean, default: false },
    emailVerifiedAt: { type: Date },

    emailVerification: { type: emailVerificationSchema, select: false },

    passwordReset: { type: emailVerificationSchema, select: false },

    providers: {
      google: { type: String, select: false },
    },

    role: {
      type: String,
      enum: { values: ["user", "admin"], message: "{VALUE} is not a valid role" },
      default: "user",
    },

    phone: { type: String, trim: true, maxlength: 30 },
    avatar: { type: String, trim: true },

    addresses: { type: [addressSchema], default: [] },

    active: { type: Boolean, default: true, select: false },

    passwordChangedAt: { type: Date, select: false },

    tokenVersion: { type: Number, default: 0, select: false },

    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        delete ret.password;
        delete ret.providers;
        delete ret.emailVerification;
        delete ret.passwordReset;
        delete ret.tokenVersion;
        delete ret.passwordChangedAt;
        delete ret.__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

userSchema.index({ role: 1, createdAt: -1 });

userSchema.index({ emailVerified: 1, createdAt: -1 });

userSchema.index(
  { "providers.google": 1 },
  { unique: true, partialFilterExpression: { "providers.google": { $type: "string" } } },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;

  if (this.password) this.password = await bcrypt.hash(this.password, SALT_ROUNDS);

  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
    this.tokenVersion = (this.tokenVersion || 0) + 1;
  }
});

userSchema.pre("save", function normaliseAddresses() {
  if (this.isModified("addresses") && this.addresses.length) {
    const defaults = this.addresses.filter((address) => address.isDefault);
    if (defaults.length > 1) {
      defaults.slice(0, -1).forEach((address) => {
        address.isDefault = false;
      });
    } else if (!defaults.length) {
      this.addresses[0].isDefault = true;
    }
  }
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password || !candidate) return Promise.resolve(false);
  return bcrypt.compare(String(candidate), this.password);
};

userSchema.methods.needsEmailVerification = function needsEmailVerification() {
  return this.authProvider === "local" && !this.emailVerified;
};

userSchema.methods.hasChangedPasswordAfter = function hasChangedPasswordAfter(iat) {
  if (!this.passwordChangedAt || !iat) return false;
  return Math.floor(this.passwordChangedAt.getTime() / 1000) > iat;
};

module.exports = mongoose.model("User", userSchema);
