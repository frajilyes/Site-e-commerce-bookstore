import env from "../config/env";
import { resolveImage } from "../utils/imageUrl";

export const BADGES = [
  "Best Seller",
  "Popular",
  "Hot",
  "New",
  "Sale",
  "Classic",
  "",
];

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
  "failed",
];

export const PAYMENT_METHODS = [
  "Stripe",
  "Visa",
  "MasterCard",
  "PayPal",
  "American Express",
  "CashOnDelivery",
];

const identifier = (doc) => doc?._id ?? doc?.id ?? null;

export const adaptBook = (book) => {
  if (!book) return null;

  const id = identifier(book);
  const stock = Number(book.stock) || 0;

  return {
    ...book,
    id,
    _id: book._id ?? id,
    slug: book.slug ?? null,
    title: book.title ?? "",
    author: book.author ?? "",
    description: book.description ?? "",
    price: Number(book.price) || 0,
    oldPrice: Number(book.oldPrice) || 0,
    image: resolveImage(book.image),
    category: book.category ?? "",
    badge: book.badge ?? "",
    rating: Number(book.rating) || 0,
    numReviews: Number(book.numReviews) || 0,
    stock,
    inStock: book.inStock ?? stock > 0,
    discountPercentage: Number(book.discountPercentage) || 0,
  };
};

export const adaptBooks = (books) =>
  Array.isArray(books) ? books.map(adaptBook).filter(Boolean) : [];

export const adaptCartItem = (item) => {
  const book = item?.book;
  const populated = book && typeof book === "object";
  const bookId = populated ? identifier(book) : (book ?? null);

  return {
    id: bookId,
    bookId,
    title: populated ? book.title : (item?.title ?? ""),
    author: populated ? book.author : (item?.author ?? ""),
    image: resolveImage(populated ? book.image : item?.image),
    slug: populated ? (book.slug ?? null) : null,
    stock: populated ? Number(book.stock) || 0 : undefined,
    price: Number(item?.price) || 0,
    quantity: Number(item?.quantity) || 0,
  };
};

export const adaptCart = (cart) => ({
  id: identifier(cart),
  items: Array.isArray(cart?.items) ? cart.items.map(adaptCartItem) : [],
  coupon: cart?.coupon ?? null,
  discount: Number(cart?.discount) || 0,
  totalItems: Number(cart?.totalItems) || 0,
  subtotal: Number(cart?.subtotal) || 0,
  total: Number(cart?.total) || 0,
});

export const adaptWishlist = (wishlist) => ({
  id: identifier(wishlist),
  books: adaptBooks(wishlist?.books),
});

export const adaptOrderItem = (item) => {
  const bookId = item?.book?._id ?? item?.book ?? null;

  return {
    id: bookId,
    bookId,
    title: item?.title ?? "",
    author: item?.author ?? "",
    image: resolveImage(item?.image),
    price: Number(item?.price) || 0,
    quantity: Number(item?.quantity) || 0,
  };
};

export const adaptOrder = (order) => {
  if (!order) return null;

  const id = identifier(order);

  return {
    ...order,
    id,
    _id: order._id ?? id,
    orderNumber: order.orderNumber ?? null,
    items: Array.isArray(order.items) ? order.items.map(adaptOrderItem) : [],
    itemsPrice: Number(order.itemsPrice) || 0,
    shippingPrice: Number(order.shippingPrice) || 0,
    taxPrice: Number(order.taxPrice) || 0,
    discount: Number(order.discount) || 0,
    total: Number(order.totalPrice) || 0,
    totalPrice: Number(order.totalPrice) || 0,
    currency: order.currency || env.currency,
    status: order.status ?? "pending",
    isPaid: Boolean(order.isPaid),
    paidAt: order.paidAt ?? order.createdAt ?? null,
  };
};

export const adaptOrders = (orders) =>
  Array.isArray(orders) ? orders.map(adaptOrder).filter(Boolean) : [];

export const adaptReview = (review) => {
  if (!review) return null;

  const book = review.book;
  const populated = book && typeof book === "object";

  return {
    ...review,
    id: identifier(review),
    bookId: populated ? identifier(book) : (book ?? null),
    bookTitle: populated ? book.title : undefined,
    rating: Number(review.rating) || 0,
    title: review.title ?? "",
    comment: review.comment ?? "",
    verifiedPurchase: Boolean(review.verifiedPurchase),
    submittedAt: review.createdAt ?? null,
  };
};

export const adaptReviews = (reviews) =>
  Array.isArray(reviews) ? reviews.map(adaptReview).filter(Boolean) : [];

export const adaptPayment = (payment) => {
  if (!payment) return null;

  return {
    ...payment,
    id: identifier(payment),
    amount: Number(payment.amount) || 0,
    currency: payment.currency || env.currency,
    status: payment.status ?? "pending",
  };
};

export const adaptPagination = (meta = {}) => ({
  total: Number(meta.total) || 0,
  page: Number(meta.page) || 1,
  limit: Number(meta.limit) || env.defaultPageSize,
  totalPages: Number(meta.totalPages) || 1,
  hasNextPage: Boolean(meta.hasNextPage),
  hasPrevPage: Boolean(meta.hasPrevPage),
});
