/**
 * Server Error Handler Middleware Unit Tests
 */

import { errorHandler, notFoundHandler } from '../errorHandler.js';
import { ErrorCodes } from '../../shared/responseFormatter.js';
import { createMockRequest, createMockResponse, createMockNext, createMockError } from '../../shared/__mocks__/express-mocks.js';

// Mock logger
jest.mock('@cnc/core/services/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}));

import { info, error as logError } from '@cnc/core/services/logger';

describe('Server Error Handler Middleware', () => {
  let req, res, next;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    req = createMockRequest({
      url: '/api/test',
      method: 'GET',
      ip: '192.168.1.100'
    });
    res = createMockResponse();
    res.error = jest.fn();
    next = createMockNext();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('errorHandler', () => {
    test('should log error details', () => {
      const error = createMockError('Test error', 'TEST_ERROR', 400);
      
      errorHandler(error, req, res, next);

      expect(logError).toHaveBeenCalledWith('API Error:', {
        error: 'Test error',
        stack: error.stack,
        url: '/api/test',
        method: 'GET',
        ip: '192.168.1.100',
        userAgent: 'Jest Test Agent'
      });
    });

    test('should handle JSON parse errors', () => {
      const error = new SyntaxError('Unexpected token in JSON');
      error.type = 'entity.parse.failed';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid JSON in request body',
        'Unexpected token in JSON',
        400
      );
    });

    test('should hide error details in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new SyntaxError('Unexpected token in JSON');
      error.type = 'entity.parse.failed';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid JSON in request body',
        null,
        400
      );
    });

    test('should show error details in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new SyntaxError('Unexpected token in JSON');
      error.type = 'entity.parse.failed';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Invalid JSON in request body',
        'Unexpected token in JSON',
        400
      );
    });

    test('should handle file size limit errors', () => {
      const error = new Error('File too large');
      error.code = 'LIMIT_FILE_SIZE';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.FILE_UPLOAD_ERROR,
        'File size too large',
        expect.any(String),
        413
      );
    });

    test('should handle unexpected file field errors', () => {
      const error = new Error('Unexpected field');
      error.code = 'LIMIT_UNEXPECTED_FILE';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.FILE_UPLOAD_ERROR,
        'Unexpected file field',
        expect.any(String),
        400
      );
    });

    test('should handle missing file errors', () => {
      const error = new Error('Missing file');
      error.code = 'LIMIT_FILE_COUNT';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.FILE_UPLOAD_ERROR,
        'No file provided',
        expect.any(String),
        400
      );
    });

    test('should handle validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = { field: 'email', message: 'Invalid email' };
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Validation failed',
        { field: 'email', message: 'Invalid email' },
        400
      );
    });

    test('should handle database connection errors', () => {
      const error = new Error('Connection lost');
      error.code = 'ECONNREFUSED';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Database connection failed',
        expect.any(String),
        503
      );
    });

    test('should handle timeout errors', () => {
      const error = new Error('Timeout');
      error.code = 'ETIMEDOUT';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Request timeout',
        expect.any(String),
        408
      );
    });

    test('should handle generic errors with default response', () => {
      const error = new Error('Unknown error');
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Internal server error',
        expect.any(String),
        500
      );
    });

    test('should handle errors without res.error method', () => {
      const error = createMockError();
      delete res.error;
      
      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCodes.INTERNAL_ERROR,
            message: 'Internal server error'
          })
        })
      );
    });

    test('should include stack trace in development', () => {
      process.env.NODE_ENV = 'development';
      const error = new Error('Test error');
      delete res.error;
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            stack: error.stack
          })
        })
      );
    });

    test('should exclude stack trace in production', () => {
      process.env.NODE_ENV = 'production';
      const error = new Error('Test error');
      delete res.error;
      
      errorHandler(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.not.objectContaining({
            stack: expect.anything()
          })
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    test('should handle 404 errors', () => {
      notFoundHandler(req, res);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.NOT_FOUND,
        'API endpoint not found',
        {
          url: '/api/test',
          method: 'GET',
          availableEndpoints: [
            '/api/v1/health',
            '/api/v1/info',
            '/api/v1/connection/*',
            '/api/v1/machine/*',
            '/api/v1/gcode/*',
            '/api/v1/files/*',
            '/api/v1/presets/*',
            '/api/v1/help',
            '/api/v1/docs'
          ]
        },
        404
      );
    });

    test('should log 404 attempts', () => {
      notFoundHandler(req, res);

      expect(info).toHaveBeenCalledWith(
        'API: 404 - Endpoint not found: GET /api/test'
      );
    });

    test('should handle 404 without res.error method', () => {
      delete res.error;
      
      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: ErrorCodes.NOT_FOUND,
            message: 'API endpoint not found'
          })
        })
      );
    });
  });
});