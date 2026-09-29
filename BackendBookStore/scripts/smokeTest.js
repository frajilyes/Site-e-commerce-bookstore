process.env.NODE_ENV = "test";

const baseUri = process.env.DB_URI || "mongodb://127.0.0.1:27017/librarybooks";
process.env.DB_URI = `${baseUri.replace(/\/?$/, "")}_smoketest`;
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "smoke-test-secret-key-at-least-32-chars-long";

const assert = require("assert");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = require("../app");
const { connectDB, disconnectDB } = require("../config/db");
const Book = require("../Models/book");
const User = require("../Models/userAuth");
const books = require("../seed/books");
const { hashCode } = require("../Services/emailVerification");
const { signRefreshToken } = require("../utils/jwt");
const { hashResetCode } = require("../Services/passwordReset");

let server;
let origin;
let passed = 0;
let failed = 0;

const request = async (method, path, { token, body, raw } = {}) => {
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${origin}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = text;
  try {
    payload = JSON.parse(text);
  } catch {
  }

  return raw ? { status: response.status, payload, response } : { status: response.status, payload };
};

const check = async (name, fn) => {
  try {
    await fn();
    passed += 1;
    console.log(`  PASS  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${error.message}`);
  }
};

const primeVerificationCode = async (email, code = "424242") => {
  await User.updateOne(
    { email },
    {
      $set: {
        emailVerification: {
          codeHash: hashCode(code),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attempts: 0,
          sentAt: new Date(),
        },
      },
    },
  );
  return code;
};

const run = async () => {
  await connectDB();
  await mongoose.connection.dropDatabase();

  await Book.create(books);
  await User.create({
    fullName: "Test Admin",
    email: "admin@test.local",
    password: "Admin12345",
    role: "admin",
    emailVerified: true,
  });

  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;

  console.log(`\nBookStore API smoke test  (${origin})\n`);

  await check("GET /health reports a connected database", async () => {
    const { status, payload } = await request("GET", "/health");
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.database, "connected");
  });

  await check("unknown routes return a 404 envelope", async () => {
    const { status, payload } = await request("GET", "/api/does-not-exist");
    assert.strictEqual(status, 404);
    assert.strictEqual(payload.success, false);
  });

  let bookId;

  await check("GET /api/books paginates the catalogue", async () => {
    const { status, payload } = await request("GET", "/api/books?limit=5");
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.data.length, 5);
    assert.strictEqual(payload.total, books.length);
    assert.strictEqual(payload.totalPages, 2);
    bookId = payload.data[0]._id;
  });

  await check("GET /api/books filters by category", async () => {
    const { payload } = await request("GET", "/api/books?category=Programming");
    assert.strictEqual(payload.total, 1);
    assert.strictEqual(payload.data[0].category, "Programming");
  });

  await check("GET /api/books searches by keyword", async () => {
    const { payload } = await request("GET", "/api/books?keyword=Atomic");
    assert.ok(payload.total >= 1, "expected at least one match for 'Atomic'");
    assert.ok(payload.data.some((b) => b.title === "Atomic Habits"));
  });

  await check("GET /api/books supports operator filters and sorting", async () => {
    const { payload } = await request("GET", "/api/books?price[lte]=15&sort=price");
    assert.ok(payload.data.every((b) => b.price <= 15));
    const prices = payload.data.map((b) => b.price);
    assert.deepStrictEqual(prices, [...prices].sort((a, b) => a - b));
  });

  await check("GET /api/books/categories aggregates the facets", async () => {
    const { payload } = await request("GET", "/api/books/categories");
    assert.ok(payload.data.length >= 8);
    assert.ok(payload.data.every((c) => c.category && c.count > 0));
  });

  await check("GET /api/books/:id returns one book", async () => {
    const { status, payload } = await request("GET", `/api/books/${bookId}`);
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.data._id, bookId);
  });

  await check("GET /api/books/:id 404s on an unknown id or slug", async () => {
    const { status } = await request("GET", "/api/books/not-a-real-id");
    assert.strictEqual(status, 404);
  });

  await check("creating a book without a token is refused", async () => {
    const { status } = await request("POST", "/api/books", { body: { title: "x" } });
    assert.strictEqual(status, 401);
  });

  let token;
  let adminToken;

  await check("registration rejects a weak password", async () => {
    const { status, payload } = await request("POST", "/api/auth/register", {
      body: { fullName: "Weak Pass", email: "weak@test.local", password: "abc" },
    });
    assert.strictEqual(status, 422);
    assert.ok(payload.errors.some((e) => e.field === "password"));
  });

  await check("POST /api/auth/register opens no session before confirmation", async () => {
    const { status, payload } = await request("POST", "/api/auth/register", {
      body: {
        fullName: "Jane Reader",
        email: "jane@test.local",
        password: "Password123",
      },
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(payload.data.requiresVerification, true);
    assert.strictEqual(payload.data.email, "jane@test.local");
    assert.strictEqual(payload.data.accessToken, undefined);
  });

  await check("logging in before confirming is refused with EMAIL_NOT_VERIFIED", async () => {
    const { status, payload } = await request("POST", "/api/auth/login", {
      body: { email: "jane@test.local", password: "Password123" },
    });
    assert.strictEqual(status, 403);
    assert.strictEqual(payload.code, "EMAIL_NOT_VERIFIED");
  });

  await check("a wrong confirmation code is refused", async () => {
    await primeVerificationCode("jane@test.local");
    const { status, payload } = await request("POST", "/api/auth/verify-email", {
      body: { email: "jane@test.local", code: "000000" },
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(payload.code, "VERIFICATION_CODE_INVALID");
  });

  await check("POST /api/auth/verify-email confirms and issues a token", async () => {
    const code = await primeVerificationCode("jane@test.local");
    const { status, payload } = await request("POST", "/api/auth/verify-email", {
      body: { email: "jane@test.local", code },
    });
    assert.strictEqual(status, 200);
    assert.ok(payload.data.accessToken);
    assert.strictEqual(payload.data.user.role, "user");
    assert.strictEqual(payload.data.user.emailVerified, true);
    token = payload.data.accessToken;
  });

  await check("a confirmation code cannot be replayed", async () => {
    const { status, payload } = await request("POST", "/api/auth/verify-email", {
      body: { email: "jane@test.local", code: "424242" },
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.message, "Email address already confirmed");

    const user = await User.findOne({ email: "jane@test.local" }).select(
      "+emailVerification",
    );
    assert.strictEqual(user.emailVerification, undefined);
  });

  await check("resend-verification never reveals who is registered", async () => {
    const { status, payload } = await request("POST", "/api/auth/resend-verification", {
      body: { email: "nobody-at-all@test.local" },
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.data.requiresVerification, false);
  });

  await check("an address survives signup unchanged, whatever its casing", async () => {
    const typed = "  Marie.Dupont+Livres@Gmail.com  ";
    const stored = "marie.dupont+livres@gmail.com";

    const { status, payload } = await request("POST", "/api/auth/register", {
      body: { fullName: "Marie Dupont", email: typed, password: "Password123" },
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(payload.data.email, stored);

    await request("POST", "/api/auth/verify-email", {
      body: { email: stored, code: await primeVerificationCode(stored) },
    });

    const login = await request("POST", "/api/auth/login", {
      body: { email: typed, password: "Password123" },
    });
    assert.strictEqual(login.status, 200);
    assert.strictEqual(login.payload.data.user.email, stored);
  });

  await check("a duplicate email is rejected with 409", async () => {
    const { status } = await request("POST", "/api/auth/register", {
      body: {
        fullName: "Jane Again",
        email: "jane@test.local",
        password: "Password123",
      },
    });
    assert.strictEqual(status, 409);
  });

  await check("login with a wrong password is refused", async () => {
    const { status } = await request("POST", "/api/auth/login", {
      body: { email: "jane@test.local", password: "WrongPassword1" },
    });
    assert.strictEqual(status, 401);
  });

  await check("login with someone else's password does not work", async () => {
    const { status } = await request("POST", "/api/auth/login", {
      body: { email: "jane@test.local", password: "Admin12345" },
    });
    assert.strictEqual(status, 401);
  });

  await check("POST /api/auth/login issues a token", async () => {
    const { status, payload } = await request("POST", "/api/auth/login", {
      body: { email: "jane@test.local", password: "Password123" },
    });
    assert.strictEqual(status, 200);
    token = payload.data.accessToken;

    const admin = await request("POST", "/api/auth/login", {
      body: { email: "admin@test.local", password: "Admin12345" },
    });
    adminToken = admin.payload.data.accessToken;
    assert.ok(adminToken);
  });

  await check("GET /api/auth/me never leaks the password hash", async () => {
    const { status, payload } = await request("GET", "/api/auth/me", { token });
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.data.password, undefined);
    assert.strictEqual(payload.data.email, "jane@test.local");
  });

  await check("a customer cannot reach the admin user list", async () => {
    const { status } = await request("GET", "/api/auth/users", { token });
    assert.strictEqual(status, 403);
  });

  await check("an admin can list users", async () => {
    const { status, payload } = await request("GET", "/api/auth/users", {
      token: adminToken,
    });
    assert.strictEqual(status, 200);
    assert.ok(payload.total >= 2);
  });

  let createdBookId;

  await check("an admin can create a book", async () => {
    const { status, payload } = await request("POST", "/api/books", {
      token: adminToken,
      body: {
        title: "The Pragmatic Programmer",
        author: "Andrew Hunt",
        description: "A classic guide to the craft of writing software well.",
        price: 39.99,
        oldPrice: 49.99,
        image: "https://example.com/pragmatic.jpg",
        category: "Programming",
        stock: 10,
        badge: "New",
      },
    });
    assert.strictEqual(status, 201);
    assert.ok(payload.data.slug, "expected a generated slug");
    assert.strictEqual(payload.data.discountPercentage, 20);
    createdBookId = payload.data._id;
  });

  await check("an invalid badge is rejected", async () => {
    const { status } = await request("PATCH", `/api/books/${createdBookId}`, {
      token: adminToken,
      body: { badge: "Wildly Invalid" },
    });
    assert.strictEqual(status, 422);
  });

  await check("PATCH /api/books/:id actually persists the change", async () => {
    const { status } = await request("PATCH", `/api/books/${createdBookId}`, {
      token: adminToken,
      body: { price: 29.99 },
    });
    assert.strictEqual(status, 200);

    const { payload } = await request("GET", `/api/books/${createdBookId}`);
    assert.strictEqual(payload.data.price, 29.99);
  });

  await check("the cart starts empty", async () => {
    const { status, payload } = await request("GET", "/api/carts/me", { token });
    assert.strictEqual(status, 200);
    assert.deepStrictEqual(payload.data.items, []);
  });

  await check("adding an item to the cart computes the subtotal", async () => {
    const { status, payload } = await request("POST", "/api/carts/items", {
      token,
      body: { bookId, quantity: 2 },
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.data.totalItems, 2);
    assert.ok(payload.data.subtotal > 0);
  });

  await check("adding the same book again merges the lines", async () => {
    const { payload } = await request("POST", "/api/carts/items", {
      token,
      body: { bookId, quantity: 1 },
    });
    assert.strictEqual(payload.data.items.length, 1);
    assert.strictEqual(payload.data.totalItems, 3);
  });

  await check("ordering more copies than the stock is refused", async () => {
    const { status } = await request("POST", "/api/carts/items", {
      token,
      body: { bookId: createdBookId, quantity: 99 },
    });
    assert.strictEqual(status, 400);
  });

  await check("quantity 0 removes the line", async () => {
    await request("POST", "/api/carts/items", {
      token,
      body: { bookId: createdBookId, quantity: 1 },
    });
    const { payload } = await request("PATCH", `/api/carts/items/${createdBookId}`, {
      token,
      body: { quantity: 0 },
    });
    assert.strictEqual(payload.data.items.length, 1);
  });

  let orderId;
  let stockBefore;

  await check("checkout turns the cart into an order and reserves stock", async () => {
    const before = await Book.findById(bookId).lean();
    stockBefore = before.stock;

    const { status, payload } = await request("POST", "/api/orders", {
      token,
      body: {
        shippingAddress: {
          firstName: "Jane",
          lastName: "Reader",
          email: "jane@test.local",
          address: "12 Library Lane",
          city: "Paris",
          country: "France",
        },
        paymentMethod: "Stripe",
      },
    });

    assert.strictEqual(status, 201);
    assert.ok(payload.data.orderNumber.startsWith("BK-"));
    assert.strictEqual(payload.data.status, "pending");
    assert.strictEqual(payload.data.isPaid, false);
    orderId = payload.data._id;

    const after = await Book.findById(bookId).lean();
    assert.strictEqual(after.stock, stockBefore - 3, "stock should be decremented");

    const cart = await request("GET", "/api/carts/me", { token });
    assert.deepStrictEqual(cart.payload.data.items, [], "cart should be emptied");
  });

  await check("order totals are computed server-side", async () => {
    const { payload } = await request("GET", `/api/orders/${orderId}`, { token });
    const order = payload.data;
    const expectedItems =
      Math.round(order.items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
    assert.strictEqual(order.itemsPrice, expectedItems);
    assert.strictEqual(
      order.totalPrice,
      Math.round((order.itemsPrice + order.shippingPrice + order.taxPrice) * 100) / 100,
    );
  });

  await check("checking out an empty cart is refused", async () => {
    const { status } = await request("POST", "/api/orders", {
      token,
      body: {
        shippingAddress: {
          firstName: "Jane",
          lastName: "Reader",
          email: "jane@test.local",
          address: "12 Library Lane",
          city: "Paris",
          country: "France",
        },
      },
    });
    assert.strictEqual(status, 400);
  });

  await check("another customer cannot read someone else's order", async () => {
    await request("POST", "/api/auth/register", {
      body: { fullName: "Nosy Neighbour", email: "nosy@test.local", password: "Password123" },
    });
    await request("POST", "/api/auth/verify-email", {
      body: {
        email: "nosy@test.local",
        code: await primeVerificationCode("nosy@test.local"),
      },
    });
    const login = await request("POST", "/api/auth/login", {
      body: { email: "nosy@test.local", password: "Password123" },
    });
    const { status } = await request("GET", `/api/orders/${orderId}`, {
      token: login.payload.data.accessToken,
    });
    assert.strictEqual(status, 403);
  });

  await check("cancelling an order puts the stock back", async () => {
    const { status } = await request("PATCH", `/api/orders/${orderId}/cancel`, {
      token,
      body: { reason: "Changed my mind" },
    });
    assert.strictEqual(status, 200);

    const after = await Book.findById(bookId).lean();
    assert.strictEqual(after.stock, stockBefore, "stock should be restored");
  });

  await check("a cancelled order cannot be cancelled twice", async () => {
    const { status } = await request("PATCH", `/api/orders/${orderId}/cancel`, { token });
    assert.strictEqual(status, 400);
  });

  await check("an admin sees order statistics", async () => {
    const { status, payload } = await request("GET", "/api/orders/stats", {
      token: adminToken,
    });
    assert.strictEqual(status, 200);
    assert.ok(Array.isArray(payload.data.byStatus));
  });

  await check("adding to the wishlist is idempotent", async () => {
    await request("POST", `/api/wishlists/books/${bookId}`, { token });
    const { status, payload } = await request("POST", `/api/wishlists/books/${bookId}`, {
      token,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.data.books.length, 1);
  });

  await check("removing from the wishlist works", async () => {
    const { payload } = await request("DELETE", `/api/wishlists/books/${bookId}`, { token });
    assert.strictEqual(payload.data.books.length, 0);
  });

  let reviewId;

  await check("a review updates the aggregated book rating", async () => {
    const { status, payload } = await request("POST", `/api/books/${bookId}/reviews`, {
      token,
      body: { rating: 4, comment: "Genuinely useful, would recommend." },
    });
    assert.strictEqual(status, 201);
    reviewId = payload.data._id;

    await new Promise((resolve) => setTimeout(resolve, 250));
    const book = await Book.findById(bookId).lean();
    assert.strictEqual(book.numReviews, 1);
    assert.strictEqual(book.rating, 4);
  });

  await check("a user cannot review the same book twice", async () => {
    const { status } = await request("POST", `/api/books/${bookId}/reviews`, {
      token,
      body: { rating: 5, comment: "Trying to review it again." },
    });
    assert.strictEqual(status, 409);
  });

  await check("deleting a review resets the book rating", async () => {
    const { status } = await request("DELETE", `/api/reviews/${reviewId}`, { token });
    assert.strictEqual(status, 200);

    const book = await Book.findById(bookId).lean();
    assert.strictEqual(book.numReviews, 0);
    assert.strictEqual(book.rating, 0);
  });

  await check("NoSQL operator injection in the body is neutralised", async () => {
    const { status } = await request("POST", "/api/auth/login", {
      body: { email: { $ne: null }, password: { $ne: null } },
    });
    assert.notStrictEqual(status, 200);
  });

  await check("query operators cannot be smuggled through the query string", async () => {
    const { status, payload } = await request("GET", "/api/books?$where=1");
    assert.strictEqual(status, 200);
    assert.strictEqual(payload.total, books.length + 1);
  });

  await check("a tampered token is rejected", async () => {
    const { status } = await request("GET", "/api/auth/me", { token: `${token}x` });
    assert.strictEqual(status, 401);
  });

  await check("payments are refused when Stripe is not configured", async () => {
    const { status } = await request("POST", "/api/payments/checkout-session", {
      token,
      body: { orderId },
    });
    assert.ok([400, 503].includes(status), `unexpected status ${status}`);
  });

  await check("malformed JSON produces a 400, not a crash", async () => {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ not json",
    });
    assert.strictEqual(response.status, 400);
  });

  await check("a refresh token is not accepted as an access token", async () => {
    const jane = await User.findOne({ email: "jane@test.local" }).select("+tokenVersion");
    const { status } = await request("GET", "/api/auth/me", { token: signRefreshToken(jane) });
    assert.strictEqual(status, 401);
  });

  await check("an unsigned (alg: none) token is rejected", async () => {
    const jane = await User.findOne({ email: "jane@test.local" }).lean();
    const forged = jwt.sign({ sub: String(jane._id), type: "access" }, null, {
      algorithm: "none",
    });
    const { status } = await request("GET", "/api/auth/me", { token: forged });
    assert.strictEqual(status, 401);
  });

  await check("client-supplied regular expressions never reach MongoDB", async () => {
    const { status } = await request("GET", "/api/books?author[regex]=(a%2B)%2B$");
    assert.ok([200, 400].includes(status), `unexpected status ${status}`);
  });

  await check("protected fields cannot be selected through ?fields=", async () => {
    const { status, payload } = await request(
      "GET",
      "/api/auth/users?fields=%2BtokenVersion,%2BemailVerification,email",
      { token: adminToken },
    );
    assert.strictEqual(status, 200);
    payload.data.forEach((row) => {
      assert.strictEqual(row.tokenVersion, undefined);
      assert.strictEqual(row.emailVerification, undefined);
    });
  });

  await check("a file disguised as an image is refused and deleted", async () => {
    const form = new FormData();
    form.append("file", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "x.png");
    const response = await fetch(`${origin}/api/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${adminToken}` },
      body: form,
    });
    assert.strictEqual(response.status, 400);
  });

  await check("two simultaneous cancellations release the stock only once", async () => {
    const before = (await Book.findById(bookId).lean()).stock;
    const created = await request("POST", "/api/orders", {
      token,
      body: {
        items: [{ book: bookId, quantity: 1 }],
        shippingAddress: {
          firstName: "Jane",
          lastName: "Reader",
          email: "jane@test.local",
          address: "12 Library Lane",
          city: "Paris",
          country: "France",
        },
      },
    });
    assert.strictEqual(created.status, 201);

    const id = created.payload.data._id;
    const results = await Promise.all([
      request("PATCH", `/api/orders/${id}/cancel`, { token }),
      request("PATCH", `/api/orders/${id}/cancel`, { token }),
    ]);
    assert.deepStrictEqual(results.map((r) => r.status).sort(), [200, 400]);

    const after = (await Book.findById(bookId).lean()).stock;
    assert.strictEqual(after, before);
  });

  await check("logging out revokes every token issued before", async () => {
    const jane = await User.findOne({ email: "jane@test.local" }).select("+tokenVersion");
    const response = await fetch(`${origin}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `refreshToken=${signRefreshToken(jane)}` },
    });
    assert.strictEqual(response.status, 200);

    const { status } = await request("GET", "/api/auth/me", { token });
    assert.strictEqual(status, 401);
  });

  const primeResetCode = async (email, code = "135790") => {
    await User.updateOne(
      { email },
      {
        $set: {
          passwordReset: {
            codeHash: hashResetCode(code),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            attempts: 0,
            sentAt: new Date(),
          },
        },
      },
    );
    return code;
  };

  await check("forgot-password answers identically for known and unknown addresses", async () => {
    const known = await request("POST", "/api/auth/forgot-password", {
      body: { email: "jane@test.local" },
    });
    const unknown = await request("POST", "/api/auth/forgot-password", {
      body: { email: "nobody@test.local" },
    });
    assert.strictEqual(known.status, 200);
    assert.strictEqual(unknown.status, 200);
    assert.strictEqual(known.payload.message, unknown.payload.message);
    assert.deepStrictEqual(Object.keys(known.payload.data), Object.keys(unknown.payload.data));
  });

  await check("forgot-password stores only a hash of the code", async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const jane = await User.findOne({ email: "jane@test.local" }).select("+passwordReset").lean();
    assert.ok(jane.passwordReset?.codeHash);
    assert.strictEqual(jane.passwordReset.codeHash.length, 64);
  });

  await check("a wrong reset code is refused and counted", async () => {
    await primeResetCode("jane@test.local");
    const { status, payload } = await request("POST", "/api/auth/reset-password", {
      body: { email: "jane@test.local", code: "000000", password: "NewPassword456" },
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(payload.code, "RESET_CODE_INVALID");
    const jane = await User.findOne({ email: "jane@test.local" }).select("+passwordReset").lean();
    assert.strictEqual(jane.passwordReset.attempts, 1);
  });

  await check("a reset code burns after too many wrong attempts", async () => {
    await primeResetCode("jane@test.local");
    for (let i = 0; i < 5; i += 1) {
      await request("POST", "/api/auth/reset-password", {
        body: { email: "jane@test.local", code: "000000", password: "NewPassword456" },
      });
    }
    const { status, payload } = await request("POST", "/api/auth/reset-password", {
      body: { email: "jane@test.local", code: "135790", password: "NewPassword456" },
    });
    assert.strictEqual(status, 429);
    assert.strictEqual(payload.code, "RESET_CODE_BURNED");
  });

  await check("a weak new password is refused", async () => {
    const code = await primeResetCode("jane@test.local");
    const { status } = await request("POST", "/api/auth/reset-password", {
      body: { email: "jane@test.local", code, password: "short" },
    });
    assert.strictEqual(status, 422);
  });

  await check("a valid reset code sets the password, opens a session and revokes the old ones", async () => {
    const before = await request("POST", "/api/auth/login", {
      body: { email: "jane@test.local", password: "Password123" },
    });
    assert.strictEqual(before.status, 200);
    const oldToken = before.payload.data.accessToken;

    const code = await primeResetCode("jane@test.local");
    const { status, payload } = await request("POST", "/api/auth/reset-password", {
      body: { email: "jane@test.local", code, password: "NewPassword456" },
    });
    assert.strictEqual(status, 200);
    assert.ok(payload.data.accessToken);

    const revoked = await request("GET", "/api/auth/me", { token: oldToken });
    assert.strictEqual(revoked.status, 401);

    const fresh = await request("GET", "/api/auth/me", { token: payload.data.accessToken });
    assert.strictEqual(fresh.status, 200);

    const oldLogin = await request("POST", "/api/auth/login", {
      body: { email: "jane@test.local", password: "Password123" },
    });
    assert.strictEqual(oldLogin.status, 401);

    const newLogin = await request("POST", "/api/auth/login", {
      body: { email: "jane@test.local", password: "NewPassword456" },
    });
    assert.strictEqual(newLogin.status, 200);
  });

  await check("a reset code cannot be used twice", async () => {
    const { status, payload } = await request("POST", "/api/auth/reset-password", {
      body: { email: "jane@test.local", code: "135790", password: "Another789x" },
    });
    assert.strictEqual(status, 400);
    assert.strictEqual(payload.code, "RESET_CODE_MISSING");
  });

  await check("a reset reclaims an address squatted with an unconfirmed account", async () => {
    const squat = await request("POST", "/api/auth/register", {
      body: { fullName: "Squatter", email: "victim@test.local", password: "Squatter123" },
    });
    assert.strictEqual(squat.status, 201);

    const code = await primeResetCode("victim@test.local");
    const { status } = await request("POST", "/api/auth/reset-password", {
      body: { email: "victim@test.local", code, password: "Victim12345" },
    });
    assert.strictEqual(status, 200);

    const attacker = await request("POST", "/api/auth/login", {
      body: { email: "victim@test.local", password: "Squatter123" },
    });
    assert.strictEqual(attacker.status, 401);

    const owner = await request("POST", "/api/auth/login", {
      body: { email: "victim@test.local", password: "Victim12345" },
    });
    assert.strictEqual(owner.status, 200);
    assert.strictEqual(owner.payload.data.user.emailVerified, true);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);

  await mongoose.connection.dropDatabase();
  await new Promise((resolve) => server.close(resolve));
  await disconnectDB();

  process.exit(failed === 0 ? 0 : 1);
};

run().catch(async (error) => {
  console.error("\nsmoke test crashed:", error);
  try {
    if (server) server.close();
    await mongoose.connection.dropDatabase();
    await disconnectDB();
  } catch {
  }
  process.exit(1);
});
