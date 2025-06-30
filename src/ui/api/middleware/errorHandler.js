/**
 * Error Handling Middleware
 * 
 * Centralized error handling for all API endpoints
 */

import { info, error as logError } from '@cnc/core/services/logger';
import { ErrorCodes } from '../shared/responseFormatter.js';

/**
 * Express error handling middleware
 * Must be the last middleware in the stack
 */
export function errorHandler(err, req, res, next) {
  // Log the error for debugging
  logError('API Error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Handle different error types
  if (err.type === 'entity.parse.failed') {
    return res.error(
      ErrorCodes.VALIDATION_ERROR,
      'Invalid JSON in request body',
      isDevelopment ? err.message : null,
      400
    );
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.error(
      ErrorCodes.FILE_UPLOAD_ERROR,
      'File size too large',
      isDevelopment ? err.message : null,
      413
    );
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.error(
      ErrorCodes.FILE_UPLOAD_ERROR,
      'Unexpected file field',
      isDevelopment ? err.message : null,
      400
    );
  }

  // Handle validation errors
  if (err.isJoi || err.name === 'ValidationError') {
    const details = err.details ? err.details.map(detail => ({
      field: detail.path?.join('.'),
      message: detail.message,
      value: detail.context?.value
    })) : null;

    return res.error(
      ErrorCodes.VALIDATION_ERROR,
      'Request validation failed',
      isDevelopment ? details : null,
      400
    );
  }

  // Handle known application errors
  if (err.code && Object.values(ErrorCodes).includes(err.code)) {
    return res.error(
      err.code,
      err.message,
      isDevelopment ? err.details : null,
      err.statusCode || 500
    );
  }

  // Handle serial port errors
  if (err.message && err.message.includes('port')) {
    if (err.message.includes('not found') || err.message.includes('cannot open')) {
      return res.error(
        ErrorCodes.PORT_NOT_AVAILABLE,
        'Serial port is not available',
        isDevelopment ? err.message : null,
        400
      );
    }
    
    if (err.message.includes('in use') || err.message.includes('locked')) {
      return res.error(
        ErrorCodes.PORT_NOT_AVAILABLE,
        'Serial port is in use by another process',
        isDevelopment ? err.message : null,
        409
      );
    }
  }

  // Default internal server error
  return res.error(
    ErrorCodes.INTERNAL_ERROR,
    'An unexpected error occurred',
    isDevelopment ? {
      message: err.message,
      stack: err.stack
    } : null,
    500
  );
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error middleware
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req, res) {
  res.error(
    ErrorCodes.NOT_FOUND,
    `Route ${req.method} ${req.url} not found`,
    null,
    404
  );
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(code, message, details = null, statusCode = 500) {
    super(message);
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

/**
 * Helper function to throw application errors
 */
export function throwError(code, message, details = null, statusCode = 500) {
  throw new AppError(code, message, details, statusCode);
}