import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { placeOrder } from "../../book/bookSlice";
import { confirmCheckout } from "../../services/checkoutFlow";
import Loader from "../../Components/Loader/Loader";
import "./OrderSuccess.css";

import Seo from "../../Components/Seo";
const CheckoutSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState(null);

  const sessionId = params.get("session_id");

  useEffect(() => {
    if (!sessionId) {
      setError("Aucune session de paiement dans l'URL.");
      return undefined;
    }

    let active = true;

    confirmCheckout(sessionId)
      .then(({ paid, order }) => {
        if (!active) return;

        if (!order) {
          setError("Commande introuvable pour cette session de paiement.");
          return;
        }

        dispatch(
          placeOrder({
            id: order.orderNumber || order.id,
            items: order.items,
            total: order.totalPrice,
            paidAt: order.paidAt,
          }),
        );

        navigate("/order-success", {
          replace: true,
          state: {
            orderId: order.orderNumber || order.id,
            total: order.totalPrice?.toFixed(2),
            paidAt: order.paidAt,
            pending: !paid,
          },
        });
      })
      .catch((confirmError) => {
        if (active) setError(confirmError.message);
      });

    return () => {
      active = false;
    };
  }, [sessionId, dispatch, navigate]);

  if (!error) return <Loader />;

  return (
    <div className="OrderSuccess">
      <Seo title="Confirmation du paiement" path="/checkout/success" noindex />
      <div className="overlay">
        <div className="success-card bg-white/10 backdrop-blur-xl p-10 rounded-3xl text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h1 className="text-3xl font-bold text-amber-300 mb-4">
            Paiement en cours de vérification
          </h1>
          <p className="mb-6 text-slate-300">{error}</p>
          <p className="mb-6 text-sm text-slate-400">
            Si votre carte a été débitée, la commande sera confirmée
            automatiquement par Stripe. Vous la retrouverez dans votre
            historique.
          </p>
          <button
            onClick={() => navigate("/", { replace: true })}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500"
          >
            Retour à la boutique
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
