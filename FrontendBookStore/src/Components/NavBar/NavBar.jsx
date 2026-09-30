import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  BookOpen,
  Search,
  Heart,
  ShoppingCart,
  Menu,
  User,
  LogOut,
} from "lucide-react";
import "./NavBar.css";
import useAuth from "../../hooks/useAuth";
import { selectCartCount, selectWishlist } from "../../book/bookSelectors";

const Navbar = () => {
  const nav = useNavigate();
  const { session: userSession, signOut } = useAuth();
  const [mobileMenu, setMobileMenu] = useState(false);

  const cartCount = useSelector(selectCartCount);
  const wishlistCount = useSelector(selectWishlist).length;

  const closeMenu = () => setMobileMenu(false);

  const handleLogout = (e) => {
    e.preventDefault();
    closeMenu();
    signOut();
    nav("/");
  };

  const iconLink =
    "flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-cyan-500/15 hover:text-cyan-300 transition duration-300";

  const underline =
    "absolute left-0 -bottom-2 w-0 h-[3px] bg-cyan-300 transition-all duration-500 group-hover:w-full rounded-full";

  return (
    <nav className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-500 shadow-2xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 min-h-[88px] flex items-center justify-between gap-4">
        <Link
          to="/"
          className="flex items-center gap-4 group"
          aria-label="BookStore home"
        >
          <div className="w-14 h-14 rounded-full bg-white/10 ring-2 ring-white/20 shadow-2xl flex items-center justify-center transition duration-500 group-hover:scale-110">
            <div className="w-10 h-10 bg-gradient-to-br from-sky-300 via-fuchsia-500 to-cyan-300 rounded-full shadow-inner flex items-center justify-center">
              <BookOpen className="text-white" size={20} aria-hidden="true" />
            </div>
          </div>

          <div>
            <p className="text-2xl font-extrabold text-cyan-300 tracking-wide transition duration-300">
              BookStore
            </p>
            <p className="text-xs text-cyan-100 uppercase tracking-[0.22em]">
              Read &amp; Discover
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-4 text-white text-2xl">
          <ul className="hidden md:flex items-center gap-10 text-white font-semibold text-lg">
            <li className="relative group">
              <Link to="/">Home</Link>
              <span className={underline}></span>
            </li>

            <li className="relative group">
              <Link to="/about">About</Link>
              <span className={underline}></span>
            </li>

            <li className="relative group">
              <Link to="/books">Books</Link>
              <span className={underline}></span>
            </li>

            <li className="relative group">
              <Link to="/categories">Categories</Link>
              <span className={underline}></span>
            </li>
          </ul>
        </div>

        <div className="flex items-center gap-3 md:gap-4 text-white text-2xl">
          <Link to="/search" aria-label="Search books" className={iconLink}>
            <Search size={23} aria-hidden="true" />
          </Link>

          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className={`relative ${iconLink}`}
          >
            <Heart size={23} aria-hidden="true" />
            {wishlistCount > 0 && (
              <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1.5 text-[11px] font-bold leading-5 text-white shadow-lg">
                {wishlistCount > 99 ? "99+" : wishlistCount}
              </span>
            )}
          </Link>

          <Link
            to="/checkout"
            aria-label="Cart"
            className={`relative ${iconLink}`}
          >
            <ShoppingCart size={23} aria-hidden="true" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1.5 text-[11px] font-bold leading-5 text-white shadow-lg">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="md:hidden text-white"
            aria-label="Open the menu"
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            <Menu size={30} aria-hidden="true" />
          </button>

          {userSession?.signedIn ? (
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              className="hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-red-500/15 hover:text-red-300 transition duration-300"
            >
              <LogOut size={23} aria-hidden="true" />
            </button>
          ) : (
            <Link
              to="/signin"
              aria-label="Login"
              className="hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 hover:bg-cyan-500/15 hover:text-cyan-300 transition duration-300"
            >
              <User size={23} aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {mobileMenu && (
        <div className="md:hidden px-6 pb-4 animate-slideDown">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 flex flex-col gap-4 text-white font-semibold">
            <Link
              to="/"
              onClick={closeMenu}
              className="hover:text-cyan-300 transition"
            >
              Home
            </Link>

            <Link
              to="/about"
              onClick={closeMenu}
              className="hover:text-cyan-300 transition"
            >
              About
            </Link>

            <Link
              to="/books"
              onClick={closeMenu}
              className="hover:text-cyan-300 transition"
            >
              Books
            </Link>

            <Link
              to="/categories"
              onClick={closeMenu}
              className="hover:text-cyan-300 transition"
            >
              Categories
            </Link>

            {userSession?.signedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="text-left hover:text-cyan-300 transition"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/signin"
                onClick={closeMenu}
                className="hover:text-cyan-300 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
