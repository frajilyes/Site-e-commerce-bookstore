import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import { clearSession, sessionFromAuthPayload, setSession } from "./session";

export const getMe = ({ signal } = {}) =>
  httpClient.get(routes.auth.me, { signal }).then(({ data }) => data);

export const updateMe = (updates) =>
  httpClient.patch(routes.auth.me, updates).then(({ data }) => data);

export const updatePassword = async ({ currentPassword, newPassword }) => {
  const { data } = await httpClient.patch(routes.auth.password, {
    currentPassword,
    newPassword,
  });
  const session = sessionFromAuthPayload(data);
  setSession(session);
  return session;
};

export const deleteMe = async () => {
  await httpClient.delete(routes.auth.me);
  clearSession();
};

export const addAddress = (address) =>
  httpClient.post(routes.auth.addresses, address).then(({ data }) => data);

export const deleteAddress = (addressId) =>
  httpClient.delete(routes.auth.address(addressId)).then(({ data }) => data);

export const getAllUsers = (params = {}, { signal } = {}) =>
  httpClient
    .get(routes.auth.users, { params, signal })
    .then((response) => ({ users: response.data ?? [], ...response.meta }));

export const getUserById = (id) =>
  httpClient.get(routes.auth.user(id)).then(({ data }) => data);

export const updateUser = (id, updates) =>
  httpClient.patch(routes.auth.user(id), updates).then(({ data }) => data);

export const deleteUser = (id) =>
  httpClient.delete(routes.auth.user(id)).then((response) => response.meta);

const userService = {
  getMe,
  updateMe,
  updatePassword,
  deleteMe,
  addAddress,
  deleteAddress,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};

export default userService;
