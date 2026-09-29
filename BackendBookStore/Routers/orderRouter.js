const { Router } = require("express");
const controller = require("../Controllers/orderController");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/adminMiddleware");
const { writeLimiter } = require("../middlewares/rateLimiter");
const rules = require("../validators");

const orderRouter = Router();

orderRouter.use(protect);

orderRouter.post("/", writeLimiter, validate(rules.createOrderRules), controller.createOrder);
orderRouter.get("/my", validate(rules.listRules), controller.getMyOrders);
orderRouter.patch("/:id/cancel", validate(rules.idParam), controller.cancelOrder);

orderRouter.get("/stats", isAdmin, controller.getOrderStats);
orderRouter.get("/", isAdmin, validate(rules.listRules), controller.getAllOrders);
orderRouter.patch(
  "/:id/status",
  isAdmin,
  validate(rules.updateOrderStatusRules),
  controller.updateOrderStatus,
);
orderRouter.delete("/:id", isAdmin, validate(rules.idParam), controller.deleteOrderById);

orderRouter.get("/:id", validate(rules.idParam), controller.getOrderById);

module.exports = orderRouter;
