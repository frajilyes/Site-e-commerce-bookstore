const env = require("../config/env");
const Order = require("../Models/order");
const Cart = require("../Models/cart");
const Book = require("../Models/book");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");
const { priceOrder } = require("../Services/pricing");
const { reserveStock, releaseStock } = require("../Services/inventory");
const { assertOwnerOrAdmin } = require("../middlewares/adminMiddleware");

const CANCELLABLE = ["pending", "paid", "processing"];

const buildItems = async (requested) => {
  if (!requested.length) throw ApiError.badRequest("Your cart is empty");

  const books = await Book.find({
    _id: { $in: requested.map((item) => item.book) },
    isActive: true,
  })
    .select("title author image price stock")
    .lean();

  const byId = new Map(books.map((book) => [String(book._id), book]));

  return requested.map((line) => {
    const book = byId.get(String(line.book));
    if (!book) throw ApiError.badRequest("One of the books is no longer available");
    if (book.stock < line.quantity) {
      throw ApiError.conflict(`Only ${book.stock} copies of ${book.title} are in stock`);
    }

    return {
      book: book._id,
      title: book.title,
      author: book.author,
      image: book.image,
      price: book.price,
      quantity: line.quantity,
    };
  });
};

const createOrder = asyncHandler(async (req, res) => {
  const { shippingAddress, paymentMethod, notes } = req.body;

  const pending = await Order.countDocuments({
    user: req.user._id,
    status: "pending",
    isPaid: false,
  });
  if (pending >= env.MAX_PENDING_ORDERS) {
    throw ApiError.conflict(
      "You have too many unpaid orders. Pay or cancel one before placing another.",
    );
  }

  const cart = await Cart.findOne({ user: req.user._id });

  const requested =
    Array.isArray(req.body.items) && req.body.items.length
      ? req.body.items.map((item) => ({
          book: item.book || item.bookId,
          quantity: Math.max(Number(item.quantity) || 1, 1),
        }))
      : (cart?.items || []).map((item) => ({
          book: item.book,
          quantity: item.quantity,
        }));

  const items = await buildItems(requested);
  const totals = priceOrder(items, { discount: cart?.discount || 0 });

  await reserveStock(items);

  let order;
  try {
    order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod: paymentMethod || "Stripe",
      notes,
      ...totals,
    });
  } catch (error) {
    await releaseStock(items);
    throw error;
  }

  if (cart) {
    cart.items = [];
    cart.discount = 0;
    cart.coupon = undefined;
    await cart.save();
  }

  sendSuccess(res, 201, order);
});

const getMyOrders = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(Order.find({ user: req.user._id }), req.query, {
    allowedFields: ["status", "isPaid"],
  })
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(Order));
});

const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "fullName email",
  );

  if (!order) throw ApiError.notFound("Order not found");

  assertOwnerOrAdmin(order.user, req.user);

  sendSuccess(res, 200, order);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const existing = await Order.findById(req.params.id).select("user status").lean();
  if (!existing) throw ApiError.notFound("Order not found");

  assertOwnerOrAdmin(existing.user, req.user);

  const order = await Order.findOneAndUpdate(
    { _id: existing._id, status: { $in: CANCELLABLE } },
    {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: String(req.body.reason || "Cancelled by customer").slice(0, 500),
    },
    { returnDocument: "after" },
  );

  if (!order) {
    throw ApiError.badRequest(`An order with status "${existing.status}" cannot be cancelled`);
  }

  await releaseStock(order.items);

  sendSuccess(res, 200, order);
});

const getAllOrders = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(
    Order.find().populate("user", "fullName email"),
    req.query,
    { allowedFields: ["status", "isPaid", "isDelivered", "user", "paymentMethod"] },
  )
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(Order));
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  if (status === "cancelled") {
    const cancelled = await Order.findOneAndUpdate(
      { _id: req.params.id, status: { $in: CANCELLABLE } },
      { status: "cancelled", cancelledAt: new Date() },
      { returnDocument: "after" },
    );
    if (cancelled) {
      await releaseStock(cancelled.items);
      return sendSuccess(res, 200, cancelled);
    }
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  if (status === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  if (status === "paid" && !order.isPaid) {
    order.isPaid = true;
    order.paidAt = new Date();
  }

  order.status = status;
  await order.save();

  sendSuccess(res, 200, order);
});

const deleteOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  if (CANCELLABLE.includes(order.status)) await releaseStock(order.items);
  await order.deleteOne();

  res.status(200).json({ success: true, message: "Order deleted" });
});

const getOrderStats = asyncHandler(async (req, res) => {
  const [summary] = await Order.aggregate([
    { $match: { isPaid: true } },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$totalPrice" },
        orders: { $sum: 1 },
        averageOrderValue: { $avg: "$totalPrice" },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const byStatus = await Order.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
    { $project: { _id: 0, status: "$_id", count: 1 } },
    { $sort: { count: -1 } },
  ]);

  const topBooks = await Order.aggregate([
    { $match: { isPaid: true } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.book",
        title: { $first: "$items.title" },
        unitsSold: { $sum: "$items.quantity" },
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
    { $sort: { unitsSold: -1 } },
    { $limit: 10 },
  ]);

  sendSuccess(res, 200, {
    revenue: summary?.revenue || 0,
    paidOrders: summary?.orders || 0,
    averageOrderValue: summary?.averageOrderValue || 0,
    byStatus,
    topBooks,
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  deleteOrderById,
  getOrderStats,
};
