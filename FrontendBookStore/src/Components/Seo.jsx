import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import env from "../config/env";

const BASE_TITLE = "BookStore";
const SITE_NAME = "BookStore - Read & Discover";
const DEFAULT_DESCRIPTION =
  "BookStore - buy novels, bestsellers, manga and programming books online with wishlist, ratings and secure checkout.";

const OWNED = "data-seo";

const upsertMeta = (attr, key, content) => {
  if (!content) return;
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  if (!tag.hasAttribute(OWNED)) {
    tag.setAttribute(OWNED, tag.getAttribute("content") ?? "");
  }
  tag.setAttribute("content", content);
};

const upsertLink = (rel, href) => {
  if (!href) return;
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", rel);
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", href);
};

const restoreMeta = () => {
  document.head.querySelectorAll(`meta[${OWNED}]`).forEach((tag) => {
    const original = tag.getAttribute(OWNED);
    if (original) tag.setAttribute("content", original);
    tag.removeAttribute(OWNED);
  });
};

const Seo = ({
  title,
  description = DEFAULT_DESCRIPTION,
  path,
  image = "/logo512.png",
  type = "website",
  noindex = false,
  jsonLd,
}) => {
  const location = useLocation();
  const pathname = path ?? location.pathname;
  const serialized = jsonLd ? JSON.stringify(jsonLd) : null;

  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE_TITLE}` : SITE_NAME;
    const canonical = `${env.siteUrl}${pathname}`;
    const imageUrl = /^https?:/i.test(image) ? image : `${env.siteUrl}${image}`;

    document.title = fullTitle;

    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noindex ? "noindex, follow" : "index, follow");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", imageUrl);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", imageUrl);

    upsertLink("canonical", canonical);

    return restoreMeta;
  }, [title, description, pathname, image, type, noindex]);

  useEffect(() => {
    if (!serialized) return undefined;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = serialized;
    document.head.appendChild(script);

    return () => script.remove();
  }, [serialized]);

  return null;
};

export default Seo;
