import React, { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import Seo from "../Components/Seo";
import env from "../config/env";

const revealHeroBackdrop = () => {
  const backdrop = document.getElementById("hero-backdrop");
  const image = backdrop?.querySelector("img");
  if (!image || image.getAttribute("src")) return;

  const source = backdrop.querySelector("source");
  if (source?.dataset.srcset) source.srcset = source.dataset.srcset;
  image.srcset = image.dataset.srcset ?? "";
  image.src = image.dataset.src ?? "";
};

const HomePage = () => {
  useLayoutEffect(() => {
    document.getElementById("app-shell")?.remove();
    document.documentElement.classList.remove("off-home");
    revealHeroBackdrop();
    return () => document.documentElement.classList.add("off-home");
  }, []);

  return (
    <>
      <Seo
        path="/"
        description="Discover thousands of books, novels, manga and bestsellers. Wishlist, ratings, quick view and secure checkout on BookStore."
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": `${env.siteUrl}/#organization`,
              name: "BookStore",
              url: `${env.siteUrl}/`,
              logo: `${env.siteUrl}/logo512.png`,
            },
            {
              "@type": "WebSite",
              "@id": `${env.siteUrl}/#website`,
              name: "BookStore - Read & Discover",
              url: `${env.siteUrl}/`,
              publisher: { "@id": `${env.siteUrl}/#organization` },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${env.siteUrl}/search?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }}
      />

      <div className="relative min-h-screen overflow-hidden">
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>

        <div className="relative z-10 flex flex-col justify-center items-start min-h-screen px-10 md:px-24 text-white">
          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight max-w-4xl">
            Discover Your{" "}
            <span className="text-cyan-300/80 font-semibold">
              Next Favorite
            </span>{" "}
            Book
          </h1>

          <p className="mt-6 text-lg md:text-2xl text-gray-200 max-w-2xl">
            Explore thousands of books, novels, mangas and bestsellers with a
            premium modern shopping experience.
          </p>

          <div className="flex gap-6 mt-10">
            <Link
              to="/books"
              className="px-8 py-4 bg-cyan-500 text-white rounded-xl text-lg font-bold hover:scale-105 transition duration-300 shadow-2xl"
            >
              Shop Now
            </Link>

            <Link
              to="/about"
              className="px-8 py-4 border border-white rounded-xl text-lg font-bold hover:bg-white hover:text-black transition duration-300"
            >
              Explore
            </Link>
          </div>
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute top-20 left-20 text-7xl opacity-20"
            aria-hidden="true"
          >
            📖
          </div>
          <div
            className="absolute bottom-32 right-20 text-8xl opacity-20"
            aria-hidden="true"
          >
            📘
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center text-white px-6">
          <h2 className="text-6xl font-bold mb-6">Welcome To BookStore</h2>
          <p className="text-xl text-gray-300 max-w-2xl">
            Discover thousands of books, novels and best sellers with a modern
            shopping experience.
          </p>
        </div>
      </div>
    </>
  );
};

export default HomePage;
