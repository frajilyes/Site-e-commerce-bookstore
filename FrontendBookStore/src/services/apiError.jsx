export const API_ERROR_CODES = {
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  VERIFICATION_CODE_MISSING: "VERIFICATION_CODE_MISSING",
  VERIFICATION_CODE_EXPIRED: "VERIFICATION_CODE_EXPIRED",
  VERIFICATION_CODE_INVALID: "VERIFICATION_CODE_INVALID",
  VERIFICATION_CODE_BURNED: "VERIFICATION_CODE_BURNED",
  VERIFICATION_COOLDOWN: "VERIFICATION_COOLDOWN",
  USE_SOCIAL_LOGIN: "USE_SOCIAL_LOGIN",
  NO_LOCAL_PASSWORD: "NO_LOCAL_PASSWORD",

  GOOGLE_AUTH_DISABLED: "GOOGLE_AUTH_DISABLED",
  GOOGLE_UNREACHABLE: "GOOGLE_UNREACHABLE",

  STRIPE_NOT_CONFIGURED: "STRIPE_NOT_CONFIGURED",
  STRIPE_CARD_DECLINED: "STRIPE_CARD_DECLINED",
  STRIPE_INVALID_REQUEST: "STRIPE_INVALID_REQUEST",
  STRIPE_RATE_LIMITED: "STRIPE_RATE_LIMITED",
  STRIPE_UNAVAILABLE: "STRIPE_UNAVAILABLE",
  STRIPE_SIGNATURE_INVALID: "STRIPE_SIGNATURE_INVALID",
  STRIPE_IDEMPOTENCY_CONFLICT: "STRIPE_IDEMPOTENCY_CONFLICT",
};

const PAYMENT_UNAVAILABLE = new Set([
  API_ERROR_CODES.STRIPE_NOT_CONFIGURED,
  API_ERROR_CODES.STRIPE_UNAVAILABLE,
]);

const PAYMENT_REFUSED = new Set([
  API_ERROR_CODES.STRIPE_CARD_DECLINED,
  API_ERROR_CODES.STRIPE_INVALID_REQUEST,
  API_ERROR_CODES.STRIPE_RATE_LIMITED,
  API_ERROR_CODES.STRIPE_IDEMPOTENCY_CONFLICT,
]);

const NETWORK_MESSAGE =
  "Impossible de joindre le serveur. Verifiez que le BackendBookStore tourne sur " +
  "le port configure dans REACT_APP_API_URL.";

export class ApiError extends Error {
  constructor(
    message,
    { status = 0, code = "error", details = [], cause } = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }

  get needsEmailVerification() {
    return this.code === API_ERROR_CODES.EMAIL_NOT_VERIFIED;
  }

  get needsSocialLogin() {
    return (
      this.code === API_ERROR_CODES.USE_SOCIAL_LOGIN ||
      this.code === API_ERROR_CODES.NO_LOCAL_PASSWORD
    );
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  get isNotFound() {
    return this.status === 404;
  }

  get isValidationError() {
    return this.status === 422 || this.status === 400;
  }

  get isPaymentError() {
    return typeof this.code === "string" && this.code.startsWith("STRIPE_");
  }

  get isPaymentUnavailable() {
    if (PAYMENT_REFUSED.has(this.code)) return false;
    return (
      PAYMENT_UNAVAILABLE.has(this.code) ||
      this.status === 503 ||
      (this.isNetworkError && this.code !== "cancelled")
    );
  }

  get isPaymentRefused() {
    return PAYMENT_REFUSED.has(this.code);
  }

  get isCardDeclined() {
    return this.code === API_ERROR_CODES.STRIPE_CARD_DECLINED;
  }

  get fieldMessages() {
    return this.details.map((detail) =>
      detail.field ? `${detail.field}: ${detail.message}` : detail.message,
    );
  }

  get displayMessages() {
    return this.fieldMessages.length ? this.fieldMessages : [this.message];
  }
}

const toDetails = (body) => {
  const raw = body?.errors;
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    field: item.field || item.path || item.param || "",
    message: item.message || item.msg || "Invalid value",
  }));
};

export const toApiError = (error) => {
  if (error instanceof ApiError) return error;

  if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
    return new ApiError("Request cancelled", {
      status: 0,
      code: "cancelled",
      cause: error,
    });
  }

  const response = error?.response;

  if (!response) {
    const timedOut = error?.code === "ECONNABORTED";
    return new ApiError(timedOut ? "La requete a expire." : NETWORK_MESSAGE, {
      status: 0,
      code: timedOut ? "timeout" : "network",
      cause: error,
    });
  }

  const body = response.data;

  return new ApiError(
    body?.message || error.message || "Une erreur inattendue est survenue.",
    {
      status: response.status,
      code: body?.code || body?.status || "error",
      details: toDetails(body),
      cause: error,
    },
  );
};

export default ApiError;
