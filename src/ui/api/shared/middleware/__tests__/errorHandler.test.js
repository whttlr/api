/**
 * Shared Error Handler Middleware Unit Tests
 */

import { asyncHandler, throwError, errorHandler } from '../errorHandler.js';
import { ErrorCodes } from '../../responseFormatter.js';
import { createMockRequest, createMockResponse, createMockNext, createMockError } from '../../__mocks__/express-mocks.js';

// Mock the logger
jest.mock('../../../../../lib/logger/LoggerService.js', () => ({
  error: jest.fn()
}));

// Mock the config messages
jest.mock('../../../config/messages.js', () => ({
  getApiMessages: jest.fn(() => ({
    errors: {
      internal_error: 'An internal error occurred',
      validation_error: 'Validation failed'
    }
  }))
}));

import { error as logError } from '../../../../../lib/logger/LoggerService.js';
import { getApiMessages } from '../../../config/messages.js';

describe('Shared Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('asyncHandler', () => {
    test('should call function and pass through result for successful operations', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const wrappedFn = asyncHandler(mockFn);
      await wrappedFn(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });

    test('should catch async errors and call next', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const wrappedFn = asyncHandler(mockFn);
      await wrappedFn(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    test('should catch synchronous errors and call next', async () => {
      const error = new Error('Sync error');
      const mockFn = jest.fn(() => {
        throw error;
      });
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const wrappedFn = asyncHandler(mockFn);
      await wrappedFn(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).toHaveBeenCalledWith(error);
    });

    test('should handle functions that return non-promises', async () => {
      const mockFn = jest.fn().mockReturnValue('sync result');
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      const wrappedFn = asyncHandler(mockFn);
      await wrappedFn(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('throwError', () => {
    test('should throw error with all parameters', () => {
      const code = 'VALIDATION_ERROR';
      const message = 'Invalid input';
      const details = { field: 'email' };
      const statusCode = 400;

      expect(() => {
        throwError(code, message, details, statusCode);
      }).toThrow();

      try {
        throwError(code, message, details, statusCode);
      } catch (error) {
        expect(error.message).toBe('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
        expect(error.details).toEqual({ field: 'email' });
        expect(error.statusCode).toBe(400);
      }
    });

    test('should throw error with defaults', () => {
      const code = 'INTERNAL_ERROR';
      const message = 'Something went wrong';

      expect(() => {
        throwError(code, message);
      }).toThrow();

      try {
        throwError(code, message);
      } catch (error) {
        expect(error.message).toBe('Something went wrong');
        expect(error.code).toBe('INTERNAL_ERROR');
        expect(error.details).toBeNull();
        expect(error.statusCode).toBe(500);
      }
    });

    test('should throw error without details', () => {
      const code = 'NOT_FOUND';
      const message = 'Resource not found';
      const statusCode = 404;

      expect(() => {
        throwError(code, message, null, statusCode);
      }).toThrow();

      try {
        throwError(code, message, null, statusCode);
      } catch (error) {
        expect(error.message).toBe('Resource not found');
        expect(error.code).toBe('NOT_FOUND');
        expect(error.details).toBeNull();
        expect(error.statusCode).toBe(404);
      }
    });
  });

  describe('errorHandler middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = createMockRequest({ 
        url: '/api/test',
        method: 'POST',
        language: 'en'
      });
      res = createMockResponse();
      res.error = jest.fn();
      next = createMockNext();
    });

    test('should log error details', () => {
      const error = createMockError('Test error', 'TEST_ERROR', 400);
      error.details = { field: 'test' };

      errorHandler(error, req, res, next);

      expect(logError).toHaveBeenCalledWith('API Error:', {
        code: 'TEST_ERROR',
        message: 'Test error',
        details: { field: 'test' },
        stack: error.stack,
        url: '/api/test',
        method: 'POST'
      });
    });

    test('should handle error with custom status code', () => {
      const error = createMockError('Validation failed', 'VALIDATION_ERROR', 400);
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        'VALIDATION_ERROR',
        'Validation failed',
        { test: true },
        400
      );
    });

    test('should handle error without status code (default to 500)', () => {
      const error = new Error('Unknown error');
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Unknown error',
        undefined,
        500
      );
    });

    test('should handle ValidationError with 400 status', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Validation failed',
        undefined,
        400
      );
    });

    test('should handle UnauthorizedError with 401 status', () => {
      const error = new Error('Unauthorized');
      error.name = 'UnauthorizedError';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Unauthorized',
        undefined,
        401
      );
    });

    test('should handle ForbiddenError with 403 status', () => {
      const error = new Error('Forbidden');
      error.name = 'ForbiddenError';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Forbidden',
        undefined,
        403
      );
    });

    test('should handle SyntaxError for JSON parsing', () => {
      const error = new SyntaxError('Unexpected token in JSON');
      error.type = 'entity.parse.failed';
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.VALIDATION_ERROR,
        'Unexpected token in JSON',
        undefined,
        400
      );
    });

    test('should use default language when not provided', () => {
      req.language = undefined;
      const error = createMockError();
      
      errorHandler(error, req, res, next);

      expect(getApiMessages).toHaveBeenCalledWith('en');
    });

    test('should use provided language', () => {
      req.language = 'es';
      const error = createMockError();
      
      errorHandler(error, req, res, next);

      expect(getApiMessages).toHaveBeenCalledWith('es');
    });

    test('should handle error without code property', () => {
      const error = new Error('Generic error');
      delete error.code;
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalledWith(
        ErrorCodes.INTERNAL_ERROR,
        'Generic error',
        undefined,
        500
      );
    });

    test('should call res.error if it exists', () => {
      const error = createMockError();
      
      errorHandler(error, req, res, next);

      expect(res.error).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    test('should call next if res.error does not exist', () => {
      const error = createMockError();
      delete res.error;
      
      errorHandler(error, req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});