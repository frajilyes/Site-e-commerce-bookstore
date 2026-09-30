import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import { adaptWishlist } from "./adapters";

export const getMyWishlist = ({ signal } = {}) =>
  httpClient
    .get(routes.wishlists.mine, { signal })
    .then(({ data }) => adaptWishlist(data));

export const addBook = (bookId) =>
  httpClient
    .post(routes.wishlists.book(bookId))
    .then(({ data }) => adaptWishlist(data));

export const removeBook = (bookId) =>
  httpClient
    .delete(routes.wishlists.book(bookId))
    .then(({ data }) => adaptWishlist(data));

export const clearWishlist = () =>
  httpClient
    .delete(routes.wishlists.mine)
    .then(({ data }) => adaptWishlist(data));

export const syncWishlist = async (books = []) => {
  const ids = books
    .map((book) => String(book.bookId ?? book.id ?? ""))
    .filter((id) => /^[a-f\d]{24}$/i.test(id));

  for (const id of ids) {
    try {
      await addBook(id);
    } catch (error) {
    }
  }

  return getMyWishlist();
};

const wishlistService = {
  getMyWishlist,
  addBook,
  removeBook,
  clearWishlist,
  syncWishlist,
};

export default wishlistService;
