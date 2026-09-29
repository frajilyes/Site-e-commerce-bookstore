const { Router } = require("express");
const controller = require("../Controllers/reviewController");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth");
const rules = require("../validators");

const reviewRouter = Router({ mergeParams: true });

reviewRouter.get("/", validate(rules.listRules), controller.getReviews);

reviewRouter.use(protect);

reviewRouter.get("/mine", controller.getMyReviews);
reviewRouter.post("/", validate(rules.createReviewRules), controller.createReview);
reviewRouter.patch("/:id", validate(rules.updateReviewRules), controller.updateReview);
reviewRouter.delete("/:id", validate(rules.idParam), controller.deleteReview);

module.exports = reviewRouter;
