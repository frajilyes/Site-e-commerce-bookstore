import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import { adaptPagination, adaptReviews, adaptReview } from "./adapters";


export const getBookReviews = async (bookId, params = {}, { signal } = {}) => {
  const response = await httpClient.get(routes.books.reviews(bookId), {
    params,
    signal,
  });
  return {
    reviews: adaptReviews(response.data),
    pagination: adaptPagination(response.meta),
  };
};

export const getMyReviews = ({ signal } = {}) =>
  httpClient
    .get(routes.reviews.mine, { signal })
    .then(({ data }) => adaptReviews(data));

export const createReview = (bookId, { rating, comment, title }) =>
  httpClient
    .post(routes.books.reviews(bookId), {
      rating,
      comment,
      ...(title ? { title } : {}),
    })
    .then(({ data }) => adaptReview(data));

export const updateReview = (reviewId, updates) =>
  httpClient
    .patch(routes.reviews.detail(reviewId), updates)
    .then(({ data }) => adaptReview(data));

export const deleteReview = (reviewId) =>
  httpClient.delete(routes.reviews.detail(reviewId)).then(({ meta }) => meta);

export const submitReviews = async (entries = []) => {
  const results = { saved: [], failed: [] };

  for (const entry of entries) {
    const bookId = String(entry.bookId ?? entry.id ?? "");
    if (!/^[a-f\d]{24}$/i.test(bookId)) {
      results.failed.push({ bookId, message: "Identifiant de livre non reconnu" });
      continue;
    }

    try {
      results.saved.push(await createReview(bookId, entry));
    } catch (error) {
      if (error.status === 409 && entry.reviewId) {
        try {
          results.saved.push(await updateReview(entry.reviewId, entry));
          continue;
        } catch (updateError) {
          results.failed.push({ bookId, message: updateError.message });
          continue;
        }
      }
      results.failed.push({ bookId, message: error.message });
    }
  }

  return results;
};

const reviewService = {
  getBookReviews,
  getMyReviews,
  createReview,
  updateReview,
  deleteReview,
  submitReviews,
};

export default reviewService;
