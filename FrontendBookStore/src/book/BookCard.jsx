import React, { Suspense, lazy, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { addToCart, addToWishlist, removeFromWishlist } from "./bookSlice";
import {
  selectCartCount,
  selectCartQuantityById,
  selectRatings,
  selectWishlistIds,
} from "./bookSelectors";
import BookCardItem from "./BookCardItem";
import Loader from "../Components/Loader/Loader";
import useBooks from "../hooks/useBooks";
import Seo from "../Components/Seo";
import {
  CATALOG_AVIF,
  CATALOG_FALLBACK,
  CATALOG_WEBP,
} from "../config/heroImage";

const QuickView = lazy(() => import("../Components/QuickView/QuickView"));

const EAGER_IMAGES = 3;

const BookCard = () => {
  const dispatch = useDispatch();
  const { books, isLoading, error } = useBooks();

  const quantities = useSelector(selectCartQuantityById);
  const wishlistIds = useSelector(selectWishlistIds);
  const ratings = useSelector(selectRatings);
  const totalCartItems = useSelector(selectCartCount);

  const [quickViewBook, setQuickViewBook] = useState(null);

  const handleAddToCart = useCallback(
    (book) => {
      dispatch(
        addToCart({
          id: book.id,
          title: book.title,
          price: book.price,
          image: book.image,
        }),
      );
    },
    [dispatch],
  );

  const handleToggleWishlist = useCallback(
    (book) => {
      if (wishlistIds.has(book.id)) {
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
    },
    [dispatch, wishlistIds],
  );

  const openQuickView = useCallback((book) => setQuickViewBook(book), []);
  const closeQuickView = useCallback(() => setQuickViewBook(null), []);

  const handleQuickViewAddToCart = useCallback(
    (book) => {
      handleAddToCart(book);
      closeQuickView();
    },
    [handleAddToCart, closeQuickView],
  );

  return (
    <>
      <Seo
        title={`Books (${totalCartItems} item${totalCartItems !== 1 ? "s" : ""})`}
        path="/books"
        description="Browse the full BookStore catalog: novels, manga, bestsellers and programming books, with ratings, quick view and wishlist."
      />
      <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
        <picture>
          <source type="image/avif" srcSet={CATALOG_AVIF} sizes="100vw" />
          <img
            src={CATALOG_FALLBACK}
            srcSet={CATALOG_WEBP}
            sizes="100vw"
            alt=""
            aria-hidden="true"
            width="1024"
            height="1536"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        <div className="absolute inset-0 bg-[linear-gradient(135deg,_rgba(15,23,42,0.94),_rgba(15,23,42,0.76))] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.16),_transparent_32%)] pointer-events-none" />
        <div className="relative p-8">
          <div className="text-center mb-10">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80 font-semibold mb-3">
              Curated Picks
            </p>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-white leading-tight mb-4">
              Discover Your Next Favorite Read
            </h1>
            <p className="mx-auto max-w-2xl text-slate-300 text-lg leading-relaxed">
              Premium book cards with elegant hover states, crisp typography and
              modern pricing.
            </p>
          </div>

          {isLoading && <Loader label="Loading the catalog" fullscreen={false} />}

          {!isLoading && error && (
            <p className="mx-auto max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-5 text-center text-rose-200">
              The catalog could not be loaded. Please check your connection and
              try again later.
            </p>
          )}

          {!isLoading && !error && books.length === 0 && (
            <p className="mx-auto max-w-xl text-center text-slate-300">
              No book is available right now. Come back soon!
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {books.map((book, index) => (
              <BookCardItem
                key={book.id}
                book={book}
                quantity={quantities.get(book.id) ?? 0}
                isWishlisted={wishlistIds.has(book.id)}
                rating={ratings[book.id] ?? book.rating}
                priority={index < EAGER_IMAGES}
                onAddToCart={handleAddToCart}
                onToggleWishlist={handleToggleWishlist}
                onQuickView={openQuickView}
              />
            ))}
          </div>
        </div>

        {quickViewBook && (
          <Suspense fallback={<Loader label="Opening" fullscreen={false} />}>
            <QuickView
              book={quickViewBook}
              onClose={closeQuickView}
              onAddToCart={handleQuickViewAddToCart}
            />
          </Suspense>
        )}
      </div>
    </>
  );
};

export default BookCard;
