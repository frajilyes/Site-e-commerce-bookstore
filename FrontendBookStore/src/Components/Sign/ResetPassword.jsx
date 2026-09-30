import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import "./SignIn.css";
import "./VerifyEmail.css";

import Seo from "../Seo";

const CODE_LENGTH = 6;

const PASSWORD_RULES = [
  { label: "8 caractères minimum", test: (value) => value.length >= 8 },
  { label: "au moins une lettre", test: (value) => /[a-zA-Z]/.test(value) },
  { label: "au moins un chiffre", test: (value) => /[0-9]/.test(value) },
];

const onlyDigits = (value) => String(value).replace(/\D/g, "");

const ResetPassword = () => {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { forgotPassword, resetPassword } = useAuth();

  const email = location.state?.email || searchParams.get("email") || "";
  const returnTo = location.state?.returnTo || "/";
  const paymentPending = Boolean(location.state?.paymentPending);
  const delivered = location.state?.delivered !== false;

  const [code, setCode] = useState(
    onlyDigits(searchParams.get("code") || "").slice(0, CODE_LENGTH),
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [focused, setFocused] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(location.state?.resendAfter ?? 0);

  useEffect(() => {
    if (!email) nav("/forgot-password", { replace: true });
  }, [email, nav]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const rulesMet = PASSWORD_RULES.every((rule) => rule.test(password));
  const matches = password === confirmation;
  const canSubmit =
    code.length === CODE_LENGTH && rulesMet && matches && !submitting && !done;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setError("");
    setNotice("");
    setSubmitting(true);

    try {
      await resetPassword({ email, code, password });
    } catch (resetError) {
      setSubmitting(false);
      if (String(resetError.code).startsWith("RESET_CODE")) setCode("");
      setError(
        resetError.fieldMessages?.length
          ? resetError.fieldMessages.join(" ")
          : resetError.message,
      );
      return;
    }

    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      nav(returnTo, {
        replace: true,
        state: paymentPending ? { paymentPending: true } : {},
      });
    }, 1300);
  };

  const handleResend = async () => {
    if (cooldown > 0 || submitting) return;

    setError("");
    setNotice("");

    try {
      const result = await forgotPassword(email);
      setCooldown(result?.resendAfter ?? 60);
      setNotice(
        result?.delivered === false
          ? "Code régénéré. Aucun SMTP n'est configuré : il est affiché dans la console du serveur."
          : "Si un compte existe pour cette adresse, un nouveau code est parti. Pensez à regarder vos spams.",
      );
      setCode("");
    } catch (resendError) {
      if (resendError.status === 429) setCooldown(60);
      setError(resendError.message);
    }
  };

  const groupClass = (name, value) =>
    `input-group ${focused === name || value ? "active" : ""}`;

  return (
    <div className="signin-container">
      <Seo title="Reset password" path="/reset-password" noindex />
      <div className="overlay"></div>

      {done && (
        <div className="verify-success">
          <div className="verify-success-card">
            <span className="verify-success-ring"></span>
            <div className="verify-success-icon">✓</div>
          </div>
        </div>
      )}

      <div className="signin-card verify-card">
        <div className="verify-badge" aria-hidden="true">
          🔒
        </div>

        <h2 className="title">Nouveau mot de passe</h2>
        <p className="subtitle">
          Saisissez le code envoyé à
          <br />
          <strong className="verify-email">{email}</strong>
          <br />
          puis choisissez votre nouveau mot de passe.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className={groupClass("code", code)}>
            <input
              id="reset-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              value={code}
              disabled={submitting || done}
              onChange={(event) =>
                setCode(onlyDigits(event.target.value).slice(0, CODE_LENGTH))
              }
              onFocus={() => setFocused("code")}
              onBlur={() => setFocused(null)}
            />
            <label htmlFor="reset-code">Code à 6 chiffres</label>
          </div>

          <div className={groupClass("password", password)}>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={password}
              disabled={submitting || done}
              onChange={(event) => setPassword(event.target.value)}
              onFocus={() => setFocused("password")}
              onBlur={() => setFocused(null)}
            />
            <label htmlFor="reset-password">Nouveau mot de passe</label>
          </div>

          <ul className="password-rules" aria-live="polite">
            {PASSWORD_RULES.map((rule) => (
              <li
                key={rule.label}
                className={rule.test(password) ? "rule-ok" : ""}
              >
                {rule.test(password) ? "✓" : "•"} {rule.label}
              </li>
            ))}
          </ul>

          <div className={groupClass("confirmation", confirmation)}>
            <input
              id="reset-confirmation"
              type="password"
              autoComplete="new-password"
              maxLength={128}
              value={confirmation}
              disabled={submitting || done}
              className={confirmation && !matches ? "input-error" : ""}
              onChange={(event) => setConfirmation(event.target.value)}
              onFocus={() => setFocused("confirmation")}
              onBlur={() => setFocused(null)}
            />
            <label htmlFor="reset-confirmation">Confirmer le mot de passe</label>
          </div>

          {confirmation && !matches && (
            <p className="form-error">Les deux mots de passe diffèrent.</p>
          )}
          {error && <p className="form-error">{error}</p>}
          {!error && notice && <p className="form-notice">{notice}</p>}
          {!error && !notice && !delivered && (
            <p className="form-notice">
              Aucun SMTP n'est configuré sur le serveur : le code s'affiche dans
              sa console.
            </p>
          )}

          <button className="signin-btn" type="submit" disabled={!canSubmit}>
            {submitting ? "Enregistrement…" : "Changer mon mot de passe"}
          </button>
        </form>

        <button
          type="button"
          className="resend-btn"
          onClick={handleResend}
          disabled={cooldown > 0 || submitting || done}
        >
          {cooldown > 0
            ? `Renvoyer le code (${cooldown} s)`
            : "Je n'ai rien reçu, renvoyer le code"}
        </button>

        <p className="register-text">
          Mauvaise adresse ?{" "}
          <span
            onClick={() =>
              nav("/forgot-password", { state: { ...location.state, email } })
            }
          >
            Recommencer
          </span>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
