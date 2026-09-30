import httpClient from "./httpClient";
import routes from "../config/apiRoutes";
import { adaptOrder, adaptPayment } from "./adapters";

export const createCheckoutSession = (orderId) =>
  httpClient
    .post(routes.payments.checkoutSession, { orderId })
    .then(({ data }) => data);

export const redirectToCheckout = async (orderId) => {
  const session = await createCheckoutSession(orderId);
  if (!session?.url) {
    throw new Error("Stripe n'a pas renvoyé d'URL de paiement.");
  }
  let target;
  try {
    target = new URL(session.url);
  } catch (error) {
    target = null;
  }
  if (!target || target.protocol !== "https:" || target.hostname !== "checkout.stripe.com") {
    throw new Error("URL de paiement inattendue.");
  }
  window.location.assign(target.href);
  return session;
};

export const createPaymentIntent = (orderId) =>
  httpClient
    .post(routes.payments.paymentIntent, { orderId })
    .then(({ data }) => data);

export const confirmCheckoutSession = async (sessionId) => {
  const { data } = await httpClient.get(routes.payments.session(sessionId));
  return { paid: Boolean(data?.paid), order: adaptOrder(data?.order) };
};

export const getMyPayments = ({ signal } = {}) =>
  httpClient
    .get(routes.payments.mine, { signal })
    .then(({ data }) => (Array.isArray(data) ? data.map(adaptPayment) : []));

export const getPaymentById = (id) =>
  httpClient.get(routes.payments.detail(id)).then(({ data }) => adaptPayment(data));

export const createPayment = ({ orderId, form, paymentMethod }) =>
  httpClient
    .post(routes.payments.create, {
      orderId,
      contact: {
        email: form?.contactEmail ?? form?.shipEmail ?? "",
        phone: form?.contactPhone ?? "N/A",
      },
      shipping: {
        firstName: form?.shipFirstName ?? "",
        lastName: form?.shipLastName ?? "",
        email: form?.shipEmail ?? form?.contactEmail ?? "",
        address: form?.shipAddress ?? "",
        city: form?.shipCity ?? "",
        postalCode: form?.shipPostalCode ?? "",
        country: form?.shipCountry ?? "",
      },
      ...(paymentMethod ? { paymentMethod } : {}),
    })
    .then(({ data }) => adaptPayment(data));

const paymentService = {
  createCheckoutSession,
  redirectToCheckout,
  createPaymentIntent,
  confirmCheckoutSession,
  getMyPayments,
  getPaymentById,
  createPayment,
};

export default paymentService;
