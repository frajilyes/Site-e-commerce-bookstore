const getStripe = require("../config/stripe");
const env = require("../config/env");
const WebHook = require("../Models/webHook");
const Order = require("../Models/order");
const Payement = require("../Models/payement");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const ApiFeatures = require("../utils/apiFeatures");
const { sendSuccess, sendPaginated } = require("../utils/response");
const stripeError = require("../utils/stripeError");
const { releaseStock } = require("../Services/inventory");
const { markOrderPaid, coversOrder } = require("./payementController");

const onCheckoutCompleted = async (session) => {
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order || order.isPaid) return;

  await markOrderPaid(order, session);
};

const onPaymentIntentSucceeded = async (intent) => {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;

  const order = await Order.findById(orderId);
  if (!order || order.isPaid) return;

  if (!coversOrder(order, intent.amount_received, intent.currency)) {
    throw new Error(
      `PaymentIntent ${intent.id} received ${intent.amount_received} for order ${order._id} (expected ${Math.round(order.totalPrice * 100)})`,
    );
  }

  order.isPaid = true;
  order.paidAt = new Date();
  order.status = "paid";
  order.stripePaymentIntentId = intent.id;
  await order.save();

  const charge = intent.charges?.data?.[0];

  await Payement.findOneAndUpdate(
    { order: order._id },
    {
      user: order.user,
      order: order._id,
      status: "completed",
      paidAt: order.paidAt,
      amount: intent.amount_received / 100,
      currency: (intent.currency || "usd").toUpperCase(),
      stripePaymentIntentId: intent.id,
      stripeChargeId: charge?.id,
      cardBrand: charge?.payment_method_details?.card?.brand,
      cardLast4: charge?.payment_method_details?.card?.last4,
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
};

const onPaymentFailed = async (intent) => {
  const orderId = intent.metadata?.orderId;
  if (!orderId) return;

  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: "pending", isPaid: false },
    {
      status: "cancelled",
      cancelledAt: new Date(),
      cancelReason: String(intent.last_payment_error?.message || "Payment failed").slice(0, 500),
    },
    { returnDocument: "after" },
  );
  if (!order) return;

  await releaseStock(order.items);

  await Payement.findOneAndUpdate(
    { order: order._id },
    {
      status: "failed",
      failureReason: order.cancelReason,
      stripePaymentIntentId: intent.id,
    },
  );
};

const onChargeRefunded = async (charge) => {
  const payement = await Payement.findOne({
    stripePaymentIntentId: charge.payment_intent,
  });
  if (!payement) return;

  payement.status = "refunded";
  payement.refundedAt = new Date();
  payement.stripeChargeId = charge.id;
  await payement.save();

  await Order.findByIdAndUpdate(payement.order, { status: "refunded" });
};

const HANDLERS = {
  "checkout.session.completed": onCheckoutCompleted,
  "checkout.session.async_payment_succeeded": onCheckoutCompleted,
  "payment_intent.succeeded": onPaymentIntentSucceeded,
  "payment_intent.payment_failed": onPaymentFailed,
  "charge.refunded": onChargeRefunded,
};

const handleStripeWebhook = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) throw stripeError.webhookNotConfigured();

  const signature = req.headers["stripe-signature"];
  if (!signature) throw ApiError.badRequest("Missing stripe-signature header");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    throw stripeError.toApiError(error);
  }

  try {
    await WebHook.create({ eventId: event.id, type: event.type, data: event.data });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ received: true, duplicate: true });
    }
    throw error;
  }

  const handler = HANDLERS[event.type];

  if (handler) {
    try {
      await handler(event.data.object);
      await WebHook.updateOne(
        { eventId: event.id },
        { processed: true, processedAt: new Date(), $inc: { attempts: 1 } },
      );
    } catch (error) {
      await WebHook.updateOne(
        { eventId: event.id },
        { error: error.message, $inc: { attempts: 1 } },
      );
      throw error;
    }
  } else {
    await WebHook.updateOne(
      { eventId: event.id },
      { processed: true, processedAt: new Date() },
    );
  }

  res.status(200).json({ received: true });
});

const getAllWebHooks = asyncHandler(async (req, res) => {
  const features = new ApiFeatures(WebHook.find(), req.query, {
    allowedFields: ["type", "processed"],
  })
    .filter()
    .sort("-createdAt")
    .limitFields()
    .paginate()
    .lean();

  sendPaginated(res, await features.execute(WebHook));
});

const getWebHookById = asyncHandler(async (req, res) => {
  const webHook = await WebHook.findById(req.params.id);
  if (!webHook) throw ApiError.notFound("Webhook event not found");

  sendSuccess(res, 200, webHook);
});

const replayWebHook = asyncHandler(async (req, res) => {
  const webHook = await WebHook.findById(req.params.id);
  if (!webHook) throw ApiError.notFound("Webhook event not found");

  const handler = HANDLERS[webHook.type];
  if (!handler) throw ApiError.badRequest(`No handler for event type ${webHook.type}`);

  await handler(webHook.data.object);

  webHook.processed = true;
  webHook.processedAt = new Date();
  webHook.error = undefined;
  webHook.attempts += 1;
  await webHook.save();

  sendSuccess(res, 200, webHook);
});

const deleteWebHookById = asyncHandler(async (req, res) => {
  const webHook = await WebHook.findByIdAndDelete(req.params.id);
  if (!webHook) throw ApiError.notFound("Webhook event not found");

  res.status(200).json({ success: true, message: "Webhook event deleted" });
});

module.exports = {
  handleStripeWebhook,
  getAllWebHooks,
  getWebHookById,
  replayWebHook,
  deleteWebHookById,
};
