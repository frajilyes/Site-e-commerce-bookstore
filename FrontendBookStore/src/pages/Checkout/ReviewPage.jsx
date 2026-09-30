import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { BookOpen, Star, CheckCircle2, ArrowLeft } from "lucide-react";
import { saveReviews } from "../../book/bookSlice";
import { selectLastOrder, selectReviews } from "../../book/bookSelectors";
import StarRating from "../../Components/StarRating/StarRating";
import reviewService from "../../services/reviewService";
import { formatDateTime, formatPrice } from "../../utils/format";
import { optimizedImage } from "../../utils/imageUrl";
import "./ReviewPage.css";

import Seo from "../../Components/Seo";
const COMMENT_MAX = 500;

const buildDrafts = (items, savedReviews) => {
  const drafts = {};
  items.forEach((item) => {
    const saved = savedReviews[item.id];
    drafts[item.id] = {
      rating: saved?.rating ?? 0,
      comment: saved?.comment ?? "",
    };
  });
  return drafts;
};

const ReviewPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const order = useSelector(selectLastOrder);
  const savedReviews = useSelector(selectReviews);

  const items = useMemo(() => order?.items ?? [], [order]);

  const [drafts, setDrafts] = useState(() => buildDrafts(items, savedReviews));
  const [errors, setErrors] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const ratedCount = items.filter((item) => drafts[item.id]?.rating > 0).length;

  const setRatingFor = (bookId, rating) => {
    setDrafts((current) => ({
      ...current,
      [bookId]: { ...current[bookId], rating },
    }));
  };

  const setCommentFor = (bookId, comment) => {
    setDrafts((current) => ({
      ...current,
      [bookId]: { ...current[bookId], comment: comment.slice(0, COMMENT_MAX) },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const missing = items
      .filter((item) => !(drafts[item.id]?.rating > 0))
      .map((item) => `Please rate "${item.title}".`);

    if (missing.length > 0) {
      setErrors(missing);
      return;
    }

    setErrors([]);
    dispatch(
      saveReviews({
        orderId: order?.id ?? null,
        submittedAt: new Date().toISOString(),
        reviews: items.map((item) => ({
          id: item.id,
          rating: drafts[item.id].rating,
          comment: drafts[item.id].comment,
        })),
      }),
    );
    setSubmitted(true);

    const publishable = items
      .filter((item) => (drafts[item.id]?.comment ?? "").trim().length >= 3)
      .map((item) => ({
        bookId: item.id,
        rating: drafts[item.id].rating,
        comment: drafts[item.id].comment.trim(),
      }));

    if (publishable.length === 0) return;

    try {
      const { failed } = await reviewService.submitReviews(publishable);
      if (failed.length > 0) {
        setErrors(failed.map((entry) => entry.message));
      }
    } catch (error) {
      setErrors([error.message]);
    }
  };

  if (!order || items.length === 0) {
    return (
      <div className="ReviewPage">
        <div className="review-overlay">
          <div className="review-card review-card--centered">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-cyan-300 opacity-70" />
            <h1 className="text-3xl font-bold">No order to review yet</h1>
            <p className="mt-3 text-slate-300">
              Once you complete a checkout, you will be able to rate the books
              you bought right here.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/books" className="review-btn review-btn--primary">
                Browse the catalog
              </Link>
              <Link to="/" className="review-btn review-btn--ghost">
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="ReviewPage">
        <div className="review-overlay">
          <div className="review-card review-card--centered">
            <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-400" />
            <h1 className="text-4xl font-bold text-green-400">
              Thanks for your reviews
            </h1>
            <p className="mt-3 text-slate-300">
              {items.length} {items.length > 1 ? "books" : "book"} rated for
              order {order.id ?? "N/A"}. Your ratings now show on each book
              page.
            </p>

            <ul className="review-recap">
              {items.map((item) => (
                <li key={item.id}>
                  <Link to={`/books/${item.id}`} className="review-recap-title">
                    {item.title}
                  </Link>
                  <span className="review-recap-score">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {drafts[item.id].rating}/5
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="review-btn review-btn--ghost"
              >
                Edit my reviews
              </button>
              <Link to="/books" className="review-btn review-btn--primary">
                Keep shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ReviewPage">
      <Seo title="Rate your order" path="/review" noindex />
      <div className="review-overlay">
        <div className="review-shell">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="review-back"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <header className="review-header">
            <h1 className="review-title">Rate your order</h1>
            <p className="mt-3 text-slate-300">
              Tell other readers what you thought of the {items.length}{" "}
              {items.length > 1 ? "books" : "book"} you just received.
            </p>
            <div className="review-meta">
              <span>Order : {order.id ?? "N/A"}</span>
              <span>Paid at : {formatDateTime(order.paidAt)}</span>
              <span>Total : {formatPrice(order.total)}</span>
            </div>
            <p className="review-progress">
              {ratedCount} / {items.length} rated
            </p>
          </header>

          {errors.length > 0 && (
            <div className="review-errors" role="alert">
              <h2>Almost there</h2>
              <ul>
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {items.map((item) => (
              <div key={item.id} className="review-item">
                <img
                  src={optimizedImage(item.image, 160)}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  width={80}
                  height={112}
                  className="review-item-cover"
                />

                <div className="flex-1">
                  <Link to={`/books/${item.id}`} className="review-item-title">
                    {item.title}
                  </Link>
                  <p className="review-item-sub">
                    {item.quantity} x {formatPrice(item.price)}
                  </p>

                  <div className="mt-3">
                    <StarRating
                      bookId={item.id}
                      currentRating={drafts[item.id]?.rating ?? 0}
                      onRate={(value) => setRatingFor(item.id, value)}
                      size="medium"
                    />
                  </div>

                  <label
                    className="review-label"
                    htmlFor={`review-comment-${item.id}`}
                  >
                    Your review (optional)
                  </label>
                  <textarea
                    id={`review-comment-${item.id}`}
                    rows={3}
                    value={drafts[item.id]?.comment ?? ""}
                    onChange={(e) => setCommentFor(item.id, e.target.value)}
                    placeholder="What did you like about this book?"
                    className="review-textarea"
                  />
                  <p className="review-counter">
                    {(drafts[item.id]?.comment ?? "").length} / {COMMENT_MAX}
                  </p>
                </div>
              </div>
            ))}

            <div className="review-actions">
              <Link to="/" className="review-btn review-btn--ghost">
                Skip for now
              </Link>
              <button type="submit" className="review-btn review-btn--primary">
                Submit reviews
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReviewPage;
