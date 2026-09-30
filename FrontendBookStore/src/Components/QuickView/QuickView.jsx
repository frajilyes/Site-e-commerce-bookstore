import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import "./QuickView.css";
import { formatPrice } from "../../utils/format";

const QuickView = ({ book, onClose, onAddToCart }) => {
  const overlayRef = useRef(null);
  const containerRef = useRef(null);
  const previousActiveRef = useRef(null);

  useEffect(() => {
    previousActiveRef.current = document.activeElement;

    containerRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const focusable = containerRef.current.querySelectorAll(
          'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previousActiveRef.current?.focus();
    };
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!book) return null;

  return ReactDOM.createPortal(
    <div
      className="qv-overlay"
      ref={overlayRef}
      onMouseDown={handleOverlayClick}
      aria-modal="true"
      role="dialog"
      aria-label={`Quick view ${book.title}`}
    >
      <motion.div
        ref={containerRef}
        className="qv-container"
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        tabIndex={-1}
      >
        <button
          className="qv-close"
          onClick={onClose}
          aria-label="Close quick view"
        >
          ✕
        </button>

        <div className="qv-grid">
          <div className="qv-media">
            <img src={book.image} alt={book.title} className="qv-image" />
          </div>
          <div className="qv-details">
            <h3 className="qv-title">{book.title}</h3>
            <p className="qv-author">by {book.author}</p>
            <p className="qv-meta">
              {book.badge ? `${book.category} • ${book.badge}` : book.category}
            </p>
            <p className="qv-price">{formatPrice(book.price)}</p>
            <p className="qv-desc">
              {book.description ?? "No description available."}
            </p>

            <div className="qv-actions">
              <button
                className="qv-add"
                onClick={() => {
                  onAddToCart(book);
                }}
              >
                Add to cart
              </button>
              <button className="qv-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default QuickView;
