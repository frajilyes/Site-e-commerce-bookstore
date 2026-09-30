import { useCallback, useSyncExternalStore } from "react";
import {
  clearSession,
  getSession,
  setSession,
  subscribeToSession,
} from "../services/session";
import env from "../config/env";

const loadAuthService = () =>
  import("../services/authService").then((module) => module.default);

const getServerSnapshot = () => null;

const offlineSession = (email) => ({
  signedIn: true,
  token: null,
  email: email || "reader@bookstore.com",
  name: "",
  role: "user",
  user: null,
  offline: true,
});

const canFallBack = (error) => env.useLocalFallback && error?.isNetworkError;

const useAuth = () => {
  const session = useSyncExternalStore(
    subscribeToSession,
    getSession,
    getServerSnapshot,
  );

  const login = useCallback(async ({ email, password }) => {
    try {
      const authService = await loadAuthService();
      return await authService.login({ email, password });
    } catch (error) {
      if (!canFallBack(error)) throw error;
      const fallback = offlineSession(email);
      setSession(fallback);
      return fallback;
    }
  }, []);

  const register = useCallback(async ({ fullName, email, password }) => {
    try {
      const authService = await loadAuthService();
      return await authService.register({ fullName, email, password });
    } catch (error) {
      if (!canFallBack(error)) throw error;
      const fallback = offlineSession(email);
      setSession(fallback);
      return { ...fallback, requiresVerification: false };
    }
  }, []);

  const verifyEmail = useCallback(
    async ({ email, code }) =>
      (await loadAuthService()).verifyEmail({ email, code }),
    [],
  );

  const resendVerification = useCallback(
    async (email) => (await loadAuthService()).resendVerification(email),
    [],
  );

  const forgotPassword = useCallback(
    async (email) => (await loadAuthService()).forgotPassword(email),
    [],
  );

  const resetPassword = useCallback(
    async ({ email, code, password }) =>
      (await loadAuthService()).resetPassword({ email, code, password }),
    [],
  );

  const loginWithGoogle = useCallback(async () => {
    const [{ signInWithGoogle }, authService] = await Promise.all([
      import("../services/socialAuth"),
      loadAuthService(),
    ]);
    const { credential, accessToken } = await signInWithGoogle();
    return authService.loginWithGoogle(
      credential ? { credential } : { accessToken },
    );
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    return loadAuthService().then((authService) => authService.logout());
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isSignedIn: Boolean(session?.signedIn),
    isAdmin: session?.role === "admin",
    isOffline: Boolean(session?.offline),
    isEmailVerified: Boolean(session?.user?.emailVerified),
    login,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    loginWithGoogle,
    signIn: setSession,
    signOut,
  };
};

export default useAuth;
