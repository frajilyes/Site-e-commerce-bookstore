const env = require("../config/env");

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

const priceOrder = (items, { discount = 0 } = {}) => {
  const itemsPrice = round(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );

  const shippingPrice =
    itemsPrice >= env.FREE_SHIPPING_THRESHOLD || itemsPrice === 0
      ? 0
      : round(env.SHIPPING_FLAT_RATE);

  const taxPrice = round(itemsPrice * env.TAX_RATE);

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

module.exports = { priceOrder, round };
