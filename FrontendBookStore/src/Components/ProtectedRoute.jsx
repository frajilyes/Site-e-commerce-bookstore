import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const ProtectedRoute = ({ children, redirectTo = "/signin" }) => {
  const { isSignedIn } = useAuth();
  const location = useLocation();

  if (!isSignedIn) {
    return (
      <Navigate
        to={redirectTo}
        replace
        state={{ returnTo: location.pathname + location.search }}
      />
    );
  }

  return children;
};

export default ProtectedRoute;
