/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const readEnvFile = (file) => {
  if (!fs.existsSync(file)) return {};
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .reduce((acc, line) => {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) acc[match[1]] = match[2].replace(/^["']|["']$/g, "");
      return acc;
    }, {});
};

const fileEnv = {
  ...readEnvFile(path.join(ROOT, ".env")),
  ...readEnvFile(path.join(ROOT, ".env.production")),
  ...readEnvFile(path.join(ROOT, ".env.local")),
};

const siteUrl = String(
  process.env.REACT_APP_SITE_URL ||
    fileEnv.REACT_APP_SITE_URL ||
    "http://localhost:3000",
).replace(/\/+$/, "");

const PAGES = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/books", changefreq: "daily", priority: "0.9" },
  { path: "/categories", changefreq: "weekly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.5" },
];

const today = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map(
  (page) => `  <url>
    <loc>${siteUrl}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
).join("\n")}
</urlset>
`;

const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Tunnel d'achat et espace compte : privés, et sans intérêt dans un index.
Disallow: /checkout
Disallow: /order-success
Disallow: /review
Disallow: /signin
Disallow: /signup
Disallow: /verify-email
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /api

# Contenu dépendant du visiteur : vide pour un robot.
Disallow: /search
Disallow: /wishlist

Sitemap: ${siteUrl}/sitemap.xml
`;

fs.writeFileSync(path.join(PUBLIC, "sitemap.xml"), sitemap, "utf8");
fs.writeFileSync(path.join(PUBLIC, "robots.txt"), robots, "utf8");

console.log(`robots.txt + sitemap.xml generes pour ${siteUrl}`);
