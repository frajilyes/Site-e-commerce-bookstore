import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import "./SignIn.css";
import "./VerifyEmail.css";

import Seo from "../Seo";

const ForgotPassword = () => {
  const nav = useNavigate();
  const location = useLocation();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState(location.state?.email || "");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      const result = await forgotPassword(email);
      nav("/reset-password", {
        state: {
          ...location.state,
          email: result?.email || email.trim().toLowerCase(),
          resendAfter: result?.resendAfter ?? 60,
          delivered: result?.delivered,
        },
      });
    } catch (forgotError) {
      setSubmitting(false);
      setError(
        forgotError.displayMessages?.join(" ") || forgotError.message,
      );
    }
  };

  return (
    <div className="signin-container">
      <Seo title="Forgot password" path="/forgot-password" noindex />
      <div className="overlay"></div>

      <div className="signin-card">
        <div className="verify-badge" aria-hidden="true">
          🔑
        </div>

        <h2 className="title">Mot de passe oublié</h2>
        <p className="subtitle">
          Indiquez l'adresse de votre compte : nous vous enverrons un code à 6
          chiffres pour en choisir un nouveau.
        </p>

        <form onSubmit={handleSubmit}>
          <div className={`input-group ${focused ? "active" : ""}`}>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <label htmlFor="forgot-email">Email</label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="signin-btn" type="submit" disabled={submitting}>
            {submitting ? "Envoi…" : "Recevoir un code"}
          </button>
        </form>

        <p className="register-text">
          Vous vous en souvenez ?{" "}
          <span onClick={() => nav("/signin", { state: location.state })}>
            Retour à la connexion
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
