const { body, param, query } = require("express-validator");
const { ORDER_STATUSES } = require("../Models/order");
const { normalizeEmail } = require("../utils/email");

const objectId = (name, location = param) =>
  location(name).isMongoId().withMessage(`${name} must be a valid id`);

const emailField = (field = "email", message = "A valid email is required") =>
  body(field).trim().isEmail().withMessage(message).customSanitizer(normalizeEmail);


const registerRules = [
  body("fullName")
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("Full name must be between 2 and 80 characters"),
  emailField(),
  body("password")
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one digit"),
];

const verifyEmailRules = [
  emailField(),
  body("code")
    .isString()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage("The confirmation code is 6 digits long"),
];

const resendVerificationRules = [emailField()];

const strongPassword = (field) =>
  body(field)
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be at least 8 characters")
    .matches(/[a-zA-Z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("Password must contain at least one digit");

const forgotPasswordRules = [emailField()];

const resetPasswordRules = [
  emailField(),
  body("code")
    .isString()
    .trim()
    .matches(/^[0-9]{6}$/)
    .withMessage("The reset code is 6 digits long"),
  strongPassword("password"),
];

const loginRules = [
  emailField(),
  body("password")
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage("Password is required"),
];

const googleAuthRules = [
  body("credential").optional().isString().trim().isLength({ min: 1, max: 4096 }),
  body("accessToken").optional().isString().trim().isLength({ min: 1, max: 4096 }),
  body().custom((value, { req }) => {
    if (!req.body?.credential && !req.body?.accessToken) {
      throw new Error("A Google credential or access token is required");
    }
    return true;
  }),
];

const updatePasswordRules = [
  body("currentPassword")
    .isString()
    .isLength({ min: 1, max: 128 })
    .withMessage("Current password is required"),
  body("newPassword")
    .isString()
    .isLength({ min: 8, max: 128 })
    .withMessage("New password must be at least 8 characters")
    .matches(/[a-zA-Z]/)
    .withMessage("New password must contain at least one letter")
    .matches(/[0-9]/)
    .withMessage("New password must contain at least one digit"),
];

const PHONE = /^[0-9+().\s-]{0,30}$/;

const updateMeRules = [
  body("fullName").optional().isString().trim().isLength({ min: 2, max: 80 }),
  body("phone").optional().isString().trim().matches(PHONE).withMessage("Invalid phone number"),
  body("avatar")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .isURL({ protocols: ["https"], require_protocol: true })
    .withMessage("Avatar must be a valid https URL"),
];

const addressRules = [
  body("label").optional().isString().trim().isLength({ max: 40 }),
  body("address").isString().trim().isLength({ min: 1, max: 200 }).withMessage("Address is required"),
  body("city").isString().trim().isLength({ min: 1, max: 80 }).withMessage("City is required"),
  body("country").isString().trim().isLength({ min: 1, max: 80 }).withMessage("Country is required"),
  body("postalCode").optional().isString().trim().isLength({ max: 20 }),
  body("isDefault").optional().isBoolean().toBoolean(),
];

const adminUpdateUserRules = [
  objectId("id"),
  body("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
  body("active").optional().isBoolean().toBoolean(),
  body("fullName").optional().isString().trim().isLength({ min: 2, max: 80 }),
];


const BADGES = ["Best Seller", "Popular", "Hot", "New", "Sale", "Classic", ""];

const createBookRules = [
  body("title").trim().isLength({ min: 1, max: 200 }).withMessage("Title is required"),
  body("author").trim().isLength({ min: 1, max: 120 }).withMessage("Author is required"),
  body("description")
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Description must be between 10 and 5000 characters"),
  body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number").toFloat(),
  body("oldPrice").optional().isFloat({ min: 0 }).toFloat(),
  body("image").trim().notEmpty().withMessage("A cover image URL is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("stock").optional().isInt({ min: 0 }).withMessage("Stock cannot be negative").toInt(),
  body("badge").optional().isIn(BADGES).withMessage("Unsupported badge"),
  body("rating").optional().isFloat({ min: 0, max: 5 }).toFloat(),
  body("pages").optional().isInt({ min: 1 }).toInt(),
  body("featured").optional().isBoolean().toBoolean(),
  body("tags").optional().isArray().withMessage("Tags must be an array"),
];

const updateBookRules = [
  objectId("id"),
  body("title").optional().trim().isLength({ min: 1, max: 200 }),
  body("author").optional().trim().isLength({ min: 1, max: 120 }),
  body("description").optional().trim().isLength({ min: 10, max: 5000 }),
  body("price").optional().isFloat({ min: 0 }).toFloat(),
  body("oldPrice").optional().isFloat({ min: 0 }).toFloat(),
  body("stock").optional().isInt({ min: 0 }).toInt(),
  body("badge").optional().isIn(BADGES),
  body("featured").optional().isBoolean().toBoolean(),
  body("isActive").optional().isBoolean().toBoolean(),
];

const updateStockRules = [
  objectId("id"),
  body("stock").isInt({ min: 0 }).withMessage("Stock must be a non-negative integer").toInt(),
];

const listRules = [
  query("page").optional().isInt({ min: 1 }).withMessage("page must be >= 1"),
  query("limit").optional().isInt({ min: 1, max: 100 }).withMessage("limit must be 1-100"),
];


const addCartItemRules = [
  body("bookId").isMongoId().withMessage("bookId must be a valid id"),
  body("quantity")
    .optional()
    .isInt({ min: 1, max: 99 })
    .withMessage("Quantity must be between 1 and 99")
    .toInt(),
];

const updateCartItemRules = [
  objectId("bookId"),
  body("quantity")
    .isInt({ min: 0, max: 99 })
    .withMessage("Quantity must be between 0 and 99")
    .toInt(),
];

const mergeCartRules = [
  body("items").isArray({ max: 100 }).withMessage("items must be an array"),
  body("items.*.bookId").isMongoId().withMessage("Each item needs a valid bookId"),
  body("items.*.quantity").optional().isInt({ min: 1, max: 99 }).toInt(),
];


const text = (field, max, message) =>
  body(field).isString().trim().isLength({ min: 1, max }).withMessage(message);

const shippingRules = [
  text("shippingAddress.firstName", 60, "First name is required"),
  text("shippingAddress.lastName", 60, "Last name is required"),
  emailField("shippingAddress.email"),
  text("shippingAddress.address", 200, "Address is required"),
  text("shippingAddress.city", 80, "City is required"),
  text("shippingAddress.country", 80, "Country is required"),
  body("shippingAddress.postalCode").optional().isString().trim().isLength({ max: 20 }),
  body("shippingAddress.phone").optional().isString().trim().matches(PHONE),
];

const createOrderRules = [
  ...shippingRules,
  body("items").optional().isArray({ max: 100 }),
  body("items.*").optional().custom((item) => {
    const id = item && (item.book || item.bookId);
    if (!/^[a-f0-9]{24}$/i.test(String(id))) throw new Error("Each item needs a valid book id");
    return true;
  }),
  body("items.*.quantity").optional().isInt({ min: 1, max: 99 }).toInt(),
  body("paymentMethod")
    .optional()
    .isIn(["Stripe", "Visa", "MasterCard", "PayPal", "American Express", "CashOnDelivery"])
    .withMessage("Unsupported payment method"),
  body("notes").optional().trim().isLength({ max: 1000 }),
];

const updateOrderStatusRules = [
  objectId("id"),
  body("status").isIn(ORDER_STATUSES).withMessage("Invalid order status"),
];


const checkoutSessionRules = [
  body("orderId").isMongoId().withMessage("orderId must be a valid id"),
];

const createPayementRules = [
  body("order").optional().isMongoId(),
  body("orderId").optional().isMongoId(),
  emailField("contact.email", "A valid contact email is required"),
  body("contact.phone").trim().notEmpty().withMessage("Contact phone is required"),
  body("shipping.firstName").trim().notEmpty().withMessage("First name is required"),
  body("shipping.lastName").trim().notEmpty().withMessage("Last name is required"),
  emailField("shipping.email", "A valid shipping email is required"),
  body("shipping.address").trim().notEmpty().withMessage("Address is required"),
  body("shipping.city").trim().notEmpty().withMessage("City is required"),
  body("shipping.country").trim().notEmpty().withMessage("Country is required"),
  body("paymentMethod")
    .optional()
    .isIn(["Stripe", "Visa", "MasterCard", "PayPal", "American Express"]),
];

const updatePayementRules = [
  objectId("id"),
  body("status")
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid payment status"),
];


const createReviewRules = [
  body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5").toInt(),
  body("comment")
    .trim()
    .isLength({ min: 3, max: 2000 })
    .withMessage("Comment must be between 3 and 2000 characters"),
  body("title").optional().trim().isLength({ max: 120 }),
];

const updateReviewRules = [
  objectId("id"),
  body("rating").optional().isInt({ min: 1, max: 5 }).toInt(),
  body("comment").optional().trim().isLength({ min: 3, max: 2000 }),
  body("title").optional().trim().isLength({ max: 120 }),
];

module.exports = {
  objectId,
  idParam: [objectId("id")],
  bookIdParam: [objectId("bookId")],
  listRules,
  registerRules,
  verifyEmailRules,
  resendVerificationRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  googleAuthRules,
  updatePasswordRules,
  updateMeRules,
  addressRules,
  adminUpdateUserRules,
  createBookRules,
  updateBookRules,
  updateStockRules,
  addCartItemRules,
  updateCartItemRules,
  mergeCartRules,
  createOrderRules,
  updateOrderStatusRules,
  checkoutSessionRules,
  createPayementRules,
  updatePayementRules,
  createReviewRules,
  updateReviewRules,
};
