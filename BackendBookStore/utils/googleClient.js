const env = require("../config/env");
const ApiError = require("./ApiError");

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

const TIMEOUT_MS = 8000;

const isEnabled = () => env.googleAuthEnabled;

const requireEnabled = () => {
  if (!isEnabled()) {
    throw new ApiError(
      503,
      "Google sign-in is not configured on this server",
      undefined,
      "GOOGLE_AUTH_DISABLED",
    );
  }
};

const fetchJson = async (url, options = {}) => {
  let response;

  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw new ApiError(
      503,
      "The identity provider is unreachable, please retry",
      undefined,
      "GOOGLE_UNREACHABLE",
    );
  }

  const body = await response.json().catch(() => ({}));
  return { ok: response.ok, body };
};

const fetchTokenInfo = async ({ credential, accessToken } = {}) => {
  const isIdToken = Boolean(credential);
  const parameter = isIdToken
    ? `id_token=${encodeURIComponent(credential)}`
    : `access_token=${encodeURIComponent(accessToken)}`;

  const { ok, body } = await fetchJson(`${TOKENINFO_URL}?${parameter}`);
  if (!ok) throw ApiError.unauthorized("Invalid or expired Google token");

  return { isIdToken, claims: body };
};

const fetchUserInfo = async (accessToken) => {
  const { ok, body } = await fetchJson(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!ok) throw ApiError.unauthorized("Could not read the Google profile");
  return body;
};

const assertIssuedForUs = (claims, { isIdToken }) => {
  const audience = claims.aud || claims.azp;

  if (audience !== env.GOOGLE_CLIENT_ID) {
    throw ApiError.unauthorized("This Google token was issued for another application");
  }

  if (isIdToken && claims.iss && !ISSUERS.has(claims.iss)) {
    throw ApiError.unauthorized("Unexpected Google token issuer");
  }
};

const getVerifiedClaims = async ({ credential, accessToken } = {}) => {
  requireEnabled();

  if (!credential && !accessToken) {
    throw ApiError.badRequest("A Google credential or access token is required");
  }

  const { isIdToken, claims } = await fetchTokenInfo({ credential, accessToken });
  assertIssuedForUs(claims, { isIdToken });

  if (isIdToken) return claims;

  return { ...claims, ...(await fetchUserInfo(accessToken)) };
};

module.exports = {
  isEnabled,
  requireEnabled,
  fetchTokenInfo,
  fetchUserInfo,
  assertIssuedForUs,
  getVerifiedClaims,
};
