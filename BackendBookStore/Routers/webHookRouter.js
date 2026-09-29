const { Router } = require("express");
const controller = require("../Controllers/webHookController");
const validate = require("../middlewares/validate");
const { adminOnly } = require("../middlewares/adminMiddleware");
const rules = require("../validators");

const webHookRouter = Router();

webHookRouter.use(...adminOnly);

webHookRouter.get("/", validate(rules.listRules), controller.getAllWebHooks);
webHookRouter.get("/:id", validate(rules.idParam), controller.getWebHookById);
webHookRouter.post("/:id/replay", validate(rules.idParam), controller.replayWebHook);
webHookRouter.delete("/:id", validate(rules.idParam), controller.deleteWebHookById);

module.exports = webHookRouter;
