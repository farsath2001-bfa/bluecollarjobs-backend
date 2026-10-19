const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Something went wrong';

  // Bad ObjectId, e.g. /api/jobs/123
  if (err.name === 'CastError') {
    status = 404;
    message = 'Not found';
  }

  // Mongoose validation: join field messages into one readable sentence
  if (err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('. ');
  }

  // Unique index clash
  if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'value';
    message = field === 'email' ? 'That email is already registered' : `That ${field} already exists`;
  }

  if (status >= 500) console.error(err);

  res.status(status).json({
    message,
    ...(process.env.NODE_ENV !== 'production' && status === 500 ? { stack: err.stack } : {}),
  });
};

module.exports = { errorHandler, notFound };
