const { Router } = require("express");
const controller = require("../Controllers/payementController");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/adminMiddleware");
const { writeLimiter } = require("../middlewares/rateLimiter");
const rules = require("../validators");

const payementRouter = Router();

payementRouter.use(protect);

payementRouter.post(
  "/checkout-session",
  writeLimiter,
  validate(rules.checkoutSessionRules),
  controller.createCheckoutSession,
);
payementRouter.post(
  "/payment-intent",
  writeLimiter,
  validate(rules.checkoutSessionRules),
  controller.createPaymentIntent,
);
payementRouter.get("/session/:sessionId", controller.confirmCheckoutSession);
payementRouter.get("/my", controller.getMyPayements);
payementRouter.post("/", writeLimiter, validate(rules.createPayementRules), controller.createPayement);

payementRouter.get("/", isAdmin, validate(rules.listRules), controller.getAllPayements);
payementRouter.patch(
  "/:id",
  isAdmin,
  validate(rules.updatePayementRules),
  controller.updatePayement,
);
payementRouter.post(
  "/:id/refund",
  isAdmin,
  validate(rules.idParam),
  controller.refundPayement,
);
payementRouter.delete(
  "/:id",
  isAdmin,
  validate(rules.idParam),
  controller.deletePayementById,
);

payementRouter.get("/:id", validate(rules.idParam), controller.getPayementById);

module.exports = payementRouter;
