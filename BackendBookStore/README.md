# BookStore API

REST API for the BookStore e-commerce front end: catalogue, search, cart,
wishlist, orders, reviews, Stripe payments and an admin back office.

Built with **Express 5**, **MongoDB / Mongoose 9**, **JWT** auth and **Stripe**.

---

## Quick start

```bash
npm install
cp .env.example .env          # then edit the values
npm run migrate               # only needed on an existing database
npm run seed                  # demo catalogue + admin account
npm run dev                   # or: npm start
```

The API listens on `http://localhost:5000`. Check it with:

```bash
curl http://localhost:5000/health
```

The seeded admin is `admin@bookstore.local` / `Admin12345`
(override with `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

> The React front end owns port 3000 (the origin registered with Google for
> social login) and proxies `/api`, `/uploads` and `/health` to
> this API through the CRA dev proxy (`proxy` field in
> `FrontendBookStore/package.json`). Keep the two ports distinct: the browser
> only ever talks to `http://localhost:3000`.

### npm scripts

| Script | What it does |
| --- | --- |
| `npm start` | Run the API |
| `npm run dev` | Run with nodemon |
| `npm test` | End-to-end smoke test (44 checks, uses a throwaway database) |
| `npm run seed` | Load the demo catalogue and create the admin |
| `npm run seed:destroy` | Empty every collection |
| `npm run migrate` | Upgrade a database created by the previous schema |
| `npm run indexes` | Rebuild all indexes (run after deploying to production) |

---

## Response format

Every response uses the same envelope.

```jsonc
// success
{ "success": true, "data": { } }

// list endpoints
{ "success": true, "total": 42, "page": 1, "limit": 12, "totalPages": 4,
  "hasNextPage": true, "hasPrevPage": false, "data": [ ] }

// error
{ "success": false, "status": "fail", "message": "Book not found",
  "errors": [ { "field": "price", "message": "Price must be a positive number" } ] }
```

`errors` appears only for validation failures. A stack trace is added outside
production.

## Authentication

Send the access token as `Authorization: Bearer <token>`.
Login sets an httpOnly `refreshToken` cookie; `POST /api/auth/refresh`
exchanges it for a new access token.

### Email confirmation

`POST /register` no longer opens a session. It creates a dormant account and
mails a 6-digit code; the session is issued by `POST /verify-email` once that
code is entered. Logging in before then answers `403` with
`"code": "EMAIL_NOT_VERIFIED"` and mails a fresh code, so the front end can send
the user straight back to the confirmation screen.

Accounts opened through Google skip the step: the provider has
already verified the address.

Every door that takes an address — register, login, verify-email,
resend-verification and the social providers — runs it through the single
`utils/email.js` helper (trim + lowercase, nothing else). The value looked up is
therefore always the value stored. `normalizeEmail()` is deliberately not used:
it rewrites Gmail addresses (`marie.dupont+livres@gmail.com` ->
`mariedupont@gmail.com`), so applying it on one door and not another let people
sign up under one address and log in under another.

```
POST /api/auth/register            -> { requiresVerification: true, email, delivered, resendAfter }
POST /api/auth/verify-email        -> { user, accessToken }   + refresh cookie
POST /api/auth/resend-verification -> { requiresVerification, email, resendAfter }
```

Codes are stored as an HMAC-SHA256 digest (never in clear), expire after
`EMAIL_CODE_TTL_MIN` minutes, and burn after `EMAIL_CODE_MAX_ATTEMPTS` wrong
tries. `EMAIL_CODE_RESEND_COOLDOWN_S` throttles the resend button.

Mail goes out over SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`,
`MAIL_FROM`). **With `SMTP_HOST` empty nothing is sent and the code is printed
in the server console**, which is enough to work locally. Gmail requires an
app password, not the account password. `REQUIRE_EMAIL_VERIFICATION=false`
turns the whole check off.

`npm run mail:test [address]` sends one real confirmation email and explains
the usual Gmail failures. `npm test` never sends anything, whatever SMTP says:
its accounts use invented addresses, some of them `@gmail.com`, and a
configured relay would otherwise mail real strangers.

> Upgrading an existing database: run `npm run migrate` once. It marks every
> pre-existing account (the seeded admin included) as confirmed — without it
> they would all be locked out by a step they never went through.

Roles: `user` (default) and `admin`. Endpoints marked **admin** require the latter.

---

## Endpoints

### Auth — `/api/auth`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | public | Create a dormant account, mails a 6-digit code |
| POST | `/verify-email` | public | Confirm the address, returns a token |
| POST | `/resend-verification` | public | Mail a new code |
| POST | `/login` | public | Log in |
| POST | `/refresh` | cookie | New access token from the refresh cookie |
| POST | `/logout` | public | Clear the refresh cookie |
| GET | `/me` | user | Current profile |
| PATCH | `/me` | user | Update name / phone / avatar |
| PATCH | `/me/password` | user | Change password |
| DELETE | `/me` | user | Deactivate the account |
| POST | `/me/addresses` | user | Add a shipping address |
| DELETE | `/me/addresses/:addressId` | user | Remove an address |
| GET | `/users` | admin | List users |
| GET | `/users/:id` | admin | One user |
| PATCH | `/users/:id` | admin | Change role / active flag |
| DELETE | `/users/:id` | admin | Deactivate a user |

### Books — `/api/books`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | public | Search, filter, sort, paginate |
| GET | `/featured` | public | Featured books |
| GET | `/best-sellers` | public | Top sellers |
| GET | `/categories` | public | Categories with counts and price ranges |
| GET | `/:id` | public | One book, by id **or slug**, with its latest reviews |
| GET | `/:id/related` | public | Same category or author |
| POST | `/` | admin | Create (JSON, or multipart with an `image` file) |
| PUT / PATCH | `/:id` | admin | Update |
| PATCH | `/:id/stock` | admin | Set stock |
| DELETE | `/:id` | admin | Archive (add `?hard=true` to delete for good) |

Query options on `GET /api/books`:

```
?keyword=atomic                 case-insensitive search (title, author, category, tags)
?category=Programming           exact filter — also author, badge, language, featured
?price[gte]=10&price[lte]=25    operators: gte gt lte lt in nin ne eq
?sort=-price,title              prefix with - for descending
?fields=title,price,image       sparse projection
?page=2&limit=24                pagination (limit max 100)
```

### Reviews — `/api/reviews` and `/api/books/:bookId/reviews`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/api/books/:bookId/reviews` | public | Reviews for a book |
| GET | `/api/reviews/mine` | user | Your reviews |
| POST | `/api/books/:bookId/reviews` | user | Add a review (one per book) |
| PATCH | `/api/reviews/:id` | owner | Edit |
| DELETE | `/api/reviews/:id` | owner / admin | Delete |

The book's `rating` and `numReviews` are recomputed automatically.

### Cart — `/api/carts`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/me` | user | Your cart, with totals |
| DELETE | `/me` | user | Empty it |
| POST | `/me/merge` | user | Merge a guest cart after sign-in |
| POST | `/items` | user | Add `{ bookId, quantity }` |
| PATCH | `/items/:bookId` | user | Set quantity (0 removes the line) |
| DELETE | `/items/:bookId` | user | Remove a line |
| GET | `/` `/:id` | admin | Inspect carts |

### Wishlist — `/api/wishlists`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/me` | user | Your wishlist |
| DELETE | `/me` | user | Clear it |
| POST | `/books` | user | Add `{ bookId }` (idempotent) |
| POST | `/books/:bookId` | user | Add (idempotent) |
| DELETE | `/books/:bookId` | user | Remove |
| GET | `/` `/:id` | admin | Inspect wishlists |

### Orders — `/api/orders`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | user | Check out the cart into an order |
| GET | `/my` | user | Your orders |
| GET | `/:id` | owner / admin | One order |
| PATCH | `/:id/cancel` | owner / admin | Cancel and restock |
| GET | `/` | admin | All orders |
| GET | `/stats` | admin | Revenue, orders by status, top books |
| PATCH | `/:id/status` | admin | Move through the lifecycle |
| DELETE | `/:id` | admin | Delete |

Status flow: `pending → paid → processing → shipped → delivered`,
with `cancelled` and `refunded` as exits.

Checkout body:

```json
{
  "shippingAddress": {
    "firstName": "Jane", "lastName": "Reader", "email": "jane@example.com",
    "address": "12 Library Lane", "city": "Paris", "country": "France",
    "postalCode": "75001", "phone": "+33 1 23 45 67 89"
  },
  "paymentMethod": "Stripe"
}
```

Prices are **never** taken from the request: line prices, tax, shipping and the
total are computed server-side from the database (`Services/pricing.js`).
Stock is reserved when the order is created and released if it is cancelled or
the payment fails.

### Payments — `/api/payments`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/checkout-session` | user | Stripe Checkout session for an order |
| POST | `/payment-intent` | user | PaymentIntent for Stripe Elements |
| GET | `/session/:sessionId` | user | Confirm on return from Stripe |
| GET | `/my` | user | Your payments |
| GET | `/:id` | owner / admin | One payment |
| POST | `/` | user | Record contact/shipping details for an order |
| GET | `/` | admin | All payments |
| PATCH | `/:id` | admin | Change status |
| POST | `/:id/refund` | admin | Refund through Stripe |
| DELETE | `/:id` | admin | Delete the record |

Without `STRIPE_SECRET_KEY` the rest of the API still runs; payment endpoints
answer `503`.

### Stripe webhook — `POST /api/webhook/stripe`

Public, signature-verified, and mounted **before** the JSON parser so the raw
body stays intact. Handled events: `checkout.session.completed`,
`checkout.session.async_payment_succeeded`, `payment_intent.succeeded`,
`payment_intent.payment_failed`, `charge.refunded`.

Every event is stored with a unique `eventId`, which makes retries idempotent.
Admins can review the log at `GET /api/webhook`, and replay a failed one with
`POST /api/webhook/:id/replay`.

Local testing:

```bash
stripe listen --forward-to localhost:5000/api/webhook/stripe
```

### Uploads — `/api/upload` (admin)

`POST /` (field `file`), `POST /many` (field `files`, max 10), `GET /`,
`DELETE /:filename`. Images only (jpeg, png, webp, avif, gif), 5 MB each.
Files are served from `/uploads/<filename>`.

### Health

`GET /health` — process uptime and database state.
`GET /api` — endpoint index.

---

## Project layout

```
index.js              bootstrap: env, database, listen, graceful shutdown
app.js                the Express app: middleware pipeline and route mounting
config/               env validation, database connection, Stripe client
Models/               Mongoose schemas (book, user, cart, order, review, ...)
Controllers/          request handlers (userAuth = open a session,
                      userController = the account once it is open)
Routers/              route definitions, auth guards and validation per route
Services/             pricing, stock reservation, email verification, OAuth policy
middlewares/          auth (who), adminMiddleware (may they), validation,
                      sanitising, rate limiting, uploads, errors
validators/           express-validator rule sets
utils/                ApiError, asyncHandler, query builder, responses,
                      jwt + generateToken (sessions), mailer (SMTP),
                      googleClient (OAuth transport), stripeError (payment errors)
scripts/              smoke test, migration, index sync
seed/                 demo catalogue and seeder
```

## Security

- bcrypt (cost 12) password hashing; the hash is `select: false` and stripped from every response
- JWT access tokens plus httpOnly refresh cookies; tokens issued before a password change are rejected
- role-based guards, and ownership checks on orders, payments and reviews
- Helmet, an allow-list CORS policy, and rate limits (global, per-write, and a tight one on credentials keyed by IP + email)
- NoSQL-injection sanitising of body, params and query, plus parameter-pollution collapsing
- request body limited to 1 MB, uploads to 5 MB with the file type checked and the client filename discarded
- Stripe webhooks verified by signature; card numbers are never received or stored

## Performance

- compound indexes covering every catalogue, listing, order and review query
- `.lean()` reads, projections, and list queries that run their count in parallel
- pagination capped at 100 items; gzip compression; ETags; cached static assets
- connection pooling (2–20), `autoIndex` off in production (`npm run indexes` instead)
- denormalised `rating` / `numReviews` on books, so listings need no join
- aggregation pipelines for categories and dashboard statistics

## Environment variables

See `.env.example`. `DB_URI` and `JWT_SECRET` are required; the process exits at
boot if either is missing, or if `JWT_SECRET` is shorter than 32 characters in
production.
