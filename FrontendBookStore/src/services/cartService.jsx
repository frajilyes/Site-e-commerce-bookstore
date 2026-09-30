import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import { adaptCart } from "./adapters";


export const getMyCart = ({ signal } = {}) =>
  httpClient.get(routes.carts.mine, { signal }).then(({ data }) => adaptCart(data));

export const addItem = (bookId, quantity = 1) =>
  httpClient
    .post(routes.carts.items, { bookId, quantity })
    .then(({ data }) => adaptCart(data));

export const updateItem = (bookId, quantity) =>
  httpClient
    .patch(routes.carts.item(bookId), { quantity })
    .then(({ data }) => adaptCart(data));

export const removeItem = (bookId) =>
  httpClient.delete(routes.carts.item(bookId)).then(({ data }) => adaptCart(data));

export const clearCart = () =>
  httpClient.delete(routes.carts.mine).then(({ data }) => adaptCart(data));

export const mergeCart = (items = []) => {
  const payload = items
    .map((item) => ({
      bookId: String(item.bookId ?? item.id ?? ""),
      quantity: Math.max(Number(item.quantity) || 1, 1),
    }))
    .filter((item) => /^[a-f\d]{24}$/i.test(item.bookId));

  if (payload.length === 0) return getMyCart();

  return httpClient
    .post(routes.carts.merge, { items: payload })
    .then(({ data }) => adaptCart(data));
};

const cartService = {
  getMyCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
  mergeCart,
};

export default cartService;
