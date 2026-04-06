/**
 * Centralized error handler — must be the last middleware registered in app.js.
 *
 * All errors thrown across the app (controllers, services, middleware) bubble
 * here. We normalize them into a consistent JSON response shape so the client
 * always knows what to expect.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";

  // Mongoose duplicate key (e.g. duplicate email on register)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`;
    statusCode = 409;
  }

  // Mongoose validation errors (schema-level)
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    message = messages.join("; ");
    statusCode = 400;
  }

  // Mongoose invalid ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    message = "Invalid ID format";
    statusCode = 400;
  }

  if (process.env.NODE_ENV === "development") {
    console.error(`[ERROR] ${statusCode} - ${message}`, err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;
