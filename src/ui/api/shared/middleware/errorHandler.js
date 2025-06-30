/**
 * Shared Error Handling Middleware
 * 
 * Centralized error handling and async wrapper utilities.
 */

import { error as logError } from '@cnc/core/services/logger';
import { ErrorCodes } from '../responseFormatter.js';
import { getApiMessages } from '../../config/messages.js';

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Throw a standardized API error
 */
export const throwError = (code, message, details = null, statusCode = 500) => {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  error.statusCode = statusCode;
  throw error;
};

/**
 * Global error handling middleware
 */
export const errorHandler = (err, req, res, next) => {
  const language = req.language || 'en';
  const messages = getApiMessages(language);
  
  // Log the error
  logError('API Error:', {
    code: err.code,
    message: err.message,
    details: err.details,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Determine status code
  let statusCode = err.statusCode || 500;
  if (err.name === 'ValidationError') statusCode = 400;
  if (err.name === 'UnauthorizedError') statusCode = 401;
  if (err.name === 'ForbiddenError') statusCode = 403;

  // Determine error code and message
  let errorCode = err.code || ErrorCodes.INTERNAL_ERROR;
  let errorMessage = err.message;

  // Handle specific error types
  if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    errorCode = ErrorCodes.VALIDATION_ERROR;
    errorMessage = messages.common.errors.invalid_json;
    statusCode = 400;
  }

  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    errorMessage = messages.common.errors.internal_server_error;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      details: err.details || null
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * 404 handler for unmatched routes
 */
export const notFoundHandler = (req, res) => {
  const language = req.language || 'en';
  const messages = getApiMessages(language);
  
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: messages.common.errors.endpoint_not_found.replace('{method}', req.method).replace('{url}', req.url),
      details: null
    },
    timestamp: new Date().toISOString()
  });
};