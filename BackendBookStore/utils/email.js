const normalizeEmail = (value) => String(value ?? "").trim().toLowerCase();

module.exports = { normalizeEmail };
