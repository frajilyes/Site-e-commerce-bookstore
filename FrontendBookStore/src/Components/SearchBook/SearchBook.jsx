import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import "./SearchBook.css";
import useBooks from "../../hooks/useBooks";
import useDebounce from "../../hooks/useDebounce";
import { imageSrcSet, optimizedImage } from "../../utils/imageUrl";
import { formatPrice } from "../../utils/format";
import StarRating from "../StarRating/StarRating";
import Loader from "../Loader/Loader";
import Seo from "../Seo";
import {
  addToCart,
  addToWishlist,
  removeFromWishlist,
} from "../../book/bookSlice";

const SearchBooks = () => {
  const dispatch = useDispatch();
  const { books, isLoading, error } = useBooks();
  const cart = useSelector((state) => state.book?.cart ?? []);
  const wishlist = useSelector((state) => state.book?.wishlist ?? []);
  const ratings = useSelector((state) => state.book?.ratings ?? {});

  const [search, setSearch] = useState("");
  const [hasInteracted, setHasInteracted] = useState(false);
  const debouncedSearch = useDebounce(search, 200);

  const handleAddToCart = (book) => {
    dispatch(
      addToCart({
        id: book.id,
        title: book.title,
        price: book.price,
        image: book.image,
      }),
    );
  };

  const filteredBooks = useMemo(
    () =>
      books.filter((book) => {
        const searchLower = debouncedSearch.toLowerCase();
        return (
          book.title.toLowerCase().includes(searchLower) ||
          book.author.toLowerCase().includes(searchLower) ||
          book.category.toLowerCase().includes(searchLower)
        );
      }),
    [books, debouncedSearch],
  );

  const shouldShowResults = hasInteracted && search.trim().length > 0;

  return (
    <div className="search-container">
      <Seo title="Search books" path="/search" noindex />
      <div className="overlay"></div>

      <motion.div
        className="search-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.h1
          initial={{ y: -50 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Search Your Favorite Books 📘
        </motion.h1>

        <motion.input
          onFocus={() => setHasInteracted(true)}
          onKeyDown={() => setHasInteracted(true)}
          onClick={() => setHasInteracted(true)}
          type="text"
          placeholder="Search by title, author, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          whileFocus={{ scale: 1.05 }}
          className="search-input"
        />

        <p className="search-count">
          {shouldShowResults && !isLoading && !error ? (
            <>
              {filteredBooks.length} book{filteredBooks.length !== 1 ? "s" : ""}{" "}
              found
            </>
          ) : (
            ""
          )}
        </p>

        <div className="results">
          <AnimatePresence>
            {shouldShowResults && isLoading ? (
              <Loader label="Loading catalogue…" fullscreen={false} />
            ) : shouldShowResults && error ? (
              <motion.p
                className="no-results"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                Catalogue unavailable. Please try again later.
              </motion.p>
            ) : shouldShowResults && filteredBooks.length > 0 ? (
              filteredBooks.map((book) => {
                const cartItem = cart.find((item) => item.id === book.id);
                const liked = wishlist.some((item) => item.id === book.id);

                return (
                  <motion.div
                    key={book.id}
                    className="book-card"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="card-image">
                      <img
                        src={optimizedImage(book.image, 480)}
                        srcSet={imageSrcSet(book.image)}
                        sizes="(max-width: 640px) 90vw, 320px"
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                        width={480}
                        height={320}
                      />
                      <span className="badge">{book.badge}</span>
                    </div>
                    <div className="card-content">
                      <div className="card-header">
                        <h3>{book.title}</h3>
                        <button
                          type="button"
                          className={`like-btn ${liked ? "liked" : ""}`}
                          onClick={() => {
                            if (liked) {
                              dispatch(removeFromWishlist(book.id));
                            } else {
                              dispatch(
                                addToWishlist({
                                  id: book.id,
                                  title: book.title,
                                  author: book.author,
                                  price: book.price,
                                  image: book.image,
                                }),
                              );
                            }
                          }}
                          aria-label={
                            liked ? "Remove from wishlist" : "Add to wishlist"
                          }
                        >
                          {liked ? (
                            <FaHeart className="heart-icon" />
                          ) : (
                            <FaRegHeart className="heart-icon" />
                          )}
                        </button>
                      </div>
                      <p className="author">by {book.author}</p>
                      <p className="category">{book.category}</p>

                      <StarRating
                        bookId={book.id}
                        currentRating={ratings[book.id] ?? book.rating}
                        size="medium"
                      />

                      <div className="card-footer">
                        <span className="price">{formatPrice(book.price)}</span>
                        <button
                          type="button"
                          className={`cart-btn ${cartItem ? "in-cart" : ""}`}
                          onClick={() => handleAddToCart(book)}
                        >
                          {cartItem
                            ? `In Cart (${cartItem.quantity})`
                            : "Add to Cart"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : search ? (
              <motion.p
                className="no-results"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                No books found for "{search}" 📖
              </motion.p>
            ) : (
              <motion.p
                className="no-results"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                Start typing to search books 📖
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default SearchBooks;
