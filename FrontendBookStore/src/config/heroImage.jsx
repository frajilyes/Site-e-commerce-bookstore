const srcSet = (name, widths, extension) =>
  widths
    .map((width) => `/media/${name}-${width}.${extension} ${width}w`)
    .join(", ");

const HERO_WIDTHS = [640, 768, 960, 1280, 1536];
const CATALOG_WIDTHS = [640, 960, 1280];

export const HERO_AVIF = srcSet("hero", HERO_WIDTHS, "avif");
export const HERO_WEBP = srcSet("hero", HERO_WIDTHS, "webp");

export const HERO_FALLBACK = "/media/hero-1280.webp";

export const CATALOG_AVIF = srcSet("catalog-bg", CATALOG_WIDTHS, "avif");
export const CATALOG_WEBP = srcSet("catalog-bg", CATALOG_WIDTHS, "webp");
export const CATALOG_FALLBACK = "/media/catalog-bg-960.webp";
