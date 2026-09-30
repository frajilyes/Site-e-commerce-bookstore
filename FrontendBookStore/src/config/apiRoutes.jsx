
const routes = {
  auth: {
    register: "/auth/register",
    verifyEmail: "/auth/verify-email",
    resendVerification: "/auth/resend-verification",
    login: "/auth/login",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    google: "/auth/google",
    providers: "/auth/providers",
    refresh: "/auth/refresh",
    logout: "/auth/logout",
    me: "/auth/me",
    password: "/auth/me/password",
    addresses: "/auth/me/addresses",
    address: (addressId) => `/auth/me/addresses/${addressId}`,
    users: "/auth/users",
    user: (id) => `/auth/users/${id}`,
  },

  books: {
    list: "/books",
    featured: "/books/featured",
    bestSellers: "/books/best-sellers",
    categories: "/books/categories",
    detail: (id) => `/books/${id}`,
    related: (id) => `/books/${id}/related`,
    stock: (id) => `/books/${id}/stock`,
    reviews: (bookId) => `/books/${bookId}/reviews`,
  },

  reviews: {
    list: "/reviews",
    mine: "/reviews/mine",
    create: "/reviews",
    detail: (id) => `/reviews/${id}`,
  },

  carts: {
    mine: "/carts/me",
    merge: "/carts/me/merge",
    items: "/carts/items",
    item: (bookId) => `/carts/items/${bookId}`,
  },

  wishlists: {
    mine: "/wishlists/me",
    books: "/wishlists/books",
    book: (bookId) => `/wishlists/books/${bookId}`,
  },

  orders: {
    create: "/orders",
    mine: "/orders/my",
    stats: "/orders/stats",
    detail: (id) => `/orders/${id}`,
    cancel: (id) => `/orders/${id}/cancel`,
    status: (id) => `/orders/${id}/status`,
  },

  payments: {
    checkoutSession: "/payments/checkout-session",
    paymentIntent: "/payments/payment-intent",
    session: (sessionId) => `/payments/session/${sessionId}`,
    mine: "/payments/my",
    create: "/payments",
    detail: (id) => `/payments/${id}`,
    refund: (id) => `/payments/${id}/refund`,
  },

  health: "/health",
  index: "/api",
};

export default routes;
