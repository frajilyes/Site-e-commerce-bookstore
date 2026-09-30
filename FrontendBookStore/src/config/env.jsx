const trimSlashes = (value) => String(value).replace(/\/+$/, "");

const toNumber = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const rawApiUrl = process.env.REACT_APP_API_URL || "/api";
const apiUrl = trimSlashes(rawApiUrl);

const serverUrl = trimSlashes(
  process.env.REACT_APP_SERVER_URL || apiUrl.replace(/\/api$/, ""),
);

const siteUrl = trimSlashes(
  process.env.REACT_APP_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : ""),
);

const env = {
  apiUrl,
  serverUrl,
  siteUrl,
  apiTimeout: toNumber(process.env.REACT_APP_API_TIMEOUT, 10000),
  useLocalFallback: process.env.REACT_APP_USE_LOCAL_FALLBACK
    ? process.env.REACT_APP_USE_LOCAL_FALLBACK !== "false"
    : process.env.NODE_ENV !== "production",
  isProduction: process.env.NODE_ENV === "production",

  currency: (process.env.REACT_APP_CURRENCY || "USD").toUpperCase(),
  taxRate: toNumber(process.env.REACT_APP_TAX_RATE, 0),
  shippingFlatRate: toNumber(process.env.REACT_APP_SHIPPING_FLAT_RATE, 4.99),
  freeShippingThreshold: toNumber(
    process.env.REACT_APP_FREE_SHIPPING_THRESHOLD,
    50,
  ),
  defaultPageSize: toNumber(process.env.REACT_APP_DEFAULT_PAGE_SIZE, 12),

  stripePublishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "",

  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || "",
};

export default env;
