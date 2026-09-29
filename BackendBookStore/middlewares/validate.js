const { validationResult } = require("express-validator");
const ApiError = require("../utils/ApiError");

const validate = (chains = []) => [
  ...chains,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array({ onlyFirstError: true }).map((e) => ({
      field: e.path || e.param,
      message: e.msg,
    }));

    return next(ApiError.unprocessable("Validation failed", details));
  },
];

module.exports = validate;
