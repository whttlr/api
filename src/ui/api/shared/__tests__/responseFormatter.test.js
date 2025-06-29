/**
 * Response Formatter Unit Tests
 */

import { formatSuccess, formatError, responseFormatter, ErrorCodes } from '../responseFormatter.js';
import { createMockRequest, createMockResponse, createMockNext } from '../__mocks__/express-mocks.js';

// Mock Date.now for consistent timestamps
const MOCK_TIMESTAMP = '2024-06-28T12:00:00.000Z';
const MOCK_NOW = 1719576000000;

describe('ResponseFormatter', () => {
  let mockDateNow;

  beforeEach(() => {
    mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue(MOCK_TIMESTAMP);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('formatSuccess', () => {
    test('should create success response with data and message', () => {
      const data = { id: 1, name: 'test' };
      const message = 'Operation successful';

      const result = formatSuccess(data, message);

      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'test' },
        message: 'Operation successful',
        timestamp: MOCK_TIMESTAMP
      });
    });

    test('should create success response with null data and message', () => {
      const result = formatSuccess();

      expect(result).toEqual({
        success: true,
        data: null,
        message: null,
        timestamp: MOCK_TIMESTAMP
      });
    });

    test('should create success response with only data', () => {
      const data = { result: 'success' };

      const result = formatSuccess(data);

      expect(result).toEqual({
        success: true,
        data: { result: 'success' },
        message: null,
        timestamp: MOCK_TIMESTAMP
      });
    });

    test('should create success response with only message', () => {
      const message = 'Task completed';

      const result = formatSuccess(null, message);

      expect(result).toEqual({
        success: true,
        data: null,
        message: 'Task completed',
        timestamp: MOCK_TIMESTAMP
      });
    });
  });

  describe('formatError', () => {
    test('should create error response with all parameters', () => {
      const code = 'VALIDATION_ERROR';
      const message = 'Invalid input provided';
      const details = { field: 'email', value: 'invalid' };
      const statusCode = 400;

      const result = formatError(code, message, details, statusCode);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input provided',
          details: { field: 'email', value: 'invalid' }
        },
        timestamp: MOCK_TIMESTAMP,
        statusCode: 400
      });
    });

    test('should create error response with defaults', () => {
      const code = 'INTERNAL_ERROR';
      const message = 'Something went wrong';

      const result = formatError(code, message);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
          details: null
        },
        timestamp: MOCK_TIMESTAMP,
        statusCode: 500
      });
    });

    test('should create error response without details', () => {
      const code = 'NOT_FOUND';
      const message = 'Resource not found';
      const statusCode = 404;

      const result = formatError(code, message, null, statusCode);

      expect(result).toEqual({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          details: null
        },
        timestamp: MOCK_TIMESTAMP,
        statusCode: 404
      });
    });
  });

  describe('responseFormatter middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = createMockRequest();
      res = createMockResponse();
      next = createMockNext();
    });

    test('should add startTime to request', () => {
      responseFormatter(req, res, next);

      expect(req.startTime).toBe(MOCK_NOW);
      expect(next).toHaveBeenCalledWith();
    });

    test('should add success method to response', () => {
      responseFormatter(req, res, next);

      expect(typeof res.success).toBe('function');
    });

    test('should add error method to response', () => {
      responseFormatter(req, res, next);

      expect(typeof res.error).toBe('function');
    });

    describe('res.success method', () => {
      beforeEach(() => {
        responseFormatter(req, res, next);
        // Simulate some execution time
        mockDateNow.mockReturnValue(MOCK_NOW + 150);
      });

      test('should send success response with execution time', () => {
        const data = { result: 'success' };
        const message = 'Operation completed';

        res.success(data, message);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: { result: 'success' },
          message: 'Operation completed',
          timestamp: MOCK_TIMESTAMP,
          execution_time_ms: 150
        });
      });

      test('should send success response with custom status code', () => {
        const data = { created: true };
        const message = 'Resource created';
        const statusCode = 201;

        res.success(data, message, statusCode);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: { created: true },
          message: 'Resource created',
          timestamp: MOCK_TIMESTAMP,
          execution_time_ms: 150
        });
      });

      test('should send success response with defaults', () => {
        res.success();

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
          success: true,
          data: null,
          message: null,
          timestamp: MOCK_TIMESTAMP,
          execution_time_ms: 150
        });
      });
    });

    describe('res.error method', () => {
      beforeEach(() => {
        responseFormatter(req, res, next);
        // Simulate some execution time
        mockDateNow.mockReturnValue(MOCK_NOW + 100);
      });

      test('should send error response with execution time', () => {
        const code = 'VALIDATION_ERROR';
        const message = 'Invalid data';
        const details = { field: 'name' };
        const statusCode = 400;

        res.error(code, message, details, statusCode);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid data',
            details: { field: 'name' }
          },
          timestamp: MOCK_TIMESTAMP,
          statusCode: 400,
          execution_time_ms: 100
        });
      });

      test('should send error response with defaults', () => {
        const code = 'INTERNAL_ERROR';
        const message = 'Something went wrong';

        res.error(code, message);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong',
            details: null
          },
          timestamp: MOCK_TIMESTAMP,
          statusCode: 500,
          execution_time_ms: 100
        });
      });
    });
  });

  describe('ErrorCodes', () => {
    test('should have all required error codes', () => {
      expect(ErrorCodes).toHaveProperty('INTERNAL_ERROR');
      expect(ErrorCodes).toHaveProperty('VALIDATION_ERROR');
      expect(ErrorCodes).toHaveProperty('NOT_FOUND');
      expect(ErrorCodes).toHaveProperty('UNAUTHORIZED');
      expect(ErrorCodes).toHaveProperty('FORBIDDEN');
      
      // Connection errors
      expect(ErrorCodes).toHaveProperty('CONNECTION_FAILED');
      expect(ErrorCodes).toHaveProperty('PORT_NOT_AVAILABLE');
      expect(ErrorCodes).toHaveProperty('ALREADY_CONNECTED');
      expect(ErrorCodes).toHaveProperty('NOT_CONNECTED');
      
      // Machine errors
      expect(ErrorCodes).toHaveProperty('MACHINE_NOT_READY');
      expect(ErrorCodes).toHaveProperty('MACHINE_ALARM');
      expect(ErrorCodes).toHaveProperty('COMMAND_FAILED');
      expect(ErrorCodes).toHaveProperty('INVALID_GCODE');
      
      // File errors
      expect(ErrorCodes).toHaveProperty('FILE_NOT_FOUND');
      expect(ErrorCodes).toHaveProperty('FILE_UPLOAD_ERROR');
      expect(ErrorCodes).toHaveProperty('FILE_ACCESS_ERROR');
      
      // Execution errors
      expect(ErrorCodes).toHaveProperty('EXECUTION_FAILED');
      expect(ErrorCodes).toHaveProperty('INVALID_INPUT');
    });

    test('should have string values for all error codes', () => {
      Object.entries(ErrorCodes).forEach(([key, value]) => {
        expect(typeof value).toBe('string');
        expect(value).toBe(key);
      });
    });
  });
});