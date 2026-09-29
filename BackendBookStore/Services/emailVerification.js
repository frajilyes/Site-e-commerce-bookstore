const crypto = require("crypto");
const env = require("../config/env");
const ApiError = require("../utils/ApiError");
const { sendMail } = require("../utils/mailer");
const { verificationEmail, welcomeEmail } = require("./emailTemplates");

const CODE_LENGTH = 6;

const SELECT_VERIFICATION = "+emailVerification +active +tokenVersion";

const generateCode = () =>
  String(crypto.randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");

const hashCode = (code) =>
  crypto.createHmac("sha256", env.JWT_SECRET).update(String(code)).digest("hex");

const codeMatches = (code, expectedHash) => {
  if (!expectedHash) return false;
  const candidate = Buffer.from(hashCode(code), "utf8");
  const expected = Buffer.from(expectedHash, "utf8");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
};

const secondsUntil = (date) => Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));

const cooldownLeft = (user) => {
  const sentAt = user.emailVerification?.sentAt;
  if (!sentAt) return 0;
  const readyAt = new Date(sentAt.getTime() + env.EMAIL_CODE_RESEND_COOLDOWN_S * 1000);
  return secondsUntil(readyAt);
};

const issueCode = async (user, { throwOnCooldown = false } = {}) => {
  const retryAfter = cooldownLeft(user);

  if (retryAfter > 0) {
    if (throwOnCooldown) {
      throw new ApiError(
        429,
        `Un code vient d'etre envoye. Reessayez dans ${retryAfter} secondes.`,
        undefined,
        "VERIFICATION_COOLDOWN",
      );
    }
    return { sent: false, delivered: false, retryAfter };
  }

  const code = generateCode();

  user.set("emailVerification", {
    codeHash: hashCode(code),
    expiresAt: new Date(Date.now() + env.EMAIL_CODE_TTL_MIN * 60 * 1000),
    attempts: 0,
    sentAt: new Date(),
  });
  await user.save({ validateBeforeSave: false });

  const delivered = await sendMail({
    to: user.email,
    ...verificationEmail({ fullName: user.fullName, email: user.email, code }),
  });

  return {
    sent: true,
    delivered,
    retryAfter: env.EMAIL_CODE_RESEND_COOLDOWN_S,
  };
};

const confirmCode = async (user, code) => {
  const record = user.emailVerification;

  if (!record?.codeHash || !record.expiresAt) {
    throw new ApiError(
      400,
      "Aucun code en attente pour cette adresse. Demandez-en un nouveau.",
      undefined,
      "VERIFICATION_CODE_MISSING",
    );
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(
      400,
      "Ce code a expire. Demandez-en un nouveau.",
      undefined,
      "VERIFICATION_CODE_EXPIRED",
    );
  }

  if ((record.attempts || 0) >= env.EMAIL_CODE_MAX_ATTEMPTS) {
    throw new ApiError(
      429,
      "Trop de codes errones. Demandez un nouveau code.",
      undefined,
      "VERIFICATION_CODE_BURNED",
    );
  }

  if (!codeMatches(code, record.codeHash)) {
    user.set("emailVerification.attempts", (record.attempts || 0) + 1);
    await user.save({ validateBeforeSave: false });

    const left = env.EMAIL_CODE_MAX_ATTEMPTS - user.emailVerification.attempts;
    throw new ApiError(
      400,
      left > 0
        ? `Code incorrect. Il vous reste ${left} essai${left > 1 ? "s" : ""}.`
        : "Code incorrect. Demandez un nouveau code.",
      [{ field: "code", message: "Code incorrect" }],
      "VERIFICATION_CODE_INVALID",
    );
  }

  user.emailVerified = true;
  user.emailVerifiedAt = new Date();
  user.set("emailVerification", undefined);
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  sendMail({
    to: user.email,
    ...welcomeEmail({ fullName: user.fullName, email: user.email }),
  }).catch(() => {});

  return user;
};

module.exports = {
  SELECT_VERIFICATION,
  issueCode,
  confirmCode,
  cooldownLeft,
  hashCode,
};
