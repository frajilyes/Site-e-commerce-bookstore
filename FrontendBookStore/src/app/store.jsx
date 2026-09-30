import { configureStore } from "@reduxjs/toolkit";
import bookReducer from "../book/bookSlice";
import { createStateSaver, loadState } from "./persistState";

const store = configureStore({
  reducer: {
    book: bookReducer,
  },
  preloadedState: loadState(),
  devTools: process.env.NODE_ENV !== "production",
});

store.subscribe(createStateSaver(store.getState));

export default store;
