import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import "./SignIn.css";
import "./VerifyEmail.css";

import Seo from "../Seo";
const CODE_LENGTH = 6;
const EMPTY_CODE = Array(CODE_LENGTH).fill("");

const onlyDigits = (value) => String(value).replace(/\D/g, "");

const maskEmail = (email) => {
  const [local = "", domain = ""] = String(email).split("@");
  if (!domain) return email;
  if (local.length <= 3) return `${local[0] || ""}••@${domain}`;
  const hidden = "•".repeat(Math.min(local.length - 3, 10));
  return `${local.slice(0, 2)}${hidden}${local.slice(-1)}@${domain}`;
};

const VerifyEmail = () => {
  const nav = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { verifyEmail, resendVerification } = useAuth();

  const email = location.state?.email || searchParams.get("email") || "";
  const returnTo = location.state?.returnTo || "/";
  const paymentPending = Boolean(location.state?.paymentPending);
  const delivered = location.state?.delivered !== false;

  const [digits, setDigits] = useState(EMPTY_CODE);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [cooldown, setCooldown] = useState(location.state?.resendAfter ?? 0);

  const inputsRef = useRef([]);
  const autoSubmitted = useRef(false);

  const code = useMemo(() => digits.join(""), [digits]);
  const complete = code.length === CODE_LENGTH;

  useEffect(() => {
    if (!email) nav("/signup", { replace: true });
  }, [email, nav]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const submitCode = useCallback(
    async (value) => {
      setError("");
      setNotice("");
      setSubmitting(true);

      try {
        await verifyEmail({ email, code: value });
      } catch (verifyError) {
        setSubmitting(false);
        autoSubmitted.current = false;
        setDigits(EMPTY_CODE);
        inputsRef.current[0]?.focus();
        setError(
          verifyError.fieldMessages?.length
            ? verifyError.fieldMessages.join(" ")
            : verifyError.message,
        );
        return;
      }

      setSubmitting(false);
      setConfirmed(true);
      setTimeout(() => {
        nav(returnTo, {
          replace: true,
          state: paymentPending ? { paymentPending: true } : {},
        });
      }, 1300);
    },
    [email, nav, paymentPending, returnTo, verifyEmail],
  );

  useEffect(() => {
    const fromLink = onlyDigits(searchParams.get("code") || "");
    if (fromLink.length !== CODE_LENGTH || autoSubmitted.current) return;
    autoSubmitted.current = true;
    setDigits(fromLink.split(""));
    submitCode(fromLink);
  }, [searchParams, submitCode]);

  useEffect(() => {
    if (!complete || submitting || confirmed || autoSubmitted.current) return;
    autoSubmitted.current = true;
    submitCode(code);
  }, [code, complete, confirmed, submitCode, submitting]);

  const writeDigits = (next, focusIndex) => {
    setDigits(next);
    setError("");
    if (focusIndex !== undefined) {
      inputsRef.current[Math.min(focusIndex, CODE_LENGTH - 1)]?.focus();
    }
  };

  const handleChange = (index, rawValue) => {
    const value = onlyDigits(rawValue);

    if (!value) {
      const next = [...digits];
      next[index] = "";
      writeDigits(next);
      return;
    }

    const next = [...digits];
    value.split("").forEach((digit, offset) => {
      if (index + offset < CODE_LENGTH) next[index + offset] = digit;
    });
    autoSubmitted.current = false;
    writeDigits(next, index + value.length);
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = [...digits];
      next[index - 1] = "";
      writeDigits(next, index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
    }

    if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    const pasted = onlyDigits(event.clipboardData.getData("text")).slice(
      0,
      CODE_LENGTH,
    );
    if (!pasted) return;

    event.preventDefault();
    const next = [...EMPTY_CODE];
    pasted.split("").forEach((digit, index) => {
      next[index] = digit;
    });
    autoSubmitted.current = false;
    writeDigits(next, pasted.length);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!complete || submitting) return;
    autoSubmitted.current = true;
    submitCode(code);
  };

  const handleResend = async () => {
    if (cooldown > 0 || submitting) return;

    setError("");
    setNotice("");

    try {
      const result = await resendVerification(email);
      setCooldown(result?.resendAfter ?? 60);
      setNotice(
        result?.delivered === false
          ? "Code régénéré. Aucun SMTP n'est configuré : il est affiché dans la console du serveur."
          : "Un nouveau code vient de partir. Pensez à regarder vos spams.",
      );
    } catch (resendError) {
      if (resendError.status === 429) setCooldown(60);
      setError(resendError.message);
    }

    autoSubmitted.current = false;
    setDigits(EMPTY_CODE);
    inputsRef.current[0]?.focus();
  };

  return (
    <div className="signin-container">
      <Seo title="Verify your email" path="/verify-email" noindex />
      <div className="overlay"></div>

      {confirmed && (
        <div className="verify-success">
          <div className="verify-success-card">
            <span className="verify-success-ring"></span>
            <div className="verify-success-icon">✓</div>
          </div>
        </div>
      )}

      <div className="signin-card verify-card">
        <div className="verify-badge" aria-hidden="true">
          ✉️
        </div>

        <h2 className="title">Confirmez votre adresse</h2>
        <p className="subtitle">
          Nous avons envoyé un code à 6 chiffres à
          <br />
          <strong className="verify-email">{maskEmail(email)}</strong>
        </p>

        <form onSubmit={handleSubmit}>
          <div
            className="code-inputs"
            role="group"
            aria-label="Code de confirmation à 6 chiffres"
          >
            {digits.map((digit, index) => (
              <input
                // eslint-disable-next-line react/no-array-index-key -- positions fixes
                key={index}
                ref={(element) => {
                  inputsRef.current[index] = element;
                }}
                className={`code-input ${error ? "code-input-error" : ""}`}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={CODE_LENGTH}
                value={digit}
                disabled={submitting || confirmed}
                onChange={(event) => handleChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                onFocus={(event) => event.target.select()}
                aria-label={`Chiffre ${index + 1}`}
              />
            ))}
          </div>

          {error && <p className="form-error">{error}</p>}
          {!error && notice && <p className="form-notice">{notice}</p>}
          {!error && !notice && !delivered && (
            <p className="form-notice">
              Aucun SMTP n'est configuré sur le serveur : le code s'affiche dans
              sa console.
            </p>
          )}

          <button
            className="signin-btn"
            type="submit"
            disabled={!complete || submitting || confirmed}
          >
            {submitting ? "Vérification…" : "Confirmer mon adresse"}
          </button>
        </form>

        <button
          type="button"
          className="resend-btn"
          onClick={handleResend}
          disabled={cooldown > 0 || submitting || confirmed}
        >
          {cooldown > 0
            ? `Renvoyer le code (${cooldown} s)`
            : "Je n'ai rien reçu, renvoyer le code"}
        </button>

        <p className="register-text">
          Mauvaise adresse ?{" "}
          <span onClick={() => nav("/signup", { state: location.state })}>
            Recommencer l'inscription
          </span>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
