/**
 * Custom error class that carries an HTTP status code.
 * Throwing this anywhere in the app will be caught by the
 * centralized error handler and returned as a proper JSON response.
 */
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // distinguishes expected errors from bugs
  }
}

export default ApiError;
