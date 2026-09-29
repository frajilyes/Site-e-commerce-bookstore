const { Router } = require("express");
const controller = require("../Controllers/cartController");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/adminMiddleware");
const rules = require("../validators");

const cartRouter = Router();

cartRouter.use(protect);

cartRouter.get("/me", controller.getMyCart);
cartRouter.delete("/me", controller.clearCart);
cartRouter.post("/me/merge", validate(rules.mergeCartRules), controller.mergeCart);

cartRouter.post("/items", validate(rules.addCartItemRules), controller.addItem);
cartRouter.patch("/items/:bookId", validate(rules.updateCartItemRules), controller.updateItem);
cartRouter.delete("/items/:bookId", validate(rules.bookIdParam), controller.removeItem);

cartRouter.get("/", isAdmin, validate(rules.listRules), controller.getAllCarts);
cartRouter.get("/:id", isAdmin, validate(rules.idParam), controller.getCartById);

module.exports = cartRouter;
