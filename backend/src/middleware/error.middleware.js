import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

/**
 * Centralized error handling middleware.
 * Returns structured JSON errors. Never exposes stack traces in production.
 */
export const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.errorCode || 'INTERNAL_ERROR';

  // Zod validation errors
  if (err.name === 'ZodError') {
    statusCode = 422;
    errorCode = 'VALIDATION_ERROR';
    message = err.errors?.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') || 'Validation failed';
  }

  // PostgreSQL errors
  if (err.code === '23505') {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'A record with this information already exists';
  }
  if (err.code === '23503') {
    statusCode = 400;
    errorCode = 'FOREIGN_KEY_VIOLATION';
    message = 'Referenced record does not exist';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    errorCode = 'FILE_TOO_LARGE';
    message = `File too large. Maximum size is ${config.upload.maxFileSizeMB}MB`;
  }

  if (statusCode >= 500) {
    logger.error(`[${errorCode}] ${message}`, err.stack ? err.stack.slice(0, 300) : '');
  } else {
    logger.warn(`[${errorCode}] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorCode,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
};

/**
 * Create a standard API error.
 */
export const createError = (message, statusCode = 400, errorCode = 'BAD_REQUEST') => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  return err;
};

export default errorMiddleware;
