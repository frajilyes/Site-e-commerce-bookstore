const env = require("../config/env");

const RESERVED_PARAMS = ["page", "limit", "sort", "fields", "keyword", "search"];

const OPERATORS = new Set([
  "gte", "gt", "lte", "lt", "ne", "eq",
  "in", "nin", "all", "size", "exists",
]);

const PROTECTED_FIELDS = new Set([
  "password",
  "passwordChangedAt",
  "tokenVersion",
  "emailVerification",
  "passwordReset",
  "providers",
  "__v",
]);

const MAX_KEYWORD_LENGTH = 100;
const MAX_LIST_LENGTH = 50;
const SORT_FIELD = /^-?[A-Za-z_][A-Za-z0-9_.]{0,60}$/;

const withMongoOperators = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    const next = withMongoOperators(child);
    output[OPERATORS.has(key) ? `$${key}` : key] =
      Array.isArray(next) ? next.slice(0, MAX_LIST_LENGTH) : next;
  }
  return output;
};

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, (match) => `\\${match}`);

class ApiFeatures {
  constructor(query, queryString = {}, { allowedFields = null } = {}) {
    this.query = query;
    this.queryString = queryString;
    this.allowedFields = allowedFields;
  }

  filter() {
    const raw = { ...this.queryString };
    RESERVED_PARAMS.forEach((field) => delete raw[field]);

    if (this.allowedFields) {
      Object.keys(raw).forEach((key) => {
        if (!this.allowedFields.includes(key)) delete raw[key];
      });
    }

    this.query = this.query.find(withMongoOperators(raw));
    return this;
  }

  search(fields = []) {
    const raw = this.queryString.keyword || this.queryString.search;
    if (!raw || typeof raw !== "string") return this;
    const keyword = raw.trim().slice(0, MAX_KEYWORD_LENGTH);
    if (!keyword) return this;

    const pattern = new RegExp(escapeRegex(keyword), "i");

    this.query = this.query.find({
      $or: fields.map((field) => ({ [field]: pattern })),
    });
    return this;
  }

  sort(defaultSort = "-createdAt") {
    const requested = String(this.queryString.sort || "")
      .split(",")
      .map((field) => field.trim())
      .filter((field) => SORT_FIELD.test(field) && !PROTECTED_FIELDS.has(field.replace(/^-/, "")))
      .slice(0, 5);
    const sortBy = requested.length ? requested.join(" ") : defaultSort;

    this.query = this.query.sort(`${sortBy} -_id`);
    return this;
  }

  limitFields() {
    if (!this.queryString.fields) {
      this.query = this.query.select("-__v");
      return this;
    }

    const fields = String(this.queryString.fields)
      .split(",")
      .map((field) => field.trim())
      .filter((field) => /^[+-]?[A-Za-z_][A-Za-z0-9_.]{0,60}$/.test(field))
      .filter((field) => !PROTECTED_FIELDS.has(field.replace(/^[+-]/, "").split(".")[0]));

    this.query = this.query.select(fields.length ? fields.join(" ") : "-__v");
    return this;
  }

  paginate() {
    const page = Math.min(Math.max(Number.parseInt(this.queryString.page, 10) || 1, 1), 10000);
    const limit = Math.min(
      Math.max(Number.parseInt(this.queryString.limit, 10) || env.DEFAULT_PAGE_SIZE, 1),
      env.MAX_PAGE_SIZE,
    );

    this.pagination = { page, limit, skip: (page - 1) * limit };
    this.query = this.query.skip(this.pagination.skip).limit(limit);
    return this;
  }

  lean() {
    this.query = this.query.lean();
    return this;
  }

  async execute(model = this.query.model) {
    const filter = this.query.getFilter();

    const [data, total] = await Promise.all([
      this.query,
      model.countDocuments(filter),
    ]);

    const { page, limit } = this.pagination || { page: 1, limit: data.length };

    return {
      total,
      page,
      limit,
      totalPages: limit ? Math.ceil(total / limit) : 1,
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
      data,
    };
  }
}

module.exports = ApiFeatures;
