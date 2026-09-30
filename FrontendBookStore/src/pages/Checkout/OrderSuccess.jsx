import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectLastOrder, selectReviews } from "../../book/bookSelectors";
import { formatDateTime, formatPrice } from "../../utils/format";
import "./OrderSuccess.css";

import Seo from "../../Components/Seo";
const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const order = useSelector(selectLastOrder);
  const reviews = useSelector(selectReviews);

  // Both the "order created but Stripe unavailable" path and an unconfirmed
  // Stripe session land here with pending: true — the order exists, the payment
  // does not yet.
  const pending = Boolean(location.state?.pending);

  const items = order?.items ?? [];
  const total = order ? formatPrice(order.total) : null;
  const paidAt = order ? formatDateTime(order.paidAt) : null;
  const alreadyReviewed =
    items.length > 0 && items.every((item) => reviews[item.id]);

  return (
    <div className="OrderSuccess">
      <Seo title="Order confirmed" path="/order-success" noindex />
      <div className="overlay">
        <div className="success-card bg-white/10 backdrop-blur-xl p-10 rounded-3xl text-center">
          <div className="text-6xl mb-4">{pending ? "⏳" : "✅"}</div>

          <h1
            className={`text-4xl font-bold mb-4 ${
              pending ? "text-amber-300" : "text-green-400"
            }`}
          >
            {pending ? "Order Registered" : "Order Successful"}
          </h1>

          <p className="mb-2">
            {pending
              ? "Your order is saved and waiting for payment confirmation."
              : "Payment completed successfully."}
          </p>

          {order?.id && (
            <p className="mb-2 text-sm text-slate-300">Order: {order.id}</p>
          )}

          <p className="mb-2">
            {pending ? "Total Due: " : "Total Paid: "}
            {total ?? formatPrice(location.state?.total ?? 0)}
          </p>

          <p className="mb-6">
            {pending ? "Placed At: " : "Paid At: "}
            {paidAt ?? location.state?.paidAt ?? "N/A"}
          </p>

          {items.length > 0 && (
            <p className="mb-6 text-sm text-slate-300">
              {alreadyReviewed
                ? "You already reviewed this order — you can still edit your ratings."
                : `How were your ${items.length > 1 ? `${items.length} books` : "book"}? Share a rating with other readers.`}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            {items.length > 0 && (
              <button
                onClick={() => navigate("/review")}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500"
              >
                {alreadyReviewed ? "Edit my reviews" : "Leave a review"}
              </button>
            )}

            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-xl border border-white/25 hover:border-cyan-400 transition"
            >
              Back To Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
