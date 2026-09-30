import React, { Suspense, lazy } from "react";
import "./App.css";
import { Route, Routes } from "react-router-dom";
import NavBar from "./Components/NavBar/NavBar";
import HomePage from "./pages/HomePage";
import Loader from "./Components/Loader/Loader";
import ErrorBoundary from "./Components/ErrorBoundary";
import ScrollToTop from "./Components/ScrollToTop";
import ProtectedRoute from "./Components/ProtectedRoute";
import useCartSync from "./hooks/useCartSync";

const Footer = lazy(() => import("./Components/Footer/Footer"));
const WelcomeAlert = lazy(
  () => import("./Components/WelcomeAlert/WelcomeAlert"),
);

const BookCard = lazy(() => import("./book/BookCard"));
const BookDetailsPage = lazy(() => import("./book/BookDetailsPage"));
const CheckOutPage = lazy(() => import("./pages/Checkout/CheckOutPage"));
const OrderSuccess = lazy(() => import("./pages/Checkout/OrderSuccess"));
const CheckoutSuccess = lazy(() => import("./pages/Checkout/CheckoutSuccess"));
const CheckoutCancel = lazy(() => import("./pages/Checkout/CheckoutCancel"));
const ReviewPage = lazy(() => import("./pages/Checkout/ReviewPage"));
const NotFoundPage = lazy(() => import("./pages/NotFound/NotFoundPage"));
const SignIn = lazy(() => import("./Components/Sign/SignIn"));
const SignUp = lazy(() => import("./Components/Sign/SignUp"));
const VerifyEmail = lazy(() => import("./Components/Sign/VerifyEmail"));
const ForgotPassword = lazy(() => import("./Components/Sign/ForgotPassword"));
const ResetPassword = lazy(() => import("./Components/Sign/ResetPassword"));
const AboutAdvanced = lazy(() => import("./Components/About/About"));
const Categories = lazy(() => import("./Components/Categories/Categories"));
const WishList = lazy(() => import("./Components/WishList/WishList"));
const SearchBooks = lazy(() => import("./Components/SearchBook/SearchBook"));
const Api = lazy(() => import("./Api"));

const App = () => {
  useCartSync();

  return (
    <div className="App">
      <ScrollToTop />
      <Suspense fallback={null}>
        <WelcomeAlert />
      </Suspense>
      <NavBar />
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <ErrorBoundary>
          <Suspense fallback={<Loader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/books" element={<BookCard />} />
              <Route path="/books/:id" element={<BookDetailsPage />} />
              <Route path="/checkout" element={<CheckOutPage />} />
              <Route
                path="/checkout/success"
                element={
                  <ProtectedRoute>
                    <CheckoutSuccess />
                  </ProtectedRoute>
                }
              />
              <Route path="/checkout/cancel" element={<CheckoutCancel />} />
              <Route
                path="/order-success"
                element={
                  <ProtectedRoute>
                    <OrderSuccess />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/review"
                element={
                  <ProtectedRoute>
                    <ReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<AboutAdvanced />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/wishlist" element={<WishList />} />
              <Route path="/search" element={<SearchBooks />} />
              <Route path="/api" element={<Api />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default App;
