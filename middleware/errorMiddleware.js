const { ApiError } = require('../utils/ApiError');

function errorMiddleware(err, req, res, next) {
  const requestId = req.requestId || null;
  const isApiError = err instanceof ApiError;

  const status = isApiError ? err.status : 500;
  const code = isApiError ? err.code : 'INTERNAL_ERROR';
  const message = isApiError
    ? err.message
    : 'Something went wrong. Please try again.';

  const payload = {
    ok: false,
    error: { code, message },
    requestId,
  };

  if (isApiError && err.details) {
    payload.error.details = err.details;
  }

  console.error(
    `[${new Date().toISOString()}] requestId=${requestId} status=${status} code=${code} message=${err.message}`
  );
  if (!isApiError && err && err.stack) console.error(err.stack);

  res.status(status).json(payload);
}

module.exports = { errorMiddleware };
