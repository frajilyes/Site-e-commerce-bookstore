import React, { useCallback, useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import SocialAuthButtons from "../SocialAuthButtons";
import "./SignIn.css";

import Seo from "../Seo";
const SignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focused, setFocused] = useState(null);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const { isSignedIn, login } = useAuth();

  const returnTo = location.state?.returnTo || "/";
  const paymentPending = Boolean(location.state?.paymentPending);

  const wasSignedInOnMount = useRef(isSignedIn);
  useEffect(() => {
    if (!wasSignedInOnMount.current) return;
    nav(returnTo, {
      replace: true,
      state: paymentPending ? { paymentPending: true } : {},
    });
  }, [nav, returnTo, paymentPending]);

  const finishSignIn = useCallback(() => {
    setShowPaymentAlert(true);
    setTimeout(() => setShowPaymentAlert(false), 1200);

    setTimeout(() => {
      nav(returnTo, {
        replace: true,
        state: paymentPending ? { paymentPending: true } : {},
      });
    }, 1300);
  }, [nav, returnTo, paymentPending]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setSubmitting(true);

    try {
      await login({ email, password });
    } catch (loginError) {
      setSubmitting(false);

      if (loginError.needsEmailVerification) {
        nav("/verify-email", {
          state: { email, returnTo, paymentPending, resendAfter: 60 },
        });
        return;
      }

      if (loginError.needsSocialLogin) {
        setError(
          "Ce compte a été créé avec Google : utilisez le bouton « Continue with Google » ci-dessous.",
        );
        return;
      }

      setError(
        loginError.displayMessages?.join(" ") ||
          loginError.message ||
          "La connexion a échoué, réessayez.",
      );
      return;
    }

    setSubmitting(false);
    finishSignIn();
  };

  return (
    <div className="signin-container">
      <Seo title="Sign in" path="/signin" noindex />
      <div className="overlay"></div>

      {showPaymentAlert && (
        <div className="payment-alert-wrapper">
          <div className="payment-alert-card">
            <span className="alert-ring"></span>
            <div className="alert-icon">✓</div>
          </div>
        </div>
      )}

      <div className="signin-card">
        <h2 className="title">Welcome Back 📘</h2>
        <p className="subtitle">Sign in to continue your reading journey</p>

        <form onSubmit={handleSubmit}>
          <div className={`input-group ${focused === "email" ? "active" : ""}`}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
            <label>Email</label>
          </div>

          <div
            className={`input-group ${focused === "password" ? "active" : ""}`}
          >
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
            />
            <label>Password</label>
          </div>

          <button
            type="button"
            className="forgot-link"
            onClick={() =>
              nav("/forgot-password", { state: { ...location.state, email } })
            }
          >
            Mot de passe oublié ?
          </button>

          {error && <p className="form-error">{error}</p>}

          <button className="signin-btn" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <SocialAuthButtons
          disabled={submitting}
          onError={setError}
          onSuccess={finishSignIn}
        />

        <p className="register-text">
          Don't have an account?{" "}
          <span onClick={() => nav("/signup", { state: location.state })}>
            Create one
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
