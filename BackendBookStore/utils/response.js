const sendSuccess = (res, statusCode, data, extra = {}) =>
  res.status(statusCode).json({ success: true, ...extra, data });

const sendPaginated = (res, result) =>
  res.status(200).json({
    success: true,
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
    hasNextPage: result.hasNextPage,
    hasPrevPage: result.hasPrevPage,
    data: result.data,
  });

module.exports = { sendSuccess, sendPaginated };
