const Cart = require("../Models/cart");
const Book = require("../Models/book");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");

const POPULATE_ITEMS = {
  path: "items.book",
  select: "title author image price oldPrice stock slug isActive",
};

const prune = async (cart) => {
  if (!cart.isNew) {
    const before = cart.items.length;
    cart.items = cart.items.filter((item) => item.book && item.book.isActive);
    if (cart.items.length !== before) await cart.save();
  }
  return cart;
};

const getMyCart = asyncHandler(async (req, res) => {
  const found = await Cart.findOne({ user: req.user._id }).populate(POPULATE_ITEMS);
  const cart = found || new Cart({ user: req.user._id, items: [] });
  sendSuccess(res, 200, await prune(cart));
});

const addItem = asyncHandler(async (req, res) => {
  const { bookId, quantity = 1 } = req.body;

  const book = await Book.findOne({ _id: bookId, isActive: true });
  if (!book) throw ApiError.notFound("Book not found");

  const cart =
    (await Cart.findOne({ user: req.user._id })) ||
    new Cart({ user: req.user._id, items: [] });

  const existing = cart.items.find((item) => String(item.book) === String(book._id));
  const nextQuantity = (existing ? existing.quantity : 0) + Number(quantity);

  if (book.stock < nextQuantity) {
    throw ApiError.badRequest(`Only ${book.stock} copies of ${book.title} are in stock`);
  }

  if (existing) {
    existing.quantity = nextQuantity;
    existing.price = book.price;
  } else {
    cart.items.push({ book: book._id, quantity: Number(quantity), price: book.price });
  }

  await cart.save();
  await cart.populate(POPULATE_ITEMS);

  sendSuccess(res, 200, cart);
});

const updateItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const { bookId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw ApiError.notFound("Cart not found");

  const item = cart.items.find((i) => String(i.book) === String(bookId));
  if (!item) throw ApiError.notFound("This book is not in your cart");

  if (Number(quantity) <= 0) {
    cart.items = cart.items.filter((i) => String(i.book) !== String(bookId));
  } else {
    const book = await Book.findById(bookId).select("stock title price");
    if (!book) throw ApiError.notFound("Book not found");
    if (book.stock < Number(quantity)) {
      throw ApiError.badRequest(`Only ${book.stock} copies of ${book.title} are in stock`);
    }
    item.quantity = Number(quantity);
    item.price = book.price;
  }

  await cart.save();
  await cart.populate(POPULATE_ITEMS);

  sendSuccess(res, 200, cart);
});

const removeItem = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) throw ApiError.notFound("Cart not found");

  const before = cart.items.length;
  cart.items = cart.items.filter((i) => String(i.book) !== String(req.params.bookId));
  if (cart.items.length === before) {
    throw ApiError.notFound("This book is not in your cart");
  }

  await cart.save();
  await cart.populate(POPULATE_ITEMS);

  sendSuccess(res, 200, cart);
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { items: [], discount: 0, $unset: { coupon: "" } },
    { returnDocument: "after", upsert: true },
  );

  sendSuccess(res, 200, cart);
});

const mergeCart = asyncHandler(async (req, res) => {
  const { items = [] } = req.body;

  const cart =
    (await Cart.findOne({ user: req.user._id })) ||
    new Cart({ user: req.user._id, items: [] });

  const books = await Book.find({
    _id: { $in: items.map((item) => item.bookId) },
    isActive: true,
  }).select("price stock");

  const byId = new Map(books.map((book) => [String(book._id), book]));

  for (const incoming of items) {
    const book = byId.get(String(incoming.bookId));
    if (!book) continue;

    const quantity = Math.min(Math.max(Number(incoming.quantity) || 1, 1), book.stock);
    if (quantity < 1) continue;

    const existing = cart.items.find((i) => String(i.book) === String(book._id));
    if (existing) {
      existing.quantity = Math.min(Math.max(existing.quantity, quantity), book.stock);
      existing.price = book.price;
    } else {
      cart.items.push({ book: book._id, quantity, price: book.price });
    }
  }

  await cart.save();
  await cart.populate(POPULATE_ITEMS);

  sendSuccess(res, 200, cart);
});

const getAllCarts = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(
    Cart.find().populate("user", "fullName email"),
    req.query,
  )
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(Cart));
});

const getCartById = asyncHandler(async (req, res) => {
  const cart = await Cart.findById(req.params.id)
    .populate("user", "fullName email")
    .populate(POPULATE_ITEMS);

  if (!cart) throw ApiError.notFound("Cart not found");
  sendSuccess(res, 200, cart);
});

module.exports = {
  getMyCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
  getAllCarts,
  getCartById,
};
