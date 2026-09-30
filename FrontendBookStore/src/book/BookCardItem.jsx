import React, { memo } from "react";
import { FaHeart, FaEye } from "react-icons/fa";
import { Link } from "react-router-dom";
import SmartImage from "../Components/SmartImage";
import StarRating from "../Components/StarRating/StarRating";
import { discountPercent, formatPrice } from "../utils/format";

const BookCardItem = ({
  book,
  quantity = 0,
  isWishlisted = false,
  rating,
  priority = false,
  onAddToCart,
  onToggleWishlist,
  onQuickView,
}) => {
  const discount = discountPercent(book.price, book.oldPrice);

  return (
    <div className="group overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/20 transition duration-500 hover:-translate-y-1 hover:shadow-2xl">
      <div className="relative overflow-hidden">
        <SmartImage
          src={book.image}
          alt={book.title}
          priority={priority}
          width={480}
          height={320}
          className="w-full h-80 object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/90 to-transparent" />

        {book.badge ? (
          <span className="absolute top-4 left-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-400 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-lg shadow-slate-950/40">
            {book.badge}
          </span>
        ) : null}

        <button
          type="button"
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isWishlisted}
          className={`absolute top-4 right-4 p-3 rounded-full shadow-lg transition ${
            isWishlisted
              ? "bg-red-500 text-white"
              : "bg-slate-950/90 text-slate-200 hover:bg-cyan-500 hover:text-white"
          }`}
          onClick={() => onToggleWishlist(book)}
        >
          <FaHeart />
        </button>
      </div>

      <div className="p-6 sm:p-7 bg-slate-950/90">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-300 font-semibold mb-3">
          {book.category}
        </p>
        <h2 className="text-3xl font-bold text-white mb-3 transition group-hover:text-cyan-300">
          <Link to={`/books/${book.id}`} className="hover:underline">
            {book.title}
          </Link>
        </h2>
        <p className="text-slate-400 mb-4">by {book.author}</p>
        <div className="mb-4">
          <StarRating bookId={book.id} currentRating={rating} size="medium" />
        </div>
        <div className="flex items-center gap-3 mb-6">
          <div>
            <p className="text-3xl font-bold text-white">
              {formatPrice(book.price)}
            </p>
            {discount > 0 ? (
              <p className="text-sm text-slate-500 line-through">
                {formatPrice(book.oldPrice)}
              </p>
            ) : null}
          </div>
          {discount > 0 ? (
            <span className="ml-auto inline-flex items-center rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
              {discount}% off
            </span>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onAddToCart(book)}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-3xl px-5 py-3 text-sm font-semibold transition ${
              quantity
                ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
                : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
            }`}
          >
            {quantity ? `In Cart (${quantity})` : "Add to Cart"}
          </button>

          <button
            type="button"
            onClick={() => onQuickView(book)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-700 bg-slate-950/90 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-cyan-400 hover:text-white transition"
          >
            <FaEye />
            Quick View
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(BookCardItem);
