import React from "react";
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaLinkedinIn,
  FaBookOpen,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaEnvelope,
} from "react-icons/fa";

import "./Footer.css";
import { Link } from "react-router-dom";

const SOCIALS = [
  { href: "https://www.facebook.com", label: "Facebook", Icon: FaFacebookF },
  { href: "https://www.instagram.com", label: "Instagram", Icon: FaInstagram },
  { href: "https://twitter.com", label: "X (Twitter)", Icon: FaTwitter },
  { href: "https://www.linkedin.com", label: "LinkedIn", Icon: FaLinkedinIn },
];

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <div className="footer-logo">
            <FaBookOpen aria-hidden="true" /> BookStore
          </div>

          <p>
            Discover thousands of books, novels, manga, academic titles and
            bestsellers at the best price.
          </p>

          <div className="footer-socials">
            {SOCIALS.map(({ href, label, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                aria-label={`BookStore on ${label}`}
              >
                <Icon aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>

        <div className="footer-section">
          <h3>Quick Links</h3>

          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>

            <li>
              <Link to="/books">Books</Link>
            </li>

            <li>
              <Link to="/wishlist">Favoritelist</Link>
            </li>

            <li>
              <Link to="/categories">Categories</Link>
            </li>

            <li>
              <Link to="/search">Search</Link>
            </li>

            <li>
              <Link to="/about">About</Link>
            </li>
          </ul>
        </div>

        <div className="footer-section">
          <h3>Contact</h3>

          <p className="footer-contact-item">
            <FaMapMarkerAlt />
            <span>Kasserine, Tunisie</span>
          </p>

          <p className="footer-contact-item">
            <FaPhoneAlt />
            <span>+216 XX XXX XXX</span>
          </p>

          <p className="footer-contact-item">
            <FaEnvelope />
            <span>contact@bookstore.com</span>
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        © 2026 BookStore | All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
