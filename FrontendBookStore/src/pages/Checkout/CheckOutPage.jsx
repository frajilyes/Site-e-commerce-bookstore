import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CreditCard,
  Truck,
  BookOpen,
  User,
  Phone,
  Mail,
  MapPin,
  Lock,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import {
  incrementQuantity,
  decrementQuantity,
  removeFromCart,
  placeOrder,
} from "../../book/bookSlice";
import { useNavigate, useLocation } from "react-router-dom";
import "./CheckOutPage.css";
import { optimizedImage } from "../../utils/imageUrl";
import useAuth from "../../hooks/useAuth";
import { priceOrder } from "../../utils/pricing";
import { formatPrice } from "../../utils/format";
import { submitCheckout, CHECKOUT_MODES } from "../../services/checkoutFlow";

import Seo from "../../Components/Seo";
export const CHECKOUT_FORM_KEY = "checkoutFormData";

const isEmailValid = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const isCardNumberValid = (value = "") =>
  /^\d{12,19}$/.test(value.replace(/\s+/g, ""));
const isExpiryValid = (value = "") => /^(0[1-9]|1[0-2])\/(\d{2})$/.test(value);
const isCvvValid = (value = "") => /^\d{3,4}$/.test(value);

const isExpiryInFuture = (value = "") => {
  const [month, year] = value.split("/");
  return new Date(2000 + Number(year), Number(month), 1) > new Date();
};

const validateFormData = (data, currentCart) => {
  const errors = [];
  if (!Array.isArray(currentCart) || currentCart.length === 0)
    errors.push("Your cart is empty.");
  if (!isEmailValid(data.contactEmail)) errors.push("Invalid contact email.");
  if (!data.contactPhone?.trim()) errors.push("Phone number is required.");
  if (!data.shipFirstName?.trim()) errors.push("First name is required.");
  if (!data.shipLastName?.trim()) errors.push("Last name is required.");
  if (!isEmailValid(data.shipEmail)) errors.push("Invalid shipping email.");
  if (!data.shipAddress?.trim()) errors.push("Shipping address is required.");
  if (!data.shipCity?.trim()) errors.push("City is required.");
  if (!data.shipCountry?.trim()) errors.push("Country is required.");
  if (!isCardNumberValid(data.cardNumber)) errors.push("Invalid card number.");
  if (!isExpiryValid(data.cardExpiry))
    errors.push("Invalid expiry date (MM/YY).");
  else if (!isExpiryInFuture(data.cardExpiry))
    errors.push("This card has expired.");
  if (!isCvvValid(data.cardCvv)) errors.push("Invalid CVV.");
  return errors;
};

const readSavedForm = () => {
  try {
    const saved = sessionStorage.getItem(CHECKOUT_FORM_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    return null;
  }
};

// The card number and the CVV never leave the form: sessionStorage survives
// reloads and is readable by any script on the origin, so we only keep what is
// needed to refill the shipping part of the form after a detour via /signin.
const saveFormWithoutCardSecrets = (form) => {
  const { cardNumber, cardCvv, ...safe } = form;
  try {
    sessionStorage.setItem(CHECKOUT_FORM_KEY, JSON.stringify(safe));
  } catch (error) {
  }
};

const BookstoreCheckout = () => {
  const [cardType, setCardType] = useState("Visa");
  const [showAlert, setShowAlert] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentErrors, setPaymentErrors] = useState([]);
  const [paidAt, setPaidAt] = useState(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [shipFirstName, setShipFirstName] = useState("");
  const [shipLastName, setShipLastName] = useState("");
  const [shipEmail, setShipEmail] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipCountry, setShipCountry] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const Nav = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isSignedIn } = useAuth();

  const autoPaymentRef = useRef(false);

  // Every deferred navigation/alert is registered here so leaving the page does
  // not fire a redirect or a setState on an unmounted component.
  const timersRef = useRef([]);
  const runLater = useCallback((callback, delay) => {
    const id = setTimeout(callback, delay);
    timersRef.current.push(id);
    return id;
  }, []);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    [],
  );

  const cart = useSelector((state) => state.book.cart);

  const {
    itemsPrice: subtotal,
    shippingPrice,
    taxPrice,
    totalPrice: total,
  } = priceOrder(cart);

  const collectFormData = () => ({
    contactEmail,
    contactPhone,
    shipFirstName,
    shipLastName,
    shipEmail,
    shipAddress,
    shipCity,
    shipCountry,
    cardNumber,
    cardExpiry,
    cardCvv,
    cardType,
  });

  const processPayment = useCallback(
    async (formData, cartData, totalAmount) => {
      setPaymentErrors([]);
      setPaymentStatus("pending");
      setShowAlert(true);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      const errors = validateFormData(formData, cartData);

      if (errors.length > 0) {
        setPaymentErrors(errors);
        setPaymentStatus("failed");
        return;
      }

      try {
        const result = await submitCheckout({ form: formData, cart: cartData });

        if (result.mode === CHECKOUT_MODES.STRIPE) return;

        if (result.mode === CHECKOUT_MODES.PAYMENT_FAILED) {
          setPaymentErrors(result.messages ?? [result.message]);
          setPaymentStatus("failed");
          return;
        }

        if (result.mode === CHECKOUT_MODES.ORDER_ONLY) {
          const placedAt = new Date().toLocaleString("en-US");
          setPaidAt(placedAt);
          setPaymentStatus("completed");
          dispatch(
            placeOrder({
              id: result.order.orderNumber || result.order.id,
              items: result.order.items,
              total: result.order.totalPrice,
              paidAt: placedAt,
            }),
          );
          try {
            sessionStorage.removeItem(CHECKOUT_FORM_KEY);
          } catch (storageError) {
          }
          runLater(() => {
            setShowAlert(false);
            Nav("/order-success", {
              state: {
                paidAt: placedAt,
                total: result.order.totalPrice.toFixed(2),
                orderId: result.order.orderNumber || result.order.id,
                pending: true,
              },
            });
          }, 3000);
          return;
        }

      } catch (apiError) {
        setPaymentErrors(
          apiError.fieldMessages?.length
            ? apiError.fieldMessages
            : [apiError.message],
        );
        setPaymentStatus("failed");
        return;
      }

      const now = new Date().toLocaleString("en-US");
      const orderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
      setPaidAt(now);
      setPaymentStatus("completed");
      dispatch(
        placeOrder({
          id: orderId,
          items: cartData,
          total: totalAmount,
          paidAt: now,
        }),
      );
      try {
        sessionStorage.removeItem(CHECKOUT_FORM_KEY);
      } catch (error) {
      }

      runLater(() => {
        setShowAlert(false);
        Nav("/order-success", {
          state: { paidAt: now, total: totalAmount.toFixed(2), orderId },
        });
      }, 5000);
    },
    [dispatch, Nav, runLater],
  );

  useEffect(() => {
    const data = readSavedForm();
    if (!data) return;

    setContactEmail(data.contactEmail || "");
    setContactPhone(data.contactPhone || "");
    setShipFirstName(data.shipFirstName || "");
    setShipLastName(data.shipLastName || "");
    setShipEmail(data.shipEmail || "");
    setShipAddress(data.shipAddress || "");
    setShipCity(data.shipCity || "");
    setShipCountry(data.shipCountry || "");
    setCardExpiry(data.cardExpiry || "");
    setCardType(data.cardType || "Visa");
  }, []);

  useEffect(() => {
    if (!location.state?.paymentPending || !isSignedIn) return;
    if (autoPaymentRef.current) return;

    const formData = readSavedForm();
    if (!formData) return;

    autoPaymentRef.current = true;

    Nav(location.pathname, { replace: true, state: {} });

    // The shipping details are back, but the card details were deliberately not
    // stored: the customer confirms the payment themselves.
    setPaymentErrors([]);
    setPaymentStatus("card-required");
    setShowAlert(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state?.paymentPending, isSignedIn]);

  const handlePayment = async (e) => {
    e.preventDefault();
    if (paymentStatus === "pending") return;

    const formData = collectFormData();

    if (!isSignedIn) {
      saveFormWithoutCardSecrets(formData);

      setPaymentErrors([]);
      setPaymentStatus("login-required");
      setShowAlert(true);

      runLater(() => {
        setShowAlert(false);
        Nav("/signin", {
          state: {
            returnTo: "/checkout",
            paymentPending: true,
          },
        });
      }, 2200);
      return;
    }

    await processPayment(formData, cart, total);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      <Seo title="Checkout" path="/checkout" noindex />
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1512820790803-83ca734da794?q=55&w=1280&auto=format&fit=crop"
          loading="lazy"
          decoding="async"
          alt="Bookstore"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-gradient-to-br to-black"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-bounce"></div>
      </div>

      {showAlert && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className={`payment-alert ${paymentStatus}`}>
            {paymentStatus === "pending" && (
              <>
                <div className="alert-spinner"></div>
                <div>
                  <h3>Payment Processing...</h3>
                  <p>Please wait while we verify your payment.</p>
                </div>
              </>
            )}
            {paymentStatus === "completed" && (
              <>
                <div className="alert-success-icon">✓</div>
                <div>
                  <h3>Payment Confirmed</h3>
                  <p>Your order has been successfully placed.</p>
                  <small>Paid at : {paidAt}</small>
                </div>
              </>
            )}
            {paymentStatus === "login-required" && (
              <>
                <div className="alert-login-icon">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3>Login Required</h3>
                  <p>Please log in to complete your payment successfully.</p>
                  <small>Redirecting you to the login page…</small>
                </div>
              </>
            )}
            {paymentStatus === "card-required" && (
              <>
                <button
                  className="alert-close"
                  onClick={() => setShowAlert(false)}
                >
                  ✕
                </button>
                <div className="alert-login-icon">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3>You are signed in</h3>
                  <p>
                    Your shipping details are back. For security reasons the
                    card number and CVV were not stored — please enter them
                    again and confirm the payment.
                  </p>
                </div>
              </>
            )}
            {paymentStatus === "failed" && (
              <>
                <button
                  className="alert-close"
                  onClick={() => setShowAlert(false)}
                >
                  ✕
                </button>
                <div className="alert-error-icon">!</div>
                <div>
                  <h3>Payment Failed</h3>
                  <p>Please fix the following issues :</p>
                  <ul className="alert-error-list">
                    {paymentErrors.map((error, index) => (
                      // eslint-disable-next-line react/no-array-index-key -- messages can repeat
                      <li key={`${error}-${index}`}>{error}</li>
                    ))}
                  </ul>
                  <small>
                    Attempted at : {new Date().toLocaleString("en-US")}
                  </small>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 container mx-auto px-6 py-12">
        <h1 className="text-5xl font-extrabold text-center mb-12 bg-gradient-to-r from-pink-400 to-cyan-400 text-transparent bg-clip-text">
          Bookstore Checkout
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <User className="text-pink-400" />
                <h2 className="text-2xl font-bold">Contact</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm text-gray-300">Email :</label>
                  <div className="relative mt-2">
                    <Mail className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      placeholder="example@email.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-pink-400 transition"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-300">
                    Phone Number :
                  </label>
                  <div className="relative mt-2">
                    <Phone className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="+1 234 567 890"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-pink-400 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <Truck className="text-cyan-400" />
                <h2 className="text-2xl font-bold">Shipping</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <input
                  type="text"
                  placeholder="First Name"
                  required
                  value={shipFirstName}
                  onChange={(e) => setShipFirstName(e.target.value)}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  required
                  value={shipLastName}
                  onChange={(e) => setShipLastName(e.target.value)}
                  className="input"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  value={shipEmail}
                  onChange={(e) => setShipEmail(e.target.value)}
                  className="input md:col-span-2"
                />
                <div className="relative md:col-span-2">
                  <MapPin className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Address"
                    value={shipAddress}
                    onChange={(e) => setShipAddress(e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-cyan-400 transition"
                  />
                </div>
                <input
                  type="text"
                  placeholder="City"
                  required
                  value={shipCity}
                  onChange={(e) => setShipCity(e.target.value)}
                  className="input"
                />
                <input
                  type="text"
                  placeholder="Country"
                  required
                  value={shipCountry}
                  onChange={(e) => setShipCountry(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <CreditCard className="text-yellow-400" />
                <h2 className="text-2xl font-bold">Payment</h2>
              </div>
              <form onSubmit={handlePayment}>
                <div className="space-y-5">
                  <select
                    value={cardType}
                    required
                    onChange={(e) => setCardType(e.target.value)}
                    className="input"
                  >
                    <option>Visa</option>
                    <option>MasterCard</option>
                    <option>PayPal</option>
                    <option>American Express</option>
                  </select>

                  <div className="relative">
                    <CreditCard className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Card Number"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-yellow-400 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="input"
                    />
                    <div className="relative">
                      <Lock className="absolute top-3 left-3 text-gray-400 w-5 h-5" />
                      <input
                        type="password"
                        placeholder="CVV"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-yellow-400 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={paymentStatus === "pending"}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-lg font-bold shadow-2xl hover:scale-105 transition-all duration-300 animate-pulse disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:animate-none"
                  >
                    {paymentStatus === "pending"
                      ? "Processing..."
                      : "Confirm Payment"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl h-fit sticky top-10">
            <div className="flex items-center gap-3 mb-8">
              <BookOpen className="text-pink-400" />
              <h2 className="text-2xl font-bold">Order Summary</h2>
            </div>

            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-10">
                <BookOpen className="mx-auto mb-4 w-12 h-12 opacity-30" />
                <p>Your cart is empty.</p>
                <p className="text-sm mt-1">Add books from the store!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {cart.map((book) => (
                  <div
                    key={book.id}
                    className="flex justify-between items-center border-b border-white/10 pb-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={optimizedImage(book.image, 96)}
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-sm">{book.title}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => dispatch(decrementQuantity(book.id))}
                            className="px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition"
                          >
                            -
                          </button>
                          <span className="text-gray-400 text-sm">
                            {book.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => dispatch(incrementQuantity(book.id))}
                            className="px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => dispatch(removeFromCart(book.id))}
                            className="ml-2 text-xs text-red-400 hover:text-red-500 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                    <span className="font-bold text-sm">
                      {formatPrice(book.price * book.quantity)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between pt-4">
                  <span className="text-gray-300">Subtotal :</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Shipping :</span>
                  <span>
                    {shippingPrice === 0 ? "Free" : formatPrice(shippingPrice)}
                  </span>
                </div>
                {taxPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Tax :</span>
                    <span>{formatPrice(taxPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-bold border-t border-white/20 pt-6">
                  <span>Total :</span>
                  <span className="text-cyan-400">{formatPrice(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookstoreCheckout;
