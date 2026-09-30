import env from "../config/env";

export const SHIPPING_FLAT_RATE = env.shippingFlatRate;
export const FREE_SHIPPING_THRESHOLD = env.freeShippingThreshold;
export const TAX_RATE = env.taxRate;

export const round = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const priceOrder = (items = [], { discount = 0 } = {}) => {
  const itemsPrice = round(
    items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
      0,
    ),
  );

  const shippingPrice =
    itemsPrice >= env.freeShippingThreshold || itemsPrice === 0
      ? 0
      : round(env.shippingFlatRate);

  const taxPrice = round(itemsPrice * env.taxRate);

  const safeDiscount = round(Math.min(Math.max(discount, 0), itemsPrice));

  const totalPrice = round(itemsPrice + shippingPrice + taxPrice - safeDiscount);

  return {
    itemsPrice,
    shippingPrice,
    taxPrice,
    discount: safeDiscount,
    totalPrice,
  };
};

export const amountToFreeShipping = (itemsPrice) =>
  Math.max(round(env.freeShippingThreshold - itemsPrice), 0);

export default priceOrder;
