const ApiError = require("../utils/ApiError");
const { normalizeEmail } = require("../utils/email");
const googleClient = require("../utils/googleClient");

const normaliseName = (name, email) => {
  const trimmed = String(name || "").trim();
  if (trimmed.length >= 2) return trimmed.slice(0, 80);
  return String(email || "").split("@")[0].slice(0, 80) || "Reader";
};

const verifyGoogleToken = async ({ credential, accessToken } = {}) => {
  const claims = await googleClient.getVerifiedClaims({ credential, accessToken });

  if (String(claims.email_verified) !== "true") {
    throw ApiError.unauthorized("This Google account has no verified email address");
  }

  if (!claims.email) {
    throw ApiError.unauthorized("Google did not return an email address");
  }

  return {
    provider: "google",
    providerId: String(claims.sub),
    email: normalizeEmail(claims.email),
    fullName: normaliseName(claims.name, claims.email),
    avatar: claims.picture || undefined,
  };
};

const availableProviders = () => ({ google: googleClient.isEnabled() });

module.exports = { verifyGoogleToken, availableProviders };
