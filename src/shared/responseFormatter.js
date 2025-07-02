/**
 * Response Formatting Middleware
 * 
 * Provides consistent response formatting across all API endpoints
 */

/**
 * Standard success response format
 */
export function formatSuccess(data = null, message = null) {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Standard error response format
 */
export function formatError(code, message, details = null, statusCode = 500) {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    timestamp: new Date().toISOString(),
    statusCode
  };
}

/**
 * Express middleware to add response formatting helpers to res object
 */
export function responseFormatter(req, res, next) {
  // Track request start time for execution time calculation
  req.startTime = Date.now();

  /**
   * Send success response
   */
  res.success = function(data = null, message = null, statusCode = 200) {
    const executionTime = Date.now() - req.startTime;
    const response = {
      ...formatSuccess(data, message),
      execution_time_ms: executionTime
    };
    
    return this.status(statusCode).json(response);
  };

  /**
   * Send error response
   */
  res.error = function(code, message, details = null, statusCode = 500) {
    const response = formatError(code, message, details, statusCode);
    return this.status(statusCode).json(response);
  };

  /**
   * Send validation error response
   */
  res.validationError = function(errors, message = 'Validation failed') {
    return this.error('VALIDATION_ERROR', message, errors, 400);
  };

  /**
   * Send not found response
   */
  res.notFound = function(resource = 'Resource') {
    return this.error('NOT_FOUND', `${resource} not found`, null, 404);
  };

  /**
   * Send unauthorized response
   */
  res.unauthorized = function(message = 'Unauthorized access') {
    return this.error('UNAUTHORIZED', message, null, 401);
  };

  /**
   * Send forbidden response
   */
  res.forbidden = function(message = 'Forbidden access') {
    return this.error('FORBIDDEN', message, null, 403);
  };

  next();
}

/**
 * Common error codes
 */
export const ErrorCodes = {
  // General errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  PORT_NOT_AVAILABLE: 'PORT_NOT_AVAILABLE',
  ALREADY_CONNECTED: 'ALREADY_CONNECTED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  
  // Machine errors
  MACHINE_NOT_READY: 'MACHINE_NOT_READY',
  MACHINE_ALARM: 'MACHINE_ALARM',
  COMMAND_FAILED: 'COMMAND_FAILED',
  INVALID_GCODE: 'INVALID_GCODE',
  
  // File errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  FILE_ACCESS_ERROR: 'FILE_ACCESS_ERROR',
  
  // Execution errors
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  
  // Preset errors
  PRESET_NOT_FOUND: 'PRESET_NOT_FOUND',
  PRESET_ALREADY_EXISTS: 'PRESET_ALREADY_EXISTS',
  PRESET_INVALID: 'PRESET_INVALID'
};