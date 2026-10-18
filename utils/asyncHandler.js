// Wraps an async route handler so thrown errors reach the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Throw this from a controller to send a specific status code + message.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const escapeRegex = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { asyncHandler, HttpError, escapeRegex };
