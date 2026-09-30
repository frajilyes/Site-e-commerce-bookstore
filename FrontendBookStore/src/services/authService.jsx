import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import env from "../config/env";
import { clearSession, sessionFromAuthPayload, setSession } from "./session";
import userService from "./userService";


const persist = (payload) => {
  const session = sessionFromAuthPayload(payload);
  setSession(session);
  return session;
};

export const register = async ({ fullName, email, password }) => {
  const { data } = await httpClient.post(routes.auth.register, {
    fullName,
    email,
    password,
  });
  return data;
};

export const verifyEmail = async ({ email, code }) => {
  const { data } = await httpClient.post(routes.auth.verifyEmail, {
    email,
    code,
  });
  return persist(data);
};

export const resendVerification = async (email) => {
  const { data } = await httpClient.post(routes.auth.resendVerification, {
    email,
  });
  return data;
};

export const login = async ({ email, password }) => {
  const { data } = await httpClient.post(routes.auth.login, {
    email,
    password,
  });
  return persist(data);
};

export const forgotPassword = async (email) => {
  const { data } = await httpClient.post(routes.auth.forgotPassword, { email });
  return data;
};

export const resetPassword = async ({ email, code, password }) => {
  const { data } = await httpClient.post(routes.auth.resetPassword, {
    email,
    code,
    password,
  });
  return persist(data);
};

export const loginWithGoogle = async (payload) => {
  const { data } = await httpClient.post(routes.auth.google, payload);
  return persist(data);
};

export const getAuthProviders = () =>
  httpClient.get(routes.auth.providers).then(({ data }) => data);

export const logout = async () => {
  try {
    await httpClient.post(routes.auth.logout);
  } catch (error) {
  }
  clearSession();
};

export const refresh = async () => {
  const { data } = await httpClient.post(routes.auth.refresh);
  return persist(data);
};


export const {
  getMe,
  updateMe,
  updatePassword,
  deleteMe,
  addAddress,
  deleteAddress,
} = userService;

export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${env.serverUrl}${routes.health}`, {
      credentials: "include",
    });
    const body = await response.json();
    return { online: response.ok, ...body };
  } catch (error) {
    return { online: false, status: "unreachable", database: "unknown" };
  }
};

const authService = {
  register,
  verifyEmail,
  resendVerification,
  login,
  forgotPassword,
  resetPassword,
  loginWithGoogle,
  getAuthProviders,
  logout,
  refresh,
  getMe,
  updateMe,
  updatePassword,
  deleteMe,
  addAddress,
  deleteAddress,
  checkApiHealth,
};

export default authService;
