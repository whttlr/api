/**
 * CORS Middleware Unit Tests
 */

import { corsMiddleware } from '../cors.js';
import { createMockRequest, createMockResponse, createMockNext } from '../../shared/__mocks__/express-mocks.js';

// Mock cors module
jest.mock('cors', () => {
  const mockCors = jest.fn((options) => {
    return (req, res, next) => {
      // Simulate CORS behavior
      if (options.origin) {
        const origin = req.headers.origin;
        options.origin(origin, (err, allowed) => {
          if (err) return next(err);
          if (allowed) {
            res.setHeader('Access-Control-Allow-Origin', origin || '*');
          }
          next();
        });
      } else {
        next();
      }
    };
  });
  return mockCors;
});

// Mock logger
jest.mock('@cnc/core/services/logger', () => ({
  info: jest.fn()
}));

import cors from 'cors';
import { info } from '@cnc/core/services/logger';

describe('CORS Middleware', () => {
  let req, res, next;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    req = createMockRequest();
    res = createMockResponse();
    next = createMockNext();
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('should configure cors with proper options', () => {
    expect(cors).toHaveBeenCalledWith(expect.objectContaining({
      origin: expect.any(Function),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      optionsSuccessStatus: 200
    }));
  });

  describe('origin function', () => {
    let originFunction;

    beforeEach(() => {
      const corsCall = cors.mock.calls[0];
      originFunction = corsCall[0].origin;
    });

    test('should allow requests with no origin', () => {
      const callback = jest.fn();
      
      originFunction(undefined, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    test('should allow all origins in development', () => {
      process.env.NODE_ENV = 'development';
      const callback = jest.fn();
      const origin = 'http://evil-site.com';
      
      originFunction(origin, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    test('should allow all origins when NODE_ENV is not production', () => {
      process.env.NODE_ENV = 'test';
      const callback = jest.fn();
      const origin = 'http://any-site.com';
      
      originFunction(origin, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    test('should allow localhost origins in production', () => {
      process.env.NODE_ENV = 'production';
      const callback = jest.fn();
      const origin = 'http://localhost:3000';
      
      originFunction(origin, callback);
      
      expect(callback).toHaveBeenCalledWith(null, true);
    });

    test('should allow configured localhost ports in production', () => {
      process.env.NODE_ENV = 'production';
      const callback = jest.fn();
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001', 
        'http://localhost:8080'
      ];

      allowedOrigins.forEach(origin => {
        const cb = jest.fn();
        originFunction(origin, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });
    });

    test('should reject unauthorized origins in production', () => {
      process.env.NODE_ENV = 'production';
      const callback = jest.fn();
      const origin = 'http://unauthorized-site.com';
      
      originFunction(origin, callback);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Not allowed by CORS')
        }),
        false
      );
    });

    test('should handle https localhost in production', () => {
      process.env.NODE_ENV = 'production';
      const callback = jest.fn();
      const origin = 'https://localhost:3000';
      
      // This should be rejected unless specifically configured
      originFunction(origin, callback);
      
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Not allowed by CORS')
        }),
        false
      );
    });
  });

  describe('corsMiddleware integration', () => {
    test('should export configured CORS middleware', () => {
      expect(corsMiddleware).toBeDefined();
      expect(typeof corsMiddleware).toBe('function');
    });

    test('should call next() when CORS check passes', () => {
      process.env.NODE_ENV = 'development';
      req.headers.origin = 'http://localhost:3000';
      
      corsMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    test('should set CORS headers when origin is allowed', () => {
      process.env.NODE_ENV = 'development';
      req.headers.origin = 'http://localhost:3000';
      
      corsMiddleware(req, res, next);
      
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
    });

    test('should handle requests without origin header', () => {
      process.env.NODE_ENV = 'production';
      // No origin header (like direct API calls)
      delete req.headers.origin;
      
      corsMiddleware(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        '*'
      );
    });
  });

  describe('CORS configuration', () => {
    test('should configure appropriate HTTP methods', () => {
      const corsCall = cors.mock.calls[0];
      const options = corsCall[0];
      
      expect(options.methods).toEqual(['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']);
    });

    test('should configure appropriate headers', () => {
      const corsCall = cors.mock.calls[0];
      const options = corsCall[0];
      
      expect(options.allowedHeaders).toEqual([
        'Content-Type', 
        'Authorization', 
        'X-Requested-With'
      ]);
    });

    test('should enable credentials', () => {
      const corsCall = cors.mock.calls[0];
      const options = corsCall[0];
      
      expect(options.credentials).toBe(true);
    });

    test('should set OPTIONS success status', () => {
      const corsCall = cors.mock.calls[0];
      const options = corsCall[0];
      
      expect(options.optionsSuccessStatus).toBe(200);
    });
  });
});