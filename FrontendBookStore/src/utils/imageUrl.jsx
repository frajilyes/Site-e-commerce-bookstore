import env from "../config/env";

const UNSPLASH_HOST = "images.unsplash.com";

const DEFAULT_WIDTHS = [320, 480, 640, 960];

export const resolveImage = (src) => {
  if (typeof src !== "string" || src === "") return src ?? "";
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return `${env.serverUrl}/${src.replace(/^\/+/, "")}`;
};

export const optimizedImage = (src, width = 640, quality = 70) => {
  if (typeof src !== "string" || !src.includes(UNSPLASH_HOST)) return src;
  const [base] = src.split("?");
  return `${base}?auto=format&fit=crop&w=${width}&q=${quality}`;
};

export const imageSrcSet = (src, widths = DEFAULT_WIDTHS) => {
  if (typeof src !== "string" || !src.includes(UNSPLASH_HOST)) return undefined;
  return widths.map((w) => `${optimizedImage(src, w)} ${w}w`).join(", ");
};
