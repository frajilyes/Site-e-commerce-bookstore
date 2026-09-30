import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cart: [],
  wishlist: [],
  ratings: {},
  reviews: {},
  lastOrder: null,
};

const bookSlice = createSlice({
  name: "book",
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const existingBook = state.cart.find(
        (item) => item.id === action.payload.id,
      );

      if (existingBook) {
        existingBook.quantity += 1;
      } else {
        state.cart.push({ ...action.payload, quantity: 1 });
      }
    },
    addToWishlist: (state, action) => {
      const exists = state.wishlist.some(
        (item) => item.id === action.payload.id,
      );
      if (!exists) {
        state.wishlist.push(action.payload);
      }
    },
    removeFromWishlist: (state, action) => {
      state.wishlist = state.wishlist.filter(
        (item) => item.id !== action.payload,
      );
    },
    setRating: (state, action) => {
      state.ratings[action.payload.id] = action.payload.rating;
    },
    incrementQuantity: (state, action) => {
      const book = state.cart.find((item) => item.id === action.payload);
      if (book) book.quantity += 1;
    },

    decrementQuantity: (state, action) => {
      const book = state.cart.find((item) => item.id === action.payload);
      if (book && book.quantity > 1) book.quantity -= 1;
    },

    removeFromCart: (state, action) => {
      state.cart = state.cart.filter((item) => item.id !== action.payload);
    },
    clearCart: (state) => {
      state.cart = [];
    },

    setCart: (state, action) => {
      state.cart = Array.isArray(action.payload) ? action.payload : [];
    },

    setWishlist: (state, action) => {
      state.wishlist = Array.isArray(action.payload) ? action.payload : [];
    },

    placeOrder: (state, action) => {
      const { id, items = [], total, paidAt } = action.payload;
      state.lastOrder = {
        id,
        total,
        paidAt,
        items: items.map((item) => ({
          id: item.id,
          title: item.title,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
        })),
      };
      state.cart = [];
    },

    saveReviews: (state, action) => {
      const { reviews = [], submittedAt, orderId = null } = action.payload;
      reviews.forEach(({ id, rating, comment }) => {
        state.reviews[id] = {
          rating,
          comment: comment?.trim() ?? "",
          submittedAt,
          orderId,
        };
        state.ratings[id] = rating;
      });
    },
  },
});

export const {
  addToCart,
  incrementQuantity,
  decrementQuantity,
  removeFromCart,
  addToWishlist,
  removeFromWishlist,
  setRating,
  clearCart,
  setCart,
  setWishlist,
  placeOrder,
  saveReviews,
} = bookSlice.actions;

export default bookSlice.reducer;
