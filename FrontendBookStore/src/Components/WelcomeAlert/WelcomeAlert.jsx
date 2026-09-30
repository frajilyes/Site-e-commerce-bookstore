import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, ShieldCheck, X } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import "./WelcomeAlert.css";

const DISMISS_KEY = "welcomeAlertDismissed";

const wasDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch (error) {
    return false;
  }
};

const rememberDismissal = () => {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch (error) {
  }
};

const WelcomeAlert = () => {
  const { isSignedIn } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(() => !isSignedIn && !wasDismissed());

  const close = useCallback(() => {
    setOpen(false);
    rememberDismissal();
  }, []);

  useEffect(() => {
    if (isSignedIn) setOpen(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;

  const goToSignIn = () => {
    close();
    nav("/signin", { state: { returnTo: "/checkout" } });
  };

  return (
    <div className="welcome-alert" role="status" aria-live="polite">
      <div className="welcome-alert-card">
        <button
          type="button"
          className="welcome-alert-close"
          onClick={close}
          aria-label="Close this notice"
        >
          <X size={16} />
        </button>

        <span className="welcome-alert-icon" aria-hidden="true">
          <ShieldCheck size={20} />
        </span>

        <div className="welcome-alert-body">
          <h2 className="welcome-alert-title">Sign in before checking out</h2>
          <p className="welcome-alert-text">
            Your cart is saved without an account, but checkout needs one: it is
            how we attach the order to you, secure the payment and let you track
            the delivery and reviews afterwards.
          </p>
          <button
            type="button"
            className="welcome-alert-action"
            onClick={goToSignIn}
          >
            <LogIn size={16} />
            Sign in now
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeAlert;
