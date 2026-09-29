const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

const SCALAR_QUERY_KEYS = new Set([
  "page",
  "limit",
  "sort",
  "fields",
  "keyword",
  "search",
  "category",
  "author",
  "status",
]);

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const clean = (value, depth = 0) => {
  if (depth > 10 || value === null || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) continue;
    if (key.startsWith("$") || key.includes(".")) continue;
    output[key] = clean(child, depth + 1);
  }
  return output;
};

const sanitize = (req, res, next) => {
  if (req.body === undefined) req.body = {};

  if (isPlainObject(req.body) || Array.isArray(req.body)) {
    req.body = clean(req.body);
  }

  if (req.params && Object.keys(req.params).length) {
    Object.assign(req.params, clean({ ...req.params }));
  }

  const rawQuery = req.query;
  if (rawQuery && Object.keys(rawQuery).length) {
    const cleaned = clean({ ...rawQuery });
    for (const key of Object.keys(cleaned)) {
      if (SCALAR_QUERY_KEYS.has(key) && Array.isArray(cleaned[key])) {
        cleaned[key] = cleaned[key][cleaned[key].length - 1];
      }
    }
    Object.defineProperty(req, "query", {
      value: cleaned,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  next();
};

module.exports = sanitize;
