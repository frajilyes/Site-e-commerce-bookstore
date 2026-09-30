import env from "../config/env";

const GOOGLE_SDK = "https://accounts.google.com/gsi/client";

export const isGoogleEnabled = () => Boolean(env.googleClientId);

const cancelled = (message) => {
  const error = new Error(message);
  error.code = "cancelled";
  return error;
};

const loaded = new Map();

const loadScript = (src, id) => {
  if (loaded.has(id)) return loaded.get(id);

  const promise = new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === "true") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error(`Failed to load ${src}`)),
      );
      return undefined;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      loaded.delete(id);
      script.remove();
      reject(
        new Error(
          "The provider SDK could not be loaded (network or ad blocker).",
        ),
      );
    };
    document.head.appendChild(script);
    return undefined;
  });

  loaded.set(id, promise);
  return promise;
};

const loadGoogle = async () => {
  await loadScript(GOOGLE_SDK, "google-identity-services");
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services is unavailable");
  }
  return window.google.accounts.oauth2;
};

export const signInWithGoogle = async () => {
  if (!isGoogleEnabled()) throw new Error("Google sign-in is not configured");

  const oauth2 = await loadGoogle();

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: env.googleClientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response?.access_token)
          return resolve({ accessToken: response.access_token });
        return reject(
          new Error(response?.error_description || "Google sign-in failed"),
        );
      },
      error_callback: (error) => {
        if (String(error?.type || "").startsWith("popup")) {
          return reject(cancelled("Google sign-in was cancelled"));
        }
        return reject(new Error(error?.message || "Google sign-in failed"));
      },
    });

    client.requestAccessToken();
  });
};

export const preloadSocialSdks = () => {
  if (isGoogleEnabled()) loadGoogle().catch(() => {});
};

const socialAuth = {
  isGoogleEnabled,
  signInWithGoogle,
  preloadSocialSdks,
};

export default socialAuth;
