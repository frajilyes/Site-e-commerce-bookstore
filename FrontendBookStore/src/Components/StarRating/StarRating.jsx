import React, { useState } from "react";
import { FaStar } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { setRating } from "../../book/bookSlice";
import "./StarRating.css";

const StarRating = ({ bookId, currentRating = 0, size = "medium", onRate }) => {
  const dispatch = useDispatch();
  const [hoverRating, setHoverRating] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleRate = (value) => {
    setIsAnimating(true);
    if (onRate) {
      onRate(value);
    } else {
      dispatch(setRating({ id: bookId, rating: value }));
    }
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleMouseEnter = (value) => {
    setHoverRating(value);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const displayRating = hoverRating || currentRating || 0;

  return (
    <div className={`star-rating star-rating-${size}`}>
      <div className="stars-container">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={star}
            className="star-wrapper"
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
          >
            <div
              className={`star-inner ${star <= displayRating ? "active" : ""} ${isAnimating && star <= currentRating ? "pop" : ""}`}
              onClick={() => handleRate(star)}
              role="button"
              tabIndex={0}
              aria-label={`Rate ${star} stars`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleRate(star);
                }
              }}
            >
              <FaStar className="star-icon" />
              <div className="star-glow" />
            </div>
          </div>
        ))}
      </div>

      {displayRating > 0 && (
        <div className="rating-display">
          <span className="rating-value">{displayRating.toFixed(1)}</span>
          <span className="rating-label">
            {displayRating <= 2
              ? "Poor"
              : displayRating <= 3
                ? "Good"
                : displayRating <= 4
                  ? "Very Good"
                  : "Excellent"}
          </span>
        </div>
      )}
    </div>
  );
};

export default StarRating;
