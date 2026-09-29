const { Router } = require("express");
const controller = require("../Controllers/wishListController");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/adminMiddleware");
const rules = require("../validators");

const wishListRouter = Router();

wishListRouter.use(protect);

wishListRouter.get("/me", controller.getMyWishlist);
wishListRouter.delete("/me", controller.clearWishlist);

wishListRouter.post("/books", controller.addBook);
wishListRouter.post("/books/:bookId", validate(rules.bookIdParam), controller.addBook);
wishListRouter.delete("/books/:bookId", validate(rules.bookIdParam), controller.removeBook);

wishListRouter.get("/", isAdmin, validate(rules.listRules), controller.getAllWishLists);
wishListRouter.get("/:id", isAdmin, validate(rules.idParam), controller.getWishListById);

module.exports = wishListRouter;
