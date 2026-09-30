import env from "../config/env";
import orderService from "./orderService";
import paymentService from "./paymentService";
import { getSession } from "./session";
import { priceOrder } from "../utils/pricing";

export const CHECKOUT_MODES = {
  STRIPE: "stripe",
  ORDER_ONLY: "order-only",
  PAYMENT_FAILED: "payment-failed",
  OFFLINE: "offline",
};

const isOfflineSession = () => {
  const session = getSession();
  return !session?.signedIn || Boolean(session.offline);
};

export const estimateTotals = (cart, { discount = 0 } = {}) =>
  priceOrder(cart, { discount });

export const submitCheckout = async ({ form, cart, notes }) => {
  if (isOfflineSession()) {
    if (!env.useLocalFallback) {
      throw new Error("Vous devez être connecté pour valider votre commande.");
    }
    return {
      mode: CHECKOUT_MODES.OFFLINE,
      message: "Session locale : la commande n'a pas été envoyée au serveur.",
    };
  }

  let order;

  try {
    order = await orderService.createOrderFromCheckout({ form, cart, notes });
  } catch (error) {
    if (error.isNetworkError && env.useLocalFallback) {
      return {
        mode: CHECKOUT_MODES.OFFLINE,
        message: "Serveur injoignable : commande enregistrée localement.",
      };
    }
    throw error;
  }

  try {
    const session = await paymentService.redirectToCheckout(order.id);
    return { mode: CHECKOUT_MODES.STRIPE, order, session };
  } catch (error) {
    if (error.isPaymentUnavailable) {
      return {
        mode: CHECKOUT_MODES.ORDER_ONLY,
        order,
        message: error.message,
      };
    }

    return {
      mode: CHECKOUT_MODES.PAYMENT_FAILED,
      order,
      message: error.message,
      messages: error.displayMessages ?? [error.message],
      retryable: Boolean(error.isCardDeclined),
    };
  }
};

export const confirmCheckout = (sessionId) =>
  paymentService.confirmCheckoutSession(sessionId);

const checkoutFlow = { submitCheckout, confirmCheckout, estimateTotals, CHECKOUT_MODES };

export default checkoutFlow;
