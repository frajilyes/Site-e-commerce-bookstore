const User = require("../Models/userAuth");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { normalizeEmail } = require("../utils/email");
const asyncHandler = require("../utils/asyncHandler");
const { sendSuccess } = require("../utils/response");
const {
  REFRESH_COOKIE,
  buildAuthPayload,
  openSession,
  closeSession,
} = require("../utils/generateToken");
const {
  verifyRefreshToken,
  signRefreshToken,
  refreshCookieOptions,
  isRevoked,
} = require("../utils/jwt");
const { verifyGoogleToken, availableProviders } = require("../Services/oauthService");
const {
  SELECT_VERIFICATION,
  issueCode,
  confirmCode,
} = require("../Services/emailVerification");
const {
  SELECT_RESET,
  issueResetCode,
  resetPasswordWithCode,
} = require("../Services/passwordReset");

const PROVIDER_LABELS = { google: "Google" };

const sendVerificationPending = (res, statusCode, user, result, message) =>
  res.status(statusCode).json({
    success: true,
    message,
    data: {
      requiresVerification: true,
      email: user.email,
      delivered: result.delivered,
      resendAfter: result.retryAfter,
      expiresInMinutes: env.EMAIL_CODE_TTL_MIN,
    },
  });

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  const existing = await User.findOne({ email: normalizeEmail(email) }).select(
    SELECT_VERIFICATION,
  );

  if (existing) {
    if (existing.needsEmailVerification()) {
      existing.fullName = fullName;
      existing.password = password;
      await existing.save();

      const result = await issueCode(existing);
      return sendVerificationPending(
        res,
        201,
        existing,
        result,
        result.sent
          ? "A confirmation code has been sent to your email address"
          : "A confirmation code was already sent, check your inbox",
      );
    }

    throw ApiError.conflict("An account with this email already exists");
  }

  const user = await User.create({ fullName, email, password });
  const result = await issueCode(user);

  sendVerificationPending(
    res,
    201,
    user,
    result,
    "Account created. Confirm your email address to activate it.",
  );
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email: normalizeEmail(email) }).select(
    SELECT_VERIFICATION,
  );

  if (!user) {
    throw ApiError.badRequest(
      "Aucun code en attente pour cette adresse. Demandez-en un nouveau.",
      undefined,
      "VERIFICATION_CODE_MISSING",
    );
  }

  if (!user.active) throw ApiError.forbidden("This account has been deactivated");

  if (user.emailVerified) {
    return openSession(res, user, "Email address already confirmed");
  }

  await confirmCode(user, code);

  openSession(res, user, "Email address confirmed");
});

const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const generic = {
    success: true,
    message: "If this address needs confirming, a new code is on its way",
  };

  const user = await User.findOne({ email: normalizeEmail(email) }).select(
    SELECT_VERIFICATION,
  );

  if (!user || !user.active || user.emailVerified) {
    return res.status(200).json({
      ...generic,
      data: { requiresVerification: false, email: normalizeEmail(email) },
    });
  }

  const result = await issueCode(user, { throwOnCooldown: true });

  sendVerificationPending(res, 200, user, result, "A new confirmation code has been sent");
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: normalizeEmail(email) }).select(
    `+password ${SELECT_VERIFICATION}`,
  );

  if (user && !user.password) {
    const label = PROVIDER_LABELS[user.authProvider] || "a social provider";
    throw ApiError.badRequest(
      `This account was created with ${label}. Use that button to sign in.`,
      undefined,
      "USE_SOCIAL_LOGIN",
    );
  }

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.active) throw ApiError.forbidden("This account has been deactivated");

  if (env.REQUIRE_EMAIL_VERIFICATION && user.needsEmailVerification()) {
    await issueCode(user);
    throw ApiError.forbidden(
      "Confirmez votre adresse email pour acceder a votre compte. Un code vient de vous etre envoye.",
      "EMAIL_NOT_VERIFIED",
    );
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  openSession(res, user, "Login successful");
});

const forgotPassword = asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);

  const user = await User.findOne({ email }).select(SELECT_RESET);

  if (user && user.active) {
    issueResetCode(user).catch((error) => {
      console.error(`[auth] password reset code for ${email} failed: ${error.message}`);
    });
  }

  res.status(200).json({
    success: true,
    message: "If an account exists for this address, a reset code is on its way",
    data: {
      email,
      expiresInMinutes: env.PASSWORD_RESET_TTL_MIN,
      resendAfter: env.EMAIL_CODE_RESEND_COOLDOWN_S,
      delivered: env.mailEnabled,
    },
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;

  const user = await User.findOne({ email: normalizeEmail(email) }).select(SELECT_RESET);

  if (!user || !user.active) {
    throw ApiError.badRequest(
      "Aucune demande de reinitialisation en cours pour cette adresse. Demandez un nouveau code.",
      undefined,
      "RESET_CODE_MISSING",
    );
  }

  await resetPasswordWithCode(user, code, password);

  openSession(res, user, "Password reset successfully");
});

const signInWithProvider = async (profile) => {
  const providerPath = `providers.${profile.provider}`;

  const select = "+active +providers.google +emailVerification +tokenVersion +password";

  let user = await User.findOne({ [providerPath]: profile.providerId }).select(select);

  if (!user) {
    user = await User.findOne({ email: profile.email }).select(select);
  }

  if (user) {
    if (!user.active) throw ApiError.forbidden("This account has been deactivated");

    if (!user.emailVerified) {
      user.emailVerified = true;
      user.emailVerifiedAt = new Date();
      user.set("emailVerification", undefined);

      if (user.password) {
        user.set("password", undefined);
        user.authProvider = profile.provider;
      }
    }

    user.set(providerPath, profile.providerId);
    if (!user.avatar && profile.avatar) user.avatar = profile.avatar;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    return user;
  }

  return User.create({
    fullName: profile.fullName,
    email: profile.email,
    avatar: profile.avatar,
    authProvider: profile.provider,
    providers: { [profile.provider]: profile.providerId },
    emailVerified: true,
    emailVerifiedAt: new Date(),
    lastLoginAt: new Date(),
  });
};

const googleAuth = asyncHandler(async (req, res) => {
  const { credential, accessToken } = req.body;
  const profile = await verifyGoogleToken({ credential, accessToken });
  const user = await signInWithProvider(profile);

  openSession(res, user, `Signed in with ${PROVIDER_LABELS[profile.provider]}`);
});

const getAuthProviders = (req, res) => {
  sendSuccess(res, 200, availableProviders());
};

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  if (!token) throw ApiError.unauthorized("No refresh token provided");

  const decoded = verifyRefreshToken(token);

  const user = await User.findById(decoded.sub).select(
    "+active +passwordChangedAt +tokenVersion",
  );
  if (!user || !user.active || isRevoked(decoded, user)) {
    closeSession(res);
    throw ApiError.unauthorized("Session is no longer valid");
  }
  if (env.REQUIRE_EMAIL_VERIFICATION && user.needsEmailVerification()) {
    throw ApiError.forbidden(
      "Confirmez votre adresse email pour acceder a votre compte.",
      "EMAIL_NOT_VERIFIED",
    );
  }
  if (user.hasChangedPasswordAfter(decoded.iat)) {
    throw ApiError.unauthorized("Password recently changed, please log in again");
  }

  res.cookie(REFRESH_COOKIE, signRefreshToken(user), refreshCookieOptions());
  sendSuccess(res, 200, buildAuthPayload(user));
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = verifyRefreshToken(token);
      await User.updateOne(
        { _id: decoded.sub, tokenVersion: decoded.ver || 0 },
        { $inc: { tokenVersion: 1 } },
      );
    } catch {
    }
  }

  closeSession(res);
  res.status(200).json({ success: true, message: "Logged out successfully" });
});

module.exports = {
  registerUser,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  googleAuth,
  getAuthProviders,
  refresh,
  logout,
};
