import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import "./Categories.css";
import StarRating from "../StarRating/StarRating";
import Loader from "../Loader/Loader";
import useBooks from "../../hooks/useBooks";
import useDebounce from "../../hooks/useDebounce";
import { imageSrcSet, optimizedImage } from "../../utils/imageUrl";
import { formatPrice } from "../../utils/format";
import Seo from "../Seo";
import {
  addToCart,
  addToWishlist,
  removeFromWishlist,
} from "../../book/bookSlice";

const Categories = () => {
  const dispatch = useDispatch();
  const { books, isLoading, error } = useBooks();
  const cart = useSelector((state) => state.book?.cart ?? []);
  const wishlist = useSelector((state) => state.book?.wishlist ?? []);
  const ratings = useSelector((state) => state.book?.ratings ?? {});

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("relevance");
  const debouncedQuery = useDebounce(query, 200);

  const categories = useMemo(
    () => Array.from(new Set(books.map((b) => b.category))),
    [books],
  );

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

  const sortOptions = [
    { value: "relevance", label: "Relevance" },
    { value: "price-asc", label: "Price: Low → High" },
    { value: "price-desc", label: "Price: High → Low" },
    { value: "rating", label: "Top Rated" },
    { value: "title-asc", label: "Title: A → Z" },
    { value: "title-desc", label: "Title: Z → A" },
  ];

  const filteredBooks = useMemo(() => {
    let list = books.slice();
    if (selectedCategory)
      list = list.filter((b) => b.category === selectedCategory);
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q),
      );
    }
    if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sortBy === "rating")
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortBy === "title-asc")
      list.sort((a, b) => a.title.localeCompare(b.title));
    if (sortBy === "title-desc")
      list.sort((a, b) => b.title.localeCompare(a.title));
    return list;
  }, [books, selectedCategory, debouncedQuery, sortBy]);

  return (
    <div className="categories-container bg-black text-white">
      <Seo
        title="Categories"
        path="/categories"
        description="Browse BookStore by category: novels, manga, thrillers, programming, science and more."
      />
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=55&w=1280&auto=format&fit=crop"
          loading="lazy"
          decoding="async"
          alt="Bookstore"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br to-black"></div>

        <div className="absolute inset-x-0 top-0 h-screen">
          <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-bounce"></div>
        </div>
      </div>

      <motion.div
        className="categories-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          Explore By Category 📘
        </motion.h1>

        {isLoading ? (
          <Loader label="Loading catalogue…" />
        ) : error ? (
          <p className="no-results">
            Catalogue unavailable. Please try again later.
          </p>
        ) : (
          <>
            <div className="controls">
              <div className="chips">
                <button
                  type="button"
                  className={`chip ${selectedCategory === null ? "active" : ""}`}
                  onClick={() => setSelectedCategory(null)}
                >
                  All ({books.length})
                </button>
                {categories.map((cat) => (
                  <button
                    type="button"
                    key={cat}
                    className={`chip ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() =>
                      setSelectedCategory((c) => (c === cat ? null : cat))
                    }
                  >
                    {cat} ({books.filter((b) => b.category === cat).length})
                  </button>
                ))}
              </div>

              <div className="toolbar">
                <input
                  className="search-small"
                  placeholder="Search inside category..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <motion.div
              className="sort-chips"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              {sortOptions.map((option) => (
                <motion.button
                  type="button"
                  key={option.value}
                  className={`sort-chip ${sortBy === option.value ? "active" : ""}`}
                  onClick={() => setSortBy(option.value)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {option.label}
                </motion.button>
              ))}
            </motion.div>

            <motion.div className="books-grid" layout>
              <AnimatePresence>
                {filteredBooks.length > 0 ? (
                  filteredBooks.map((b) => {
                    const cartItem = cart.find((item) => item.id === b.id);
                    const liked = wishlist.some((item) => item.id === b.id);

                    return (
                      <motion.div
                        layout
                        key={b.id}
                        className="book-card-grid"
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.28 }}
                      >
                        <div className="thumb">
                          <img
                            src={optimizedImage(b.image, 480)}
                            srcSet={imageSrcSet(b.image)}
                            sizes="(max-width: 640px) 90vw, 300px"
                            alt={b.title}
                            loading="lazy"
                            decoding="async"
                            width={480}
                            height={320}
                          />
                          <span className="badge">{b.badge}</span>
                          <button
                            type="button"
                            className={`heart ${liked ? "liked" : ""}`}
                            onClick={() => {
                              if (liked) dispatch(removeFromWishlist(b.id));
                              else
                                dispatch(
                                  addToWishlist({
                                    id: b.id,
                                    title: b.title,
                                    author: b.author,
                                    price: b.price,
                                    image: b.image,
                                  }),
                                );
                            }}
                            aria-label={liked ? "Remove" : "Add"}
                          >
                            <FaHeart />
                          </button>
                        </div>

                        <div className="info">
                          <strong className="title">{b.title}</strong>
                          <span className="meta">
                            by {b.author} • {b.category}
                          </span>
                          <StarRating
                            bookId={b.id}
                            currentRating={ratings[b.id] ?? b.rating}
                            size="small"
                          />
                          <div className="row">
                            <span className="price">{formatPrice(b.price)}</span>
                            <button
                              type="button"
                              className={`add ${cartItem ? "in-cart" : ""}`}
                              onClick={() => handleAddToCart(b)}
                            >
                              {cartItem
                                ? `In Cart (${cartItem.quantity})`
                                : "Add"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <motion.p
                    className="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    No books found.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Categories;
