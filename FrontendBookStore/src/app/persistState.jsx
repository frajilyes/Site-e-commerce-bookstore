const STORAGE_KEY = "bookstore:state";
const LEGACY_RATINGS_KEY = "bookRatings";
const SAVE_DELAY = 500;

const SESSION_FLAG_KEY = "bookstore:sessionActive";
const AUTH_KEY = "userSession";
const CHECKOUT_FORM_KEY = "checkoutFormData";

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readLegacyRatings = () => {
  try {
    const saved = localStorage.getItem(LEGACY_RATINGS_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    return isPlainObject(parsed) ? parsed : {};
  } catch (error) {
    return {};
  }
};

const resetOnNewSession = () => {
  try {
    if (sessionStorage.getItem(SESSION_FLAG_KEY)) return;
    sessionStorage.setItem(SESSION_FLAG_KEY, "1");
  } catch (error) {
    return;
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    if (isPlainObject(parsed?.book)) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...parsed, book: { ...parsed.book, cart: [], wishlist: [] } }),
      );
    }
  } catch (error) {
  }

  try {
    localStorage.removeItem(AUTH_KEY);
  } catch (error) {
  }

  try {
    sessionStorage.removeItem(CHECKOUT_FORM_KEY);
  } catch (error) {
  }
};

const write = (state) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        book: {
          cart: state.book.cart,
          wishlist: state.book.wishlist,
          ratings: state.book.ratings,
          reviews: state.book.reviews,
          lastOrder: state.book.lastOrder,
        },
      }),
    );
  } catch (error) {
  }
};

resetOnNewSession();

export const loadState = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : null;
    const book = isPlainObject(parsed?.book) ? parsed.book : null;
    const legacyRatings = readLegacyRatings();

    if (!book) {
      return Object.keys(legacyRatings).length
        ? {
            book: {
              cart: [],
              wishlist: [],
              ratings: legacyRatings,
              reviews: {},
              lastOrder: null,
            },
          }
        : undefined;
    }

    return {
      book: {
        cart: Array.isArray(book.cart) ? book.cart : [],
        wishlist: Array.isArray(book.wishlist) ? book.wishlist : [],
        ratings: isPlainObject(book.ratings)
          ? { ...legacyRatings, ...book.ratings }
          : legacyRatings,
        reviews: isPlainObject(book.reviews) ? book.reviews : {},
        lastOrder: isPlainObject(book.lastOrder) ? book.lastOrder : null,
      },
    };
  } catch (error) {
    return undefined;
  }
};

export const createStateSaver = (getState) => {
  let timer = null;
  let scheduled = null;
  const schedule =
    typeof window.requestIdleCallback === "function"
      ? window.requestIdleCallback
      : (cb) => setTimeout(cb, 0);
  const cancel =
    typeof window.cancelIdleCallback === "function"
      ? window.cancelIdleCallback
      : clearTimeout;

  const flush = () => {
    const state = getState();
    if (state?.book) write(state);
  };

  const save = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (scheduled) cancel(scheduled);
      scheduled = schedule(flush);
    }, SAVE_DELAY);
  };

  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });

  return save;
};
