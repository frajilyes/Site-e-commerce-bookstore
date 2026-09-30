import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import { adaptOrder, adaptOrders, adaptPagination, PAYMENT_METHODS } from "./adapters";


export const toShippingAddress = (form = {}) => ({
  firstName: form.shipFirstName ?? form.firstName ?? "",
  lastName: form.shipLastName ?? form.lastName ?? "",
  email: form.shipEmail ?? form.email ?? form.contactEmail ?? "",
  phone: form.contactPhone ?? form.phone ?? "",
  address: form.shipAddress ?? form.address ?? "",
  city: form.shipCity ?? form.city ?? "",
  postalCode: form.shipPostalCode ?? form.postalCode ?? "",
  country: form.shipCountry ?? form.country ?? "",
});

export const toPaymentMethod = (cardType) =>
  PAYMENT_METHODS.includes(cardType) ? cardType : "Stripe";

export const toOrderItems = (cart = []) =>
  cart
    .map((item) => ({
      book: String(item.bookId ?? item._id ?? item.id ?? ""),
      quantity: Math.max(Number(item.quantity) || 1, 1),
    }))
    .filter((item) => /^[a-f\d]{24}$/i.test(item.book));

export const createOrder = (payload) =>
  httpClient.post(routes.orders.create, payload).then(({ data }) => adaptOrder(data));

export const createOrderFromCheckout = ({ form, cart, notes }) =>
  createOrder({
    shippingAddress: toShippingAddress(form),
    items: toOrderItems(cart),
    paymentMethod: toPaymentMethod(form?.cardType),
    ...(notes ? { notes } : {}),
  });

export const getMyOrders = async (params = {}, { signal } = {}) => {
  const response = await httpClient.get(routes.orders.mine, { params, signal });
  return {
    orders: adaptOrders(response.data),
    pagination: adaptPagination(response.meta),
  };
};

export const getOrderById = (id, { signal } = {}) =>
  httpClient
    .get(routes.orders.detail(id), { signal })
    .then(({ data }) => adaptOrder(data));

export const cancelOrder = (id, reason) =>
  httpClient
    .patch(routes.orders.cancel(id), reason ? { reason } : {})
    .then(({ data }) => adaptOrder(data));


export const getAllOrders = async (params = {}) => {
  const response = await httpClient.get(routes.orders.create, { params });
  return {
    orders: adaptOrders(response.data),
    pagination: adaptPagination(response.meta),
  };
};

export const updateOrderStatus = (id, status) =>
  httpClient
    .patch(routes.orders.status(id), { status })
    .then(({ data }) => adaptOrder(data));

export const getOrderStats = () =>
  httpClient.get(routes.orders.stats).then(({ data }) => data);

const orderService = {
  toShippingAddress,
  toPaymentMethod,
  toOrderItems,
  createOrder,
  createOrderFromCheckout,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  getOrderStats,
};

export default orderService;
