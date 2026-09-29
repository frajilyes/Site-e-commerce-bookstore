const getStripe = require("../config/stripe");
const env = require("../config/env");
const Payement = require("../Models/payement");
const Order = require("../Models/order");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");
const { assertOwnerOrAdmin } = require("../middlewares/adminMiddleware");
const stripeError = require("../utils/stripeError");

const requireStripe = () => {
  const stripe = getStripe();
  if (!stripe) throw stripeError.notConfigured();
  return stripe;
};

const loadOwnedOrder = async (orderId, user) => {
  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found");

  assertOwnerOrAdmin(order.user, user);

  return order;
};

const coversOrder = (order, amountInCents, currency) =>
  Number.isFinite(amountInCents) &&
  amountInCents >= Math.round(order.totalPrice * 100) &&
  (!currency || String(currency).toLowerCase() === env.CURRENCY);

const markOrderPaid = async (order, session) => {
  if (!coversOrder(order, session.amount_total, session.currency)) {
    throw ApiError.badRequest("The amount paid does not match this order");
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.status = "paid";
  order.stripePaymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  await order.save();

  await Payement.findOneAndUpdate(
    { order: order._id },
    {
      status: "completed",
      paidAt: order.paidAt,
      amount: session.amount_total ? session.amount_total / 100 : order.totalPrice,
      stripeSessionId: session.id,
      stripePaymentIntentId: order.stripePaymentIntentId,
    },
    { returnDocument: "after" },
  );

  return order;
};

const createCheckoutSession = asyncHandler(async (req, res) => {
  const stripe = requireStripe();
  const order = await loadOwnedOrder(req.body.orderId, req.user);

  if (order.isPaid) throw ApiError.badRequest("This order is already paid");
  if (order.status === "cancelled") {
    throw ApiError.badRequest("This order has been cancelled");
  }

  const lineItems = order.items.map((item) => ({
    quantity: item.quantity,
    price_data: {
      currency: env.CURRENCY,
      unit_amount: Math.round(item.price * 100),
      product_data: {
        name: item.title,
        description: item.author || undefined,
        images:
          item.image && item.image.startsWith("http") ? [item.image] : undefined,
      },
    },
  }));

  if (order.shippingPrice > 0) {
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: env.CURRENCY,
        unit_amount: Math.round(order.shippingPrice * 100),
        product_data: { name: "Shipping" },
      },
    });
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: lineItems,
      customer_email: order.shippingAddress.email,
      client_reference_id: String(order._id),
      metadata: { orderId: String(order._id), userId: String(order.user) },
      success_url: `${env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.CLIENT_URL}/checkout/cancel?order=${order._id}`,
    },
    { idempotencyKey: `checkout_${order._id}_${order.updatedAt.getTime()}` },
  );

  order.stripeSessionId = session.id;
  await order.save();

  await Payement.findOneAndUpdate(
    { order: order._id },
    {
      user: order.user,
      order: order._id,
      contact: {
        email: order.shippingAddress.email,
        phone: order.shippingAddress.phone || "N/A",
      },
      shipping: {
        firstName: order.shippingAddress.firstName,
        lastName: order.shippingAddress.lastName,
        email: order.shippingAddress.email,
        address: order.shippingAddress.address,
        city: order.shippingAddress.city,
        postalCode: order.shippingAddress.postalCode,
        country: order.shippingAddress.country,
      },
      amount: order.totalPrice,
      currency: order.currency,
      paymentMethod: "Stripe",
      status: "pending",
      stripeSessionId: session.id,
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );

  sendSuccess(res, 201, { sessionId: session.id, url: session.url });
});

const createPaymentIntent = asyncHandler(async (req, res) => {
  const stripe = requireStripe();
  const order = await loadOwnedOrder(req.body.orderId, req.user);

  if (order.isPaid) throw ApiError.badRequest("This order is already paid");
  if (order.status !== "pending") {
    throw ApiError.badRequest(`An order with status "${order.status}" cannot be paid`);
  }

  const intent = await stripe.paymentIntents.create(
    {
      amount: Math.round(order.totalPrice * 100),
      currency: env.CURRENCY,
      automatic_payment_methods: { enabled: true },
      metadata: { orderId: String(order._id), userId: String(order.user) },
    },
    { idempotencyKey: `intent_${order._id}_${order.updatedAt.getTime()}` },
  );

  order.stripePaymentIntentId = intent.id;
  await order.save();

  sendSuccess(res, 201, { clientSecret: intent.client_secret });
});

const confirmCheckoutSession = asyncHandler(async (req, res) => {
  const stripe = requireStripe();
  const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
  if (!session) throw ApiError.notFound("Checkout session not found");

  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) throw ApiError.badRequest("This checkout session has no order attached");

  const order = await loadOwnedOrder(orderId, req.user);

  if (session.payment_status === "paid" && !order.isPaid) {
    await markOrderPaid(order, session);
  }

  sendSuccess(res, 200, { paid: session.payment_status === "paid", order });
});

const getMyPayements = asyncHandler(async (req, res) => {
  const payements = await Payement.find({ user: req.user._id })
    .populate("order", "orderNumber totalPrice status")
    .sort("-createdAt")
    .lean();

  sendSuccess(res, 200, payements, { total: payements.length });
});

const getPayementById = asyncHandler(async (req, res) => {
  const payement = await Payement.findById(req.params.id).populate(
    "order",
    "orderNumber totalPrice status items",
  );

  if (!payement) throw ApiError.notFound("Payment not found");

  assertOwnerOrAdmin(payement.user, req.user);

  sendSuccess(res, 200, payement);
});

const createPayement = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.body.order || req.body.orderId, req.user);
  const { contact, shipping, paymentMethod } = req.body;

  const payement = await Payement.findOneAndUpdate(
    { order: order._id },
    {
      user: order.user,
      order: order._id,
      contact,
      shipping,
      amount: order.totalPrice,
      currency: order.currency,
      paymentMethod: paymentMethod || "Stripe",
      status: "pending",
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, runValidators: true },
  );

  sendSuccess(res, 201, payement);
});

const getAllPayements = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(
    Payement.find()
      .populate("user", "fullName email")
      .populate("order", "orderNumber"),
    req.query,
    { allowedFields: ["status", "paymentMethod", "user", "order"] },
  )
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(Payement));
});

const updatePayement = asyncHandler(async (req, res) => {
  const { status, failureReason } = req.body;

  const payement = await Payement.findById(req.params.id);
  if (!payement) throw ApiError.notFound("Payment not found");

  payement.status = status;
  if (failureReason) payement.failureReason = failureReason;
  if (status === "completed" && !payement.paidAt) payement.paidAt = new Date();
  await payement.save();

  if (status === "completed") {
    await Order.findByIdAndUpdate(payement.order, {
      isPaid: true,
      paidAt: payement.paidAt,
      status: "paid",
    });
  }

  sendSuccess(res, 200, payement);
});

const refundPayement = asyncHandler(async (req, res) => {
  const stripe = requireStripe();

  const payement = await Payement.findById(req.params.id);
  if (!payement) throw ApiError.notFound("Payment not found");
  if (payement.status !== "completed") {
    throw ApiError.badRequest("Only a completed payment can be refunded");
  }
  if (!payement.stripePaymentIntentId) {
    throw ApiError.badRequest("This payment has no Stripe payment intent to refund");
  }

  await stripe.refunds.create({
    payment_intent: payement.stripePaymentIntentId,
    reason: req.body.reason || "requested_by_customer",
  });

  payement.status = "refunded";
  payement.refundedAt = new Date();
  await payement.save();

  await Order.findByIdAndUpdate(payement.order, { status: "refunded" });

  sendSuccess(res, 200, payement);
});

const deletePayementById = asyncHandler(async (req, res) => {
  const payement = await Payement.findByIdAndDelete(req.params.id);
  if (!payement) throw ApiError.notFound("Payment not found");

  res.status(200).json({ success: true, message: "Payment record deleted" });
});

module.exports = {
  createCheckoutSession,
  createPaymentIntent,
  confirmCheckoutSession,
  getMyPayements,
  getPayementById,
  createPayement,
  getAllPayements,
  updatePayement,
  refundPayement,
  deletePayementById,
  markOrderPaid,
  coversOrder,
};
