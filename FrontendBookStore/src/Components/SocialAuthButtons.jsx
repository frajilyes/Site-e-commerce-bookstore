import React, { useCallback, useEffect, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import useAuth from "../hooks/useAuth";
import authService from "../services/authService";
import { isGoogleEnabled, preloadSocialSdks } from "../services/socialAuth";

const SocialAuthButtons = ({ onSuccess, onError, disabled = false }) => {
  const { loginWithGoogle } = useAuth();
  const [pending, setPending] = useState(null);

  const [available, setAvailable] = useState({ google: isGoogleEnabled() });

  useEffect(() => {
    preloadSocialSdks();

    let cancelledByUnmount = false;

    authService
      .getAuthProviders()
      .then((providers) => {
        if (cancelledByUnmount || !providers) return;
        setAvailable({
          google: isGoogleEnabled() && providers.google !== false,
        });
      })
      .catch(() => {});

    return () => {
      cancelledByUnmount = true;
    };
  }, []);

  const run = useCallback(
    async (provider, signIn) => {
      if (pending || disabled) return;

      onError?.("");
      setPending(provider);

      try {
        const session = await signIn();
        onSuccess?.(session);
      } catch (error) {
        if (error?.code !== "cancelled") {
          onError?.(
            error?.fieldMessages?.length
              ? error.fieldMessages.join(" ")
              : error?.message || "Sign-in failed, please try again.",
          );
        }
      } finally {
        setPending(null);
      }
    },
    [disabled, onError, onSuccess, pending],
  );

  if (!available.google) return null;

  const busy = disabled || Boolean(pending);

  return (
    <>
      <div className="social-separator">
        <span>or continue with</span>
      </div>

      <div className="social-login">
        {available.google && (
          <button
            type="button"
            className="google-btn"
            onClick={() => run("google", loginWithGoogle)}
            disabled={busy}
          >
            <FcGoogle className="social-icon" aria-hidden="true" />
            {pending === "google" ? "Connecting…" : "Continue with Google"}
          </button>
        )}
      </div>
    </>
  );
};

export default SocialAuthButtons;
