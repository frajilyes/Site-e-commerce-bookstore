import React from "react";
import { motion } from "framer-motion";
import "./NotFound.css";

import Seo from "../../Components/Seo";
const NotFoundPage = () => {
  return (
    <div className="notfound-container">
      <Seo title="Page not found" noindex />
      <div className="overlay"></div>

      <motion.div
        className="content"
        initial={{ opacity: 0, y: 80 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <motion.h1
          className="error-code"
          animate={{ rotate: [0, 2, -2, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          404
        </motion.h1>

        <h2>Oops! Page Not Found 📖</h2>
        <p>
          The page you are looking for might have been removed or is temporarily
          unavailable.
        </p>

        <div className="buttons">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => (window.location.href = "/")}
          >
            Back to Home
          </motion.button>

          <motion.button
            className="secondary"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.history.back()}
          >
            Go Back
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
