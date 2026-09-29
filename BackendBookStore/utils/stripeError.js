const ApiError = require("./ApiError");

const STRIPE_ERROR_CODES = {
  NOT_CONFIGURED: "STRIPE_NOT_CONFIGURED",
  CARD_DECLINED: "STRIPE_CARD_DECLINED",
  INVALID_REQUEST: "STRIPE_INVALID_REQUEST",
  RATE_LIMITED: "STRIPE_RATE_LIMITED",
  UNAVAILABLE: "STRIPE_UNAVAILABLE",
  SIGNATURE_INVALID: "STRIPE_SIGNATURE_INVALID",
  IDEMPOTENCY_CONFLICT: "STRIPE_IDEMPOTENCY_CONFLICT",
};

const DECLINED_FALLBACK =
  "Votre banque a refuse ce paiement. Essayez une autre carte ou contactez-la.";

const MAPPING = {
  StripeCardError: [402, STRIPE_ERROR_CODES.CARD_DECLINED, null],

  StripeInvalidRequestError: [
    400,
    STRIPE_ERROR_CODES.INVALID_REQUEST,
    "Cette demande de paiement a ete rejetee. Reprenez la commande depuis votre panier.",
  ],

  StripeAuthenticationError: [
    503,
    STRIPE_ERROR_CODES.NOT_CONFIGURED,
    "Payments are misconfigured on this server: Stripe rejected the API key.",
  ],
  StripePermissionError: [
    503,
    STRIPE_ERROR_CODES.NOT_CONFIGURED,
    "Payments are misconfigured on this server: this Stripe key lacks the required permissions.",
  ],

  StripeRateLimitError: [
    429,
    STRIPE_ERROR_CODES.RATE_LIMITED,
    "Trop de demandes de paiement en meme temps. Patientez quelques secondes.",
  ],

  StripeConnectionError: [
    503,
    STRIPE_ERROR_CODES.UNAVAILABLE,
    "Le service de paiement est momentanement injoignable. Votre commande est enregistree, reessayez dans un instant.",
  ],
  StripeAPIError: [
    502,
    STRIPE_ERROR_CODES.UNAVAILABLE,
    "Le service de paiement rencontre un incident. Votre commande est enregistree, reessayez dans un instant.",
  ],

  StripeSignatureVerificationError: [
    400,
    STRIPE_ERROR_CODES.SIGNATURE_INVALID,
    "Webhook signature verification failed",
  ],

  StripeIdempotencyError: [
    409,
    STRIPE_ERROR_CODES.IDEMPOTENCY_CONFLICT,
    "Un paiement est deja en cours pour cette commande. Rafraichissez la page.",
  ],
};

const UNKNOWN = [
  502,
  STRIPE_ERROR_CODES.UNAVAILABLE,
  "Le service de paiement a renvoye une erreur inattendue.",
];

const isStripeError = (error) =>
  Boolean(error) && typeof error.type === "string" && error.type.startsWith("Stripe");

const toApiError = (error) => {
  const [statusCode, code, message] = MAPPING[error.type] || UNKNOWN;

  const apiError = new ApiError(
    statusCode,
    message || error.message || DECLINED_FALLBACK,
    undefined,
    code,
  );

  apiError.stripe = {
    type: error.type,
    code: error.code,
    declineCode: error.decline_code,
    requestId: error.requestId,
  };

  return apiError;
};

const notConfigured = () =>
  new ApiError(
    503,
    "Payments are not configured. Set STRIPE_SECRET_KEY in your .env file.",
    undefined,
    STRIPE_ERROR_CODES.NOT_CONFIGURED,
  );

const webhookNotConfigured = () =>
  new ApiError(
    503,
    "Webhooks are not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.",
    undefined,
    STRIPE_ERROR_CODES.NOT_CONFIGURED,
  );

module.exports = {
  STRIPE_ERROR_CODES,
  isStripeError,
  toApiError,
  notConfigured,
  webhookNotConfigured,
};
