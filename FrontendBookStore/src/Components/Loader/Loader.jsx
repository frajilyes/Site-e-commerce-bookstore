import React from "react";
import "./Loader.css";

const Loader = ({ label = "Loading…", fullscreen = true }) => (
  <div
    className={`bs-loader ${fullscreen ? "bs-loader--full" : ""}`}
    role="status"
    aria-live="polite"
  >
    <span className="bs-loader__ring" />
    <span className="bs-loader__label">{label}</span>
  </div>
);

export default Loader;
