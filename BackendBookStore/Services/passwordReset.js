const crypto = require("crypto");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { sendMail } = require("../utils/mailer");
const { passwordResetEmail, passwordChangedEmail } = require("./emailTemplates");

const CODE_LENGTH = 6;

const SELECT_RESET = "+passwordReset +emailVerification +active +tokenVersion +password";

const generateCode = () =>
  String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");

const hashResetCode = (code) =>
  crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(`password-reset:${String(code)}`)
    .digest("hex");

const codeMatches = (code, expectedHash) => {
  if (!expectedHash) return false;
  const candidate = Buffer.from(hashResetCode(code), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
};

const cooldownLeft = (user) => {
  const sentAt = user.passwordReset?.sentAt;
  if (!sentAt) return 0;
  const readyAt = sentAt.getTime() + env.EMAIL_CODE_RESEND_COOLDOWN_S * 1000;
  return Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
};

const issueResetCode = async (user) => {
  if (cooldownLeft(user) > 0) return { sent: false, delivered: false };

  const code = generateCode();

  user.set("passwordReset", {
    codeHash: hashResetCode(code),
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_MIN * 60 * 1000),
    attempts: 0,
    sentAt: new Date(),
  });
  await user.save({ validateBeforeSave: false });

  const delivered = await sendMail({
    to: user.email,
    ...passwordResetEmail({ fullName: user.fullName, email: user.email, code }),
  });

  return { sent: true, delivered };
};

const resetPasswordWithCode = async (user, code, newPassword) => {
  const record = user.passwordReset;

  if (!record?.codeHash || !record.expiresAt) {
    throw ApiError.badRequest(
      "Aucune demande de reinitialisation en cours pour cette adresse. Demandez un nouveau code.",
      undefined,
      "RESET_CODE_MISSING",
    );
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw ApiError.badRequest(
      "Ce code a expire. Demandez-en un nouveau.",
      undefined,
      "RESET_CODE_EXPIRED",
    );
  }

  if ((record.attempts || 0) >= env.EMAIL_CODE_MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "Trop de codes errones. Demandez un nouveau code.",
      undefined,
      "RESET_CODE_BURNED",
    );
  }

  if (!codeMatches(code, record.codeHash)) {
    user.set("passwordReset.attempts", (record.attempts || 0) + 1);
    await user.save({ validateBeforeSave: false });

    const left = env.EMAIL_CODE_MAX_ATTEMPTS - user.passwordReset.attempts;
    throw ApiError.badRequest(
      left > 0
        ? `Code incorrect. Il vous reste ${left} essai${left > 1 ? "s" : ""}.`
        : "Code incorrect. Demandez un nouveau code.",
      [{ field: "code", message: "Code incorrect" }],
      "RESET_CODE_INVALID",
    );
  }

  user.password = newPassword;
  user.set("passwordReset", undefined);
  if (!user.emailVerified) {
    user.emailVerified = true;
    user.emailVerifiedAt = new Date();
  }
  user.set("emailVerification", undefined);
  user.lastLoginAt = new Date();
  await user.save();

  notifyPasswordChanged(user);

  return user;
};

const notifyPasswordChanged = (user) =>
  sendMail({
    to: user.email,
    ...passwordChangedEmail({ fullName: user.fullName, email: user.email }),
  }).catch(() => {});

module.exports = {
  SELECT_RESET,
  issueResetCode,
  resetPasswordWithCode,
  notifyPasswordChanged,
  hashResetCode,
};
