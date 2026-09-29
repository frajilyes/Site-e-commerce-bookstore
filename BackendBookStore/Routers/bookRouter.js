const { Router } = require("express");
const controller = require("../Controllers/bookController");
const reviewRouter = require("./reviewRouter");
const validate = require("../middlewares/validate");
const { optionalAuth } = require("../middlewares/auth");
const { adminOnly } = require("../middlewares/adminMiddleware");
const { writeLimiter } = require("../middlewares/rateLimiter");
const upload = require("../middlewares/upload");
const rules = require("../validators");

const bookRouter = Router();

bookRouter.use("/:bookId/reviews", reviewRouter);


const publicCache = (req, res, next) => {
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  next();
};

bookRouter.get("/", optionalAuth, validate(rules.listRules), controller.getAllBooks);
bookRouter.get("/featured", publicCache, controller.getFeaturedBooks);
bookRouter.get("/best-sellers", publicCache, controller.getBestSellers);
bookRouter.get("/categories", publicCache, controller.getCategories);
bookRouter.get("/:id/related", publicCache, controller.getRelatedBooks);
bookRouter.get("/:id", optionalAuth, controller.getBookById);


bookRouter.use(...adminOnly, writeLimiter);

bookRouter.post("/", upload.single("image"), upload.verifyImages, validate(rules.createBookRules), controller.createBook);
bookRouter.put("/:id", upload.single("image"), upload.verifyImages, validate(rules.updateBookRules), controller.updateBook);
bookRouter.patch("/:id", upload.single("image"), upload.verifyImages, validate(rules.updateBookRules), controller.updateBook);
bookRouter.patch("/:id/stock", validate(rules.updateStockRules), controller.updateStock);
bookRouter.delete("/:id", validate(rules.idParam), controller.deleteBookById);

module.exports = bookRouter;
