import React, { useCallback, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import SocialAuthButtons from "../SocialAuthButtons";
import "./SignIn.css";

import Seo from "../Seo";
const PASSWORD_RULE = /^(?=.*[a-zA-Z])(?=.*[0-9]).{8,128}$/;

const SignUp = () => {
  const [focused, setFocused] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const nav = useNavigate();
  const location = useLocation();
  const { register } = useAuth();

  const mismatch = confirm.length > 0 && password !== confirm;

  const returnTo = location.state?.returnTo || "/";
  const paymentPending = Boolean(location.state?.paymentPending);

  const finishSignUp = useCallback(() => {
    nav(returnTo, {
      replace: true,
      state: paymentPending ? { paymentPending: true } : {},
    });
  }, [nav, returnTo, paymentPending]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!PASSWORD_RULE.test(password)) {
      setError(
        "Le mot de passe doit faire au moins 8 caractères et contenir une lettre et un chiffre.",
      );
      return;
    }

    setError("");
    setSubmitting(true);

    let pending;
    try {
      pending = await register({ fullName, email, password });
    } catch (registerError) {
      setSubmitting(false);
      setError(
        registerError.fieldMessages?.length
          ? registerError.fieldMessages.join(" ")
          : registerError.message,
      );
      return;
    }

    setSubmitting(false);

    if (!pending?.requiresVerification) {
      finishSignUp();
      return;
    }

    nav("/verify-email", {
      replace: true,
      state: {
        email: pending.email,
        delivered: pending.delivered,
        resendAfter: pending.resendAfter,
        returnTo,
        paymentPending,
      },
    });
  };

  return (
    <div className="signin-container">
      <Seo title="Create an account" path="/signup" noindex />
      <div className="overlay"></div>

      <div className="signin-card">
        <h2 className="title">Create Your Account 📚</h2>
        <p className="subtitle">
          Join now and start organizing your reading list
        </p>

        <form onSubmit={handleSubmit}>
          <div className={`input-group ${focused === "name" ? "active" : ""}`}>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError("");
              }}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
            />
            <label>Full Name</label>
          </div>

          <div className={`input-group ${focused === "email" ? "active" : ""}`}>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
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
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
            />
            <label>Password</label>
          </div>

          <div
            className={`input-group ${focused === "confirm" ? "active" : ""}`}
          >
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError("");
              }}
              onFocus={() => setFocused("confirm")}
              onBlur={() => setFocused(null)}
              className={mismatch ? "input-error" : ""}
            />
            <label>Confirm Password</label>
          </div>

          {(mismatch || error) && (
            <p className="form-error">
              {error || "Les mots de passe ne correspondent pas."}
            </p>
          )}

          <button
            className="signin-btn"
            type="submit"
            disabled={mismatch || submitting}
          >
            {submitting ? "Creating…" : "Create Account"}
          </button>
        </form>

        <SocialAuthButtons
          disabled={submitting}
          onError={setError}
          onSuccess={finishSignUp}
        />

        <p className="register-text">
          Already have an account?{" "}
          <span onClick={() => nav("/signin", { state: location.state })}>
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
};

export default SignUp;
