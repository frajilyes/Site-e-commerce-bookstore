import { createSelector } from "@reduxjs/toolkit";
import { priceOrder, SHIPPING_FLAT_RATE } from "../utils/pricing";

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export const SHIPPING_PRICE = SHIPPING_FLAT_RATE;

export const selectCart = (state) => state.book?.cart ?? EMPTY_ARRAY;
export const selectWishlist = (state) => state.book?.wishlist ?? EMPTY_ARRAY;
export const selectRatings = (state) => state.book?.ratings ?? EMPTY_OBJECT;
export const selectReviews = (state) => state.book?.reviews ?? EMPTY_OBJECT;
export const selectLastOrder = (state) => state.book?.lastOrder ?? null;

export const selectCartCount = createSelector([selectCart], (cart) =>
  cart.reduce((total, item) => total + (item.quantity ?? 0), 0),
);

export const selectCartSubtotal = createSelector([selectCart], (cart) =>
  cart.reduce((total, item) => total + item.price * item.quantity, 0),
);

export const selectCartTotal = createSelector(
  [selectCart],
  (cart) => priceOrder(cart).totalPrice,
);

export const selectCartTotals = createSelector([selectCart], (cart) =>
  priceOrder(cart),
);

export const selectCartQuantityById = createSelector([selectCart], (cart) => {
  const map = new Map();
  cart.forEach((item) => map.set(item.id, item.quantity ?? 0));
  return map;
});

export const selectWishlistIds = createSelector([selectWishlist], (wishlist) => {
  const ids = new Set();
  wishlist.forEach((item) => ids.add(item.id));
  return ids;
});
