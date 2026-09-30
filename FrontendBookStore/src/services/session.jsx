const STORAGE_KEY = "userSession";
const CHANGE_EVENT = "storage";

let cachedRaw = null;
let cachedSession = null;

let accessToken = null;

const read = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

const notify = () => window.dispatchEvent(new Event(CHANGE_EVENT));

export const getSession = () => {
  const raw = read();
  if (raw === cachedRaw) return cachedSession;
  cachedRaw = raw;
  try {
    cachedSession = raw ? JSON.parse(raw) : null;
  } catch (error) {
    cachedSession = null;
  }
  return cachedSession;
};

export const isSignedIn = () => Boolean(getSession()?.signedIn);

export const setSession = (session) => {
  const { token, ...profile } = session || {};
  if (token !== undefined) accessToken = token;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
  }
  notify();
};

export const updateSession = (patch) => {
  const current = getSession() || {};
  setSession({ ...current, ...patch, signedIn: true });
};

export const clearSession = () => {
  accessToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
  }
  notify();
};

export const subscribeToSession = (listener) => {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
};

export const getAuthToken = () => accessToken;

(() => {
  const legacy = getSession();
  if (legacy && "token" in legacy) {
    const { token, ...profile } = legacy;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
    }
  }
})();

export const sessionFromAuthPayload = (payload) => ({
  signedIn: true,
  token: payload?.accessToken ?? null,
  email: payload?.user?.email ?? "",
  name: payload?.user?.fullName ?? "",
  role: payload?.user?.role ?? "user",
  user: payload?.user ?? null,
  offline: !payload?.accessToken,
});

export const getUser = () => getSession()?.user ?? null;

export const getUserId = () => getUser()?.id ?? null;

export const isAdmin = () => getSession()?.role === "admin";
