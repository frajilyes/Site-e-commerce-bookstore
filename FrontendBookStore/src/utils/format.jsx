import env from "../config/env";

const buildFormatter = (currency) => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency });
  } catch (error) {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
  }
};

const currencyFormatter = buildFormatter(env.currency);

export const formatPrice = (value) => currencyFormatter.format(Number(value) || 0);

export const discountPercent = (price, oldPrice) => {
  if (!oldPrice || oldPrice <= price) return 0;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
};

export const formatDateTime = (value) => {
  if (!value) return "N/A";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};
