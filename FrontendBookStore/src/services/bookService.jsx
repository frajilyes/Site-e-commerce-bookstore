import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import { adaptBook, adaptBooks, adaptPagination } from "./adapters";

export { createOrder } from "./orderService";

const cache = new Map();

// The cached promise is shared by every caller, so a single consumer unmounting
// must not abort it for the others: cached loaders never receive a caller signal.
const withCache = (key, loader) => {
  if (cache.has(key)) return cache.get(key);
  const promise = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });
  cache.set(key, promise);
  return promise;
};

const toQuery = (params = {}) => {
  const query = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query[key] = value;
  });

  return query;
};

export const listBooks = async (params = {}, { signal } = {}) => {
  const response = await httpClient.get(routes.books.list, {
    params: toQuery(params),
    signal,
  });
  return {
    books: adaptBooks(response.data),
    pagination: adaptPagination(response.meta),
  };
};

export const getBooks = ({ limit = 100 } = {}) =>
  withCache(`books:${limit}`, async () => {
    const { books } = await listBooks({ limit });
    return books;
  });

export const getBookById = async (id, { signal } = {}) => {
  const bookId = String(id);
  const { data } = await httpClient.get(routes.books.detail(bookId), {
    signal,
  });
  return adaptBook(data);
};

export const getFeaturedBooks = ({ limit = 8 } = {}) =>
  withCache(`featured:${limit}`, async () => {
    const { data } = await httpClient.get(routes.books.featured, {
      params: { limit },
    });
    return adaptBooks(data);
  });

export const getBestSellers = ({ limit = 8 } = {}) =>
  withCache(`best-sellers:${limit}`, async () => {
    const { data } = await httpClient.get(routes.books.bestSellers, {
      params: { limit },
    });
    return adaptBooks(data);
  });

export const getCategories = () =>
  withCache("categories", async () => {
    const { data } = await httpClient.get(routes.books.categories);
    return Array.isArray(data) ? data : [];
  });

export const getRelatedBooks = async (id, { signal } = {}) => {
  const { data } = await httpClient.get(routes.books.related(id), { signal });
  return adaptBooks(data);
};

export const searchBooks = (keyword, params = {}, options = {}) =>
  listBooks({ ...params, keyword }, options);

export const createBook = (payload) =>
  httpClient
    .post(routes.books.list, payload)
    .then(({ data }) => adaptBook(data));

export const updateBook = (id, payload) =>
  httpClient
    .patch(routes.books.detail(id), payload)
    .then(({ data }) => adaptBook(data));

export const updateStock = (id, stock) =>
  httpClient
    .patch(routes.books.stock(id), { stock })
    .then(({ data }) => adaptBook(data));

export const deleteBook = (id, { hard = false } = {}) =>
  httpClient
    .delete(routes.books.detail(id), { params: hard ? { hard: "true" } : {} })
    .then(({ meta }) => meta);

export const clearBookCache = () => cache.clear();

const bookService = {
  listBooks,
  getBooks,
  getBookById,
  getFeaturedBooks,
  getBestSellers,
  getCategories,
  getRelatedBooks,
  searchBooks,
  createBook,
  updateBook,
  updateStock,
  deleteBook,
  clearBookCache,
};

export default bookService;
