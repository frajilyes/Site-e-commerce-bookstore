import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FaArrowLeft, FaHeart } from "react-icons/fa";
import { addToCart, addToWishlist, removeFromWishlist } from "./bookSlice";
import {
  selectCartQuantityById,
  selectRatings,
  selectWishlistIds,
} from "./bookSelectors";
import SmartImage from "../Components/SmartImage";
import StarRating from "../Components/StarRating/StarRating";
import Loader from "../Components/Loader/Loader";
import useBooks from "../hooks/useBooks";
import Seo from "../Components/Seo";
import env from "../config/env";
import { discountPercent, formatPrice } from "../utils/format";
import { resolveImage } from "../utils/imageUrl";

const RELATED_LIMIT = 3;

const BookDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { books, isLoading } = useBooks();

  const quantities = useSelector(selectCartQuantityById);
  const wishlistIds = useSelector(selectWishlistIds);
  const ratings = useSelector(selectRatings);

  const book = useMemo(
    () => books.find((item) => String(item.id) === String(id)),
    [books, id],
  );

  const related = useMemo(() => {
    if (!book) return [];
    return books
      .filter((item) => item.id !== book.id && item.category === book.category)
      .slice(0, RELATED_LIMIT);
  }, [books, book]);

  const [quantity, setQuantity] = useState(1);
  useEffect(() => setQuantity(1), [id]);

  const jsonLd = useMemo(() => {
    if (!book) return undefined;

    const url = `${env.siteUrl}/books/${book.id}`;
    const rating = ratings[book.id] ?? book.rating;

    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Book",
          "@id": `${url}#book`,
          name: book.title,
          url,
          author: { "@type": "Person", name: book.author },
          image: resolveImage(book.image),
          description: book.description ?? undefined,
          genre: book.category,
          aggregateRating: rating
            ? {
                "@type": "AggregateRating",
                ratingValue: Number(rating),
                bestRating: 5,
                ratingCount: book.ratingCount ?? 1,
              }
            : undefined,
          offers: {
            "@type": "Offer",
            url,
            price: Number(book.price),
            priceCurrency: env.currency,
            availability: "https://schema.org/InStock",
          },
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `${env.siteUrl}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Books",
              item: `${env.siteUrl}/books`,
            },
            { "@type": "ListItem", position: 3, name: book.title, item: url },
          ],
        },
      ],
    };
  }, [book, ratings]);

  const handleAddToCart = useCallback(() => {
    if (!book) return;
    const payload = {
      id: book.id,
      title: book.title,
      price: book.price,
      image: book.image,
    };
    for (let i = 0; i < quantity; i += 1) {
      dispatch(addToCart(payload));
    }
  }, [book, dispatch, quantity]);

  const handleToggleWishlist = useCallback(() => {
    if (!book) return;
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
  }, [book, dispatch, wishlistIds]);

  if (!book) {
    if (isLoading) return <Loader label="Loading book" />;

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-slate-950 px-6 py-24 text-center text-slate-100">
        <Seo title="Book not available" noindex />
        <span className="text-5xl" aria-hidden="true">
          📕
        </span>
        <h1 className="text-3xl font-bold">This book is not available</h1>
        <Link
          to="/books"
          className="rounded-2xl bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          Browse the catalog
        </Link>
      </div>
    );
  }

  const inCart = quantities.get(book.id) ?? 0;
  const liked = wishlistIds.has(book.id);
  const discount = discountPercent(book.price, book.oldPrice);

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 md:px-12">
      <Seo
        title={book.title}
        path={`/books/${book.id}`}
        type="product"
        image={resolveImage(book.image)}
        description={
          book.description ??
          `${book.title} by ${book.author} - ${book.category} available on BookStore.`
        }
        jsonLd={jsonLd}
      />

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300 transition hover:text-cyan-200"
      >
        <FaArrowLeft /> Back
      </button>

      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/80 shadow-card">
          <SmartImage
            src={book.image}
            alt={book.title}
            priority
            width={640}
            height={720}
            sizes="(max-width: 1024px) 90vw, 420px"
            className="h-full w-full object-cover"
          />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            {book.badge ? `${book.category} - ${book.badge}` : book.category}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold text-white md:text-5xl">
            {book.title}
          </h1>
          <p className="mt-2 text-lg text-slate-400">by {book.author}</p>

          <div className="mt-5">
            <StarRating
              bookId={book.id}
              currentRating={ratings[book.id] ?? book.rating}
              size="medium"
            />
          </div>

          <p className="mt-6 max-w-2xl leading-relaxed text-slate-300">
            {book.description ?? "No description available."}
          </p>

          <div className="mt-8 flex flex-wrap items-end gap-4">
            <p className="text-4xl font-bold text-white">
              {formatPrice(book.price)}
            </p>
            {book.oldPrice ? (
              <p className="text-lg text-slate-500 line-through">
                {formatPrice(book.oldPrice)}
              </p>
            ) : null}
            {discount > 0 ? (
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                {discount}% off
              </span>
            ) : null}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center overflow-hidden rounded-2xl border border-slate-700">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-4 py-3 text-lg text-slate-300 transition hover:bg-slate-800"
              >
                -
              </button>
              <span className="min-w-12 px-4 text-center font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="px-4 py-3 text-lg text-slate-300 transition hover:bg-slate-800"
              >
                +
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className="rounded-3xl bg-cyan-500 px-8 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              {inCart ? `Add more (${inCart} in cart)` : "Add to cart"}
            </button>

            <button
              type="button"
              onClick={handleToggleWishlist}
              aria-pressed={liked}
              className={`inline-flex items-center gap-2 rounded-3xl border px-6 py-3 font-semibold transition ${
                liked
                  ? "border-red-400 bg-red-500/10 text-red-300"
                  : "border-slate-700 text-slate-200 hover:border-cyan-400"
              }`}
            >
              <FaHeart /> {liked ? "In wishlist" : "Add to wishlist"}
            </button>

            <Link
              to="/checkout"
              className="rounded-3xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 transition hover:border-cyan-400"
            >
              Go to checkout
            </Link>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl">
          <h2 className="mb-6 text-2xl font-bold text-white">
            More in {book.category}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <Link
                key={item.id}
                to={`/books/${item.id}`}
                className="group overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 transition hover:-translate-y-1"
              >
                <SmartImage
                  src={item.image}
                  alt={item.title}
                  width={480}
                  height={280}
                  className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="p-5">
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-sm text-slate-400">by {item.author}</p>
                  <p className="mt-2 font-bold text-cyan-300">
                    {formatPrice(item.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default BookDetailsPage;
