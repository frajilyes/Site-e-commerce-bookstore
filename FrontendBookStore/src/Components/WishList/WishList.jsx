import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, removeFromWishlist } from "../../book/bookSlice";
import "./WishList.css";
import { imageSrcSet, optimizedImage } from "../../utils/imageUrl";
import { formatPrice } from "../../utils/format";

import Seo from "../Seo";
const WishList = () => {
  const dispatch = useDispatch();
  const books = useSelector((state) => state.book?.wishlist ?? []);
  const cartItems = useSelector((state) => state.book?.cart ?? []);
  const [pressed, setPressed] = useState(null);

  const removeBook = (id) => {
    dispatch(removeFromWishlist(id));
  };

  const addToCartFromWishlist = (book) => {
    dispatch(
      addToCart({
        id: book.id,
        title: book.title,
        price: book.price,
        image: book.image,
      }),
    );
  };

  const flashPress = (id, type) => {
    setPressed({ id, type });
    setTimeout(() => setPressed(null), 160);
  };

  const getBookQuantity = (bookId) => {
    const item = cartItems.find((item) => item.id === bookId);
    return item ? item.quantity : 0;
  };

  return (
    <div className="wishlist-container">
      <Seo title="Wishlist" path="/wishlist" noindex />
      <div className="overlay"></div>

      <motion.div
        className="wishlist-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <h1>My Favorite Book ❤️</h1>

        {books.length === 0 ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="empty"
          >
            <h3>You haven't a favorite book 📘</h3>
          </motion.div>
        ) : (
          <div className="wishlist-grid">
            <AnimatePresence>
              {books.map((book) => (
                <motion.div
                  key={book.id}
                  className="wishlist-card"
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <img
                    src={optimizedImage(book.image, 480)}
                    srcSet={imageSrcSet(book.image)}
                    sizes="(max-width: 640px) 90vw, 300px"
                    alt={book.title}
                    loading="lazy"
                    decoding="async"
                    width={480}
                    height={320}
                  />
                  <h3>{book.title}</h3>
                  <p>{book.author}</p>
                  <span>{formatPrice(book.price)}</span>

                  <div className="buttons">
                    <button
                      className={`cart-btn ${
                        pressed &&
                        pressed.id === book.id &&
                        pressed.type === "cart"
                          ? "pressed"
                          : ""
                      }`}
                      onMouseDown={() => flashPress(book.id, "cart")}
                      onTouchStart={() => flashPress(book.id, "cart")}
                      onClick={() => addToCartFromWishlist(book)}
                    >
                      Add to Cart 🛒{" "}
                      {getBookQuantity(book.id) > 0 &&
                        `(${getBookQuantity(book.id)})`}
                    </button>

                    <button
                      className={`remove-btn ${
                        pressed &&
                        pressed.id === book.id &&
                        pressed.type === "remove"
                          ? "pressed"
                          : ""
                      }`}
                      onMouseDown={() => flashPress(book.id, "remove")}
                      onTouchStart={() => flashPress(book.id, "remove")}
                      onClick={() => removeBook(book.id)}
                    >
                      Remove ❌
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WishList;
