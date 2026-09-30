# BookStore - Frontend

React 19 single-page storefront for an online bookstore: catalog, search,
categories, wishlist, ratings, cart and checkout.

## Stack

| Concern   | Choice                                                                             |
| --------- | ---------------------------------------------------------------------------------- |
| UI        | React 19 + Create React App (react-scripts 5)                                      |
| Styling   | Tailwind CSS 3 (auto-detected by CRA via `tailwind.config.js`) + per-component CSS |
| State     | Redux Toolkit (`src/book/bookSlice.js`), persisted to `localStorage`               |
| Routing   | React Router 7, lazy-loaded routes                                                 |
| Animation | framer-motion                                                                      |
| HTTP      | axios instance in `src/services/httpClient.js`                                     |

## Getting started

```bash
npm install
cp .env.example .env   # adjust REACT_APP_API_URL
npm start              # http://localhost:3000
npm test               # watch-mode tests
npm run build          # production bundle in build/ (regenerates robots + sitemap)
npm run images         # re-encode src/assets/*.png to AVIF/WebP in public/media
npm run seo:files      # rewrite public/robots.txt and public/sitemap.xml
```

`npm run images` is only needed after changing a source visual in
`src/assets/`; its output is committed. `npm run seo:files` runs automatically
before every build, so `robots.txt` and `sitemap.xml` always carry the domain
of the build being produced.

Everything the browser touches lives on `http://localhost:3000`: the storefront
owns that port, and the CRA dev proxy (`proxy` field in `package.json`) forwards
`/api` and `/health` to the API, which listens on 5000. One origin
means no CORS, same-site refresh cookies, and the exact origin Google expects
for social login. Run both servers side by side — see
[API_INTEGRATION.md](./API_INTEGRATION.md) for the full contract.

## Environment

All variables are read in `src/config/env.js`.

| Variable                            | Default        | Role                                                                                                                                                                                                                             |
| ----------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                              | `3000`         | Dev server port — the only origin the browser sees                                                                                                                                                                               |
| `REACT_APP_API_URL`                 | `/api`         | Backend base URL — relative, so the dev proxy handles it                                                                                                                                                                         |
| `REACT_APP_SITE_URL`                | current origin | **Public origin of the site.** Canonical URLs, Open Graph tags, `sitemap.xml` and the `Sitemap:` line of `robots.txt` all need an absolute URL — set the real domain before going live, or search engines will index `localhost` |
| `REACT_APP_SERVER_URL`              | _(empty)_      | Server origin for the health check and relative image URLs; empty = same origin                                                                                                                                                             |
| `REACT_APP_API_TIMEOUT`             | `10000`        | Axios timeout (ms)                                                                                                                                                                                                               |
| `REACT_APP_USE_LOCAL_FALLBACK`      | `true`         | Offline degradation for auth and checkout (the catalogue always comes from the API)                                                                                                                                              |
| `REACT_APP_CURRENCY`                | `USD`          | Price display                                                                                                                                                                                                                    |
| `REACT_APP_TAX_RATE`                | `0`            | Mirror of the backend `TAX_RATE`                                                                                                                                                                                                 |
| `REACT_APP_SHIPPING_FLAT_RATE`      | `4.99`         | Mirror of `SHIPPING_FLAT_RATE`                                                                                                                                                                                                   |
| `REACT_APP_FREE_SHIPPING_THRESHOLD` | `50`           | Mirror of `FREE_SHIPPING_THRESHOLD`                                                                                                                                                                                              |
| `REACT_APP_DEFAULT_PAGE_SIZE`       | `12`           | Mirror of `DEFAULT_PAGE_SIZE`                                                                                                                                                                                                    |
| `REACT_APP_STRIPE_PUBLISHABLE_KEY`  | _(empty)_      | Only needed for an embedded Stripe Elements form                                                                                                                                                                                 |
| `GENERATE_SOURCEMAP`                | `false`        | Smaller/faster production builds                                                                                                                                                                                                 |

The pricing variables must match `BackendBookStore/.env`: `src/utils/pricing.js`
mirrors `Services/pricing.js` so the checkout summary shows the amount the server
will actually charge.

## Structure

```
src/
  app/          Redux store + localStorage persistence
  book/         slice, selectors, local catalog
  config/       env resolution, API route map (apiRoutes.js)
  services/     axios client, normalized errors, backend adapters,
                auth/book/cart/wishlist/order/payment/review services,
                checkout flow, session helpers
  hooks/        useAuth, useBooks, useCartSync, useDebounce
  utils/        price formatting, pricing (mirrors the server), image URLs
  Component/    NavBar, BookCard(+Item), QuickView, Loader, ErrorBoundary, ...
  pages/        Home, BookDetails, Checkout, CheckoutSuccess, CheckoutCancel,
                OrderSuccess, Review, NotFound
```

## Performance notes

Lighthouse on the production build (`npm run build`, served as a static site),
median of 5 runs:

| Route    | Mobile  | Desktop | Mobile FCP / LCP / TBT / CLS |
| -------- | ------- | ------- | ---------------------------- |
| `/`      | **100** | **100** | 0.75 s / 1.05 s / 24 ms / 0  |
| `/books` | 97      | **100** | 1.21 s / 2.57 s / 46 ms / 0  |
| `/about` | 97      | **100** | 1.21 s / 2.58 s / 54 ms / 0  |

TBT and CLS score 100 on every route and both form factors; so does LCP on the
home page and on desktop everywhere. What holds the interior routes to 97 on
mobile is LCP alone, and it is structural: those screens are rendered by React,
so nothing can paint before ~125 kB of JavaScript has been downloaded _and_
executed. Only prerendering (shipping real HTML per route) moves that number —
see "What is left" below.

The levers that carry the home page:

- **The first screen is static HTML.** `public/index.html` holds a copy of the
  home hero (`#app-shell`) built with the same Tailwind classes as
  `src/pages/HomePage.jsx`, so it paints during HTML parsing, before the bundle
  exists. React mounts one frame later (`src/index.js`) and `HomePage` removes
  the copy in a `useLayoutEffect` — same frame as its own first render, hence no
  flash. **Any change to the first screen must be made in both files.**
- **The hero cover never passes through React.** It lives in `#hero-backdrop`,
  outside `#root`, and both copies of the hero are laid over it. That is what
  keeps the LCP element independent of the bundle; the placement rules it has
  to respect are documented in the critical stylesheet of `index.html`. The
  `<link rel="preload">` that fetches it is injected only on `/`. Its `src` is
  assigned by the inline script that directly follows the element, not from the
  end of `<body>`: an `<img>` cannot paint before it has a source, and waiting
  for the rest of the shell to be parsed cost 128 ms of "element render delay"
  on an image that was already in memory.
- **The bundle is requested after the hero has been painted, not before.**
  `scripts/optimize-html.js` (a `postbuild` step) replaces CRA's
  `<script defer>` with a loader that waits for the `largest-contentful-paint`
  entry. `defer` delays _execution_, not _download_: the preload scanner used to
  fetch 93 kB of JavaScript in parallel with the 15 kB cover, and on a throttled
  link the only visible thing on the screen lost the race. Same bytes, different
  order — LCP 2.10 s → 1.05 s, FCP 1.11 s → 0.75 s. The script documents why the
  paint event is the trigger rather than the image's `load` event, and why
  inlining the stylesheet (the obvious next idea) makes things worse.
- **AVIF/WebP instead of 4.5 MB of PNG.** `scripts/optimize-images.js` re-encodes
  the two background visuals into `public/media` (hero: 2.1 MB → 16 kB for the
  variant a phone actually downloads). They sit in `public/` and not behind a
  webpack import so their URLs stay stable enough to be preloaded.

Layout stability (CLS 0) comes from the same design: the static copy is
`position: fixed`, so it takes no part in layout and its removal cannot shift
anything, the navbar has a fixed height (`min-h-[88px]`), and every image
declares `width`/`height`. The home hero carries no entrance animation — an
element starting at `opacity: 0` is not counted as painted, so a 0.9 s fade
used to push the LCP back by its full duration. Measured shift count on the
production build: **zero**, on all nine routes, mobile and desktop, both on
cold load and across client-side navigations — the latter matter because CrUX
attributes an SPA's later shifts back to the initial page, where Lighthouse
never looks.

**Measure CLS on `npm run build`, never on `npm start`.** The two servers do
not ship the stylesheet the same way: the build puts a render-blocking
`<link>` in the `<head>`, while the dev server injects Tailwind from
JavaScript (`style-loader`), so the document is parsed with no stylesheet at
all. `#app-shell` is nothing but Tailwind classes, so under `npm start` it
painted unstyled — the hero text and the two decorative emoji stacked in
normal flow — and snapped into place when the sheet arrived: CLS 0.89 on the
home page, a Lighthouse CLS score of 3/100 for a page that scores 100 once
built. The shell is now removed when the document carries no stylesheet, which
is exactly the case where it cannot do its job (`public/index.html`, the script
that follows the shell). Production is untouched — the sheet is there, the
shell paints styled, and it still carries the FCP. The dev home page went from
CLS 0.89 / perf 63 to CLS 0 / perf 90 on mobile as a side effect.

- **CSS animations instead of framer-motion where it sits on a critical path** -
  `StarRating` is rendered by every catalog card, so it pulled framer-motion
  (42.5 kB) into the chunk of `/books` and `/books/:id`, where nothing paints
  until that chunk has run. The same hover, tap, rating pulse, glow and label
  entrance now live in `StarRating.css`, composited off the main thread and
  disabled under `prefers-reduced-motion`. Routes that use framer-motion
  directly (Categories, SearchBook, WishList, QuickView, About, NotFound) keep
  it. `/books` LCP 2.72 s → 2.57 s.
- **Route-level code splitting** - only the home page and the shell are in the
  initial chunk; every other screen (and framer-motion, lucide, page CSS) loads
  on demand. `QuickView` loads on first open. The footer and the welcome notice
  are lazy too: neither is part of the first paint.
- **HTTP layer out of the initial bundle** - `authService`, `cartService` and
  `wishlistService` (and with them axios, ~13 kB gzipped) are imported
  dynamically from `useAuth` and `useCartSync`. None of their calls happen on
  mount, so the landing page never pays for them: 121 kB → 95 kB gzipped.
- **Responsive images** - `src/utils/imageUrl.js` requests sized, auto-format
  Unsplash variants and emits a `srcSet`; grid images are `loading="lazy"`,
  above-the-fold covers are eager with `fetchPriority="high"`.
- **Memoized rendering** - `BookCardItem` is `React.memo`'d and receives
  primitives + stable callbacks; cart/wishlist lookups use `Map`/`Set`
  selectors (`src/book/bookSelectors.js`) instead of `Array#find` per card.
- **Debounced search** - search and category filters run on a 200 ms debounce.
- **Throttled persistence** - the store is written to `localStorage` on an
  idle callback, debounced 500 ms, and flushed on `pagehide`.
- **Cached API reads** - `bookService` de-duplicates in-flight and repeated
  catalog requests for the session.

### What is left

Mobile LCP on the interior routes (2.57 s, the only metric below 100 anywhere)
is the cost of client-side rendering: `/books` paints nothing until
`main.js` (93.5 kB) plus axios and the route chunk have been fetched and
executed. Reordering or shrinking further only nibbles at it — the fix is to
ship painted HTML for those routes too, either by prerendering them at build
time into `build/books/index.html` & co., or by moving to a framework that does
it. Anything short of that leaves the first paint behind the bundle.

Two things measured and deliberately _not_ kept, both documented where they
were tried, so they do not get reintroduced:

- **Inlining the stylesheet** into `index.html` removes a render-blocking
  request but inflates the document the browser must receive before it can even
  discover the cover: LCP 1.05 s → 1.97 s.
- **Preloading the `/books` background** the way `/` preloads its hero makes
  that page _slower_ (2.57 s → 2.87 s). On the home page the cover is in the
  static document and paints without JavaScript, so fetching it first is a pure
  win; on `/books` it is rendered by React, so preloading it only takes
  bandwidth from the bundle that actually gates the paint.

## SEO

- **Per-route metadata** — `src/Components/Seo.jsx` sets the title, description,
  canonical URL, Open Graph and Twitter tags of each screen and restores the
  defaults of `index.html` when it unmounts. Private screens (cart, account,
  wishlist, search) are marked `noindex, follow`.
- **Structured data** — `Organization` + `WebSite` with a `SearchAction` on the
  home page, and `Book` + `Offer` + `AggregateRating` + `BreadcrumbList` on each
  book page, which is what lets a result show a price and stars.
- **Crawlable navigation** — every link in the navbar, the hero and the footer is
  a real `<a href>` (`<Link>`), never an `onClick` on a `<li>` or a `<button>`.
  A crawler follows `href`s; it does not fire click handlers.
- **`robots.txt` + `sitemap.xml`** — generated by `scripts/generate-seo-files.js`
  before each build from `REACT_APP_SITE_URL`. Book pages come from the API and
  cannot be listed there: to index them, emit that sitemap from the backend,
  which has the catalog.
- **One `<h1>` per page** — the navbar and footer titles are no longer headings,
  so they stop competing with the heading of the page being read.

## Backend

The UI targets the `BackendBookStore` REST API (`/api/auth`, `/api/books`,
`/api/reviews`, `/api/carts`, `/api/wishlists`, `/api/orders`,
`/api/payments`). Highlights of the integration:

- **Envelope handling** — the API answers `{ success, …meta, data }`;
  `httpClient` unwraps `data` and exposes pagination on `response.meta`.
- **JWT + refresh cookie** — the access token lives in `localStorage`, the
  refresh token in an `httpOnly` cookie; a `401` is retried once after a silent
  `POST /api/auth/refresh`.
- **Cart merge** — the API has no anonymous cart, so the guest cart is pushed
  with `POST /api/carts/me/merge` on sign-in (`hooks/useCartSync.js`).
- **Stripe checkout** — order first, then a Checkout Session; the server
  redirects back to `/checkout/success` and `/checkout/cancel`.
- **Graceful degradation** — with `REACT_APP_USE_LOCAL_FALLBACK=true`, an
  unreachable API falls back to the local catalog and an offline session.

Full contract, field mapping and endpoint table: [API_INTEGRATION.md](./API_INTEGRATION.md).
