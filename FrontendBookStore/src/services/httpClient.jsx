import axios from "axios";
import env from "../config/env";
import routes from "../config/apiRoutes";
import { toApiError } from "./apiError";
import {
  clearSession,
  getAuthToken,
  getSession,
  updateSession,
} from "./session";

const httpClient = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});


httpClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  return config;
});


const isEnvelope = (body) =>
  body !== null &&
  typeof body === "object" &&
  "success" in body &&
  !Array.isArray(body);

const unwrap = (response) => {
  const body = response.data;
  if (!isEnvelope(body)) return response;

  const { success, data, message, ...meta } = body;
  response.meta = { success, message, ...meta };
  response.data = data !== undefined ? data : null;
  return response;
};


const refreshClient = axios.create({
  baseURL: env.apiUrl,
  timeout: env.apiTimeout,
  withCredentials: true,
});

const NO_REFRESH = [
  routes.auth.login,
  routes.auth.register,
  routes.auth.verifyEmail,
  routes.auth.resendVerification,
  routes.auth.forgotPassword,
  routes.auth.resetPassword,
  routes.auth.google,
  routes.auth.refresh,
  routes.auth.logout,
];

let pendingRefresh = null;

const refreshAccessToken = () => {
  if (!pendingRefresh) {
    pendingRefresh = refreshClient
      .post(routes.auth.refresh)
      .then(({ data }) => {
        const payload = data?.data ?? data;
        if (!payload?.accessToken) throw new Error("No access token returned");
        updateSession({ token: payload.accessToken, user: payload.user });
        return payload.accessToken;
      })
      .finally(() => {
        pendingRefresh = null;
      });
  }
  return pendingRefresh;
};

httpClient.interceptors.response.use(unwrap, async (error) => {
  const config = error.config || {};
  const status = error.response?.status;

  const canRetry =
    status === 401 &&
    !config.__isRetry &&
    !NO_REFRESH.includes(config.url) &&
    Boolean(getSession());

  if (canRetry) {
    try {
      const token = await refreshAccessToken();
      config.__isRetry = true;
      config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
      return unwrap(await httpClient.request(config));
    } catch (refreshError) {
      clearSession();
    }
  } else if (status === 401) {
    clearSession();
  }

  const apiError = toApiError(error);

  if (!env.isProduction && apiError.code !== "cancelled") {
    console.error(
      `[api] ${config.method?.toUpperCase() ?? "GET"} ${config.url ?? ""} -> ${
        apiError.status
      } ${apiError.message}`,
    );
  }

  return Promise.reject(apiError);
});

export default httpClient;
