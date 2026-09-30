import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import orderService from "../../services/orderService";
import "./OrderSuccess.css";

import Seo from "../../Components/Seo";
const CheckoutCancel = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const orderId = params.get("order");

  const handleCancel = async () => {
    if (!orderId) return;

    setStatus("pending");
    try {
      await orderService.cancelOrder(
        orderId,
        "Paiement abandonné par le client",
      );
      setStatus("cancelled");
      setMessage(
        "Commande annulée. Les exemplaires réservés ont été relibérés.",
      );
    } catch (error) {
      setStatus("failed");
      setMessage(error.message);
    }
  };

  return (
    <div className="OrderSuccess">
      <Seo title="Paiement annule" path="/checkout/cancel" noindex />
      <div className="overlay">
        <div className="success-card bg-white/10 backdrop-blur-xl p-10 rounded-3xl text-center">
          <div className="text-6xl mb-4">🛑</div>

          <h1 className="text-4xl font-bold text-amber-300 mb-4">
            Paiement interrompu
          </h1>

          <p className="mb-2 text-slate-300">Aucun montant n'a été prélevé.</p>

          {orderId && (
            <p className="mb-6 text-sm text-slate-400">
              Votre commande est conservée en attente de paiement.
            </p>
          )}

          {message && (
            <p
              className={`mb-6 text-sm ${
                status === "failed" ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate("/checkout")}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-500"
            >
              Reprendre le paiement
            </button>

            {orderId && status !== "cancelled" && (
              <button
                onClick={handleCancel}
                disabled={status === "pending"}
                className="px-6 py-3 rounded-xl border border-white/20 disabled:opacity-60"
              >
                {status === "pending" ? "Annulation…" : "Annuler la commande"}
              </button>
            )}

            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-xl border border-white/20"
            >
              Retour à la boutique
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancel;
