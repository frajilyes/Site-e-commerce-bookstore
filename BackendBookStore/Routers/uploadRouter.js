const { Router } = require("express");
const controller = require("../Controllers/uploadController");
const upload = require("../middlewares/upload");
const { adminOnly } = require("../middlewares/adminMiddleware");
const { writeLimiter } = require("../middlewares/rateLimiter");

const uploadRouter = Router();

uploadRouter.use(...adminOnly, writeLimiter);

uploadRouter.get("/", controller.listUploads);
uploadRouter.post("/", upload.single("file"), upload.verifyImages, controller.uploadSingle);
uploadRouter.post("/many", upload.array("files", 10), upload.verifyImages, controller.uploadMany);
uploadRouter.delete("/:filename", controller.deleteUpload);

module.exports = uploadRouter;
