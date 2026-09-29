const { Router } = require("express");
const auth = require("../Controllers/userAuth");
const user = require("../Controllers/userController");
const validate = require("../middlewares/validate");
const { protect } = require("../middlewares/auth");
const { isAdmin } = require("../middlewares/adminMiddleware");
const { authLimiter, authIpLimiter } = require("../middlewares/rateLimiter");
const rules = require("../validators");

const userRouter = Router();


userRouter.post("/register", authLimiter, validate(rules.registerRules), auth.registerUser);
userRouter.post("/login", authLimiter, validate(rules.loginRules), auth.login);

userRouter.post(
  "/verify-email",
  authLimiter,
  validate(rules.verifyEmailRules),
  auth.verifyEmail,
);
userRouter.post(
  "/resend-verification",
  authLimiter,
  validate(rules.resendVerificationRules),
  auth.resendVerification,
);

userRouter.post(
  "/forgot-password",
  authLimiter,
  validate(rules.forgotPasswordRules),
  auth.forgotPassword,
);
userRouter.post(
  "/reset-password",
  authLimiter,
  validate(rules.resetPasswordRules),
  auth.resetPassword,
);

userRouter.get("/providers", auth.getAuthProviders);
userRouter.post("/google", authLimiter, validate(rules.googleAuthRules), auth.googleAuth);

userRouter.post("/refresh", authIpLimiter, auth.refresh);
userRouter.post("/logout", auth.logout);


userRouter.use(protect);

userRouter.get("/me", user.getMe);
userRouter.patch("/me", validate(rules.updateMeRules), user.updateMe);
userRouter.delete("/me", user.deleteMe);
userRouter.patch(
  "/me/password",
  authLimiter,
  validate(rules.updatePasswordRules),
  user.updatePassword,
);
userRouter.post("/me/addresses", validate(rules.addressRules), user.addAddress);
userRouter.delete("/me/addresses/:addressId", user.deleteAddress);


userRouter.use(isAdmin);

userRouter.get("/users", validate(rules.listRules), user.getAllUsers);
userRouter.get("/users/:id", validate(rules.idParam), user.getUserById);
userRouter.patch("/users/:id", validate(rules.adminUpdateUserRules), user.updateUser);
userRouter.delete("/users/:id", validate(rules.idParam), user.deleteUser);

module.exports = userRouter;
