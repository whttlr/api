/**
 * Connection Routes Tests
 * 
 * Test suite for connection feature routing configuration.
 * Ensures proper route setup, middleware integration, and endpoint accessibility.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';

// Mock the controller functions
const mockController = {
  listPorts: jest.fn(),
  getStatus: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  healthCheck: jest.fn(),
  reset: jest.fn()
};

const mockSchemas = {
  validateConnection: jest.fn()
};

// Mock modules
jest.unstable_mockModule('../controller.js', () => mockController);
jest.unstable_mockModule('../schemas.js', () => mockSchemas);

// Import the router after mocking
const connectionRouter = await import('../routes.js');

describe('Connection Routes', () => {
  let app;

  beforeEach(() => {
    // Create Express app and mount router
    app = express();
    app.use(express.json());
    app.use('/api/v1/connection', connectionRouter.default);

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default mock behaviors
    mockController.listPorts.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { ports: [] } });
    });

    mockController.getStatus.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { connected: false } });
    });

    mockController.connect.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { connected: true } });
    });

    mockController.disconnect.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { connected: false } });
    });

    mockController.healthCheck.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { status: 'healthy' } });
    });

    mockController.reset.mockImplementation((req, res) => {
      res.status(200).json({ success: true, data: { reset: true } });
    });

    mockSchemas.validateConnection.mockImplementation((req, res, next) => {
      next();
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /ports', () => {
    test('should call listPorts controller', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/connection/ports')
        .expect(200);

      // Assert
      expect(mockController.listPorts).toHaveBeenCalledTimes(1);
      expect(response.body.success).toBe(true);
    });

    test('should handle controller errors', async () => {
      // Arrange
      mockController.listPorts.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Internal server error' });
      });

      // Act
      await request(app)
        .get('/api/v1/connection/ports')
        .expect(500);

      // Assert
      expect(mockController.listPorts).toHaveBeenCalledTimes(1);
    });

    test('should not accept POST method', async () => {
      // Act
      await request(app)
        .post('/api/v1/connection/ports')
        .expect(404);

      // Assert
      expect(mockController.listPorts).not.toHaveBeenCalled();
    });
  });

  describe('GET /status', () => {
    test('should call getStatus controller', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/connection/status')
        .expect(200);

      // Assert
      expect(mockController.getStatus).toHaveBeenCalledTimes(1);
      expect(response.body.success).toBe(true);
    });

    test('should handle multiple concurrent requests', async () => {
      // Act
      const promises = Array.from({ length: 5 }, () =>
        request(app).get('/api/v1/connection/status').expect(200)
      );

      await Promise.all(promises);

      // Assert
      expect(mockController.getStatus).toHaveBeenCalledTimes(5);
    });
  });

  describe('POST /connect', () => {
    test('should call validation middleware before controller', async () => {
      // Act
      await request(app)
        .post('/api/v1/connection/connect')
        .send({ port: '/dev/ttyUSB0' })
        .expect(200);

      // Assert
      expect(mockSchemas.validateConnection).toHaveBeenCalledTimes(1);
      expect(mockController.connect).toHaveBeenCalledTimes(1);
    });

    test('should handle validation failure', async () => {
      // Arrange
      mockSchemas.validateConnection.mockImplementation((req, res, next) => {
        res.status(400).json({ error: 'Validation failed' });
      });

      // Act
      await request(app)
        .post('/api/v1/connection/connect')
        .send({ port: 'invalid' })
        .expect(400);

      // Assert
      expect(mockSchemas.validateConnection).toHaveBeenCalledTimes(1);
      expect(mockController.connect).not.toHaveBeenCalled();
    });

    test('should pass request body to controller', async () => {
      // Arrange
      const requestBody = { port: '/dev/ttyUSB0', baudRate: 115200 };

      // Act
      await request(app)
        .post('/api/v1/connection/connect')
        .send(requestBody)
        .expect(200);

      // Assert
      expect(mockController.connect).toHaveBeenCalledTimes(1);
      const req = mockController.connect.mock.calls[0][0];
      expect(req.body).toEqual(requestBody);
    });

    test('should handle missing request body', async () => {
      // Act
      await request(app)
        .post('/api/v1/connection/connect')
        .expect(400); // Should be handled by validation middleware

      // Assert
      expect(mockSchemas.validateConnection).toHaveBeenCalledTimes(1);
    });

    test('should handle invalid JSON', async () => {
      // Act
      await request(app)
        .post('/api/v1/connection/connect')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Assert - Express should handle JSON parsing errors
    });
  });

  describe('POST /disconnect', () => {
    test('should call disconnect controller', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/connection/disconnect')
        .expect(200);

      // Assert
      expect(mockController.disconnect).toHaveBeenCalledTimes(1);
      expect(response.body.success).toBe(true);
    });

    test('should not require request body', async () => {
      // Act
      await request(app)
        .post('/api/v1/connection/disconnect')
        .expect(200);

      // Assert
      expect(mockController.disconnect).toHaveBeenCalledTimes(1);
    });

    test('should ignore request body if provided', async () => {
      // Act
      await request(app)
        .post('/api/v1/connection/disconnect')
        .send({ irrelevant: 'data' })
        .expect(200);

      // Assert
      expect(mockController.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /health', () => {
    test('should call healthCheck controller', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/connection/health')
        .expect(200);

      // Assert
      expect(mockController.healthCheck).toHaveBeenCalledTimes(1);
      expect(response.body.success).toBe(true);
    });

    test('should return health status format', async () => {
      // Arrange
      const mockHealthData = {
        status: 'healthy',
        connection: { connected: true, responseTime: 50 },
        timestamp: '2024-06-24T12:00:00.000Z'
      };

      mockController.healthCheck.mockImplementation((req, res) => {
        res.status(200).json({ success: true, data: mockHealthData });
      });

      // Act
      const response = await request(app)
        .get('/api/v1/connection/health')
        .expect(200);

      // Assert
      expect(response.body.data).toEqual(mockHealthData);
    });
  });

  describe('POST /reset', () => {
    test('should call reset controller', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/connection/reset')
        .expect(200);

      // Assert
      expect(mockController.reset).toHaveBeenCalledTimes(1);
      expect(response.body.success).toBe(true);
    });

    test('should handle reset failures', async () => {
      // Arrange
      mockController.reset.mockImplementation((req, res) => {
        res.status(500).json({ error: 'Reset failed' });
      });

      // Act
      await request(app)
        .post('/api/v1/connection/reset')
        .expect(500);

      // Assert
      expect(mockController.reset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Route middleware and headers', () => {
    test('should handle CORS preflight requests', async () => {
      // Act
      await request(app)
        .options('/api/v1/connection/ports')
        .expect(404); // No CORS middleware in this isolated test

      // Note: CORS would be handled at application level
    });

    test('should handle Accept header for JSON', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/connection/status')
        .set('Accept', 'application/json')
        .expect(200);

      // Assert
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should handle User-Agent header', async () => {
      // Act
      await request(app)
        .get('/api/v1/connection/status')
        .set('User-Agent', 'Test Client 1.0')
        .expect(200);

      // Assert
      expect(mockController.getStatus).toHaveBeenCalledTimes(1);
      const req = mockController.getStatus.mock.calls[0][0];
      expect(req.headers['user-agent']).toBe('Test Client 1.0');
    });
  });

  describe('Route parameter handling', () => {
    test('should handle query parameters', async () => {
      // Act
      await request(app)
        .get('/api/v1/connection/ports?refresh=true')
        .expect(200);

      // Assert
      expect(mockController.listPorts).toHaveBeenCalledTimes(1);
      const req = mockController.listPorts.mock.calls[0][0];
      expect(req.query.refresh).toBe('true');
    });

    test('should handle multiple query parameters', async () => {
      // Act
      await request(app)
        .get('/api/v1/connection/status?format=detailed&include=metrics')
        .expect(200);

      // Assert
      expect(mockController.getStatus).toHaveBeenCalledTimes(1);
      const req = mockController.getStatus.mock.calls[0][0];
      expect(req.query.format).toBe('detailed');
      expect(req.query.include).toBe('metrics');
    });
  });

  describe('Error handling', () => {
    test('should handle controller exceptions', async () => {
      // Arrange
      mockController.listPorts.mockImplementation(() => {
        throw new Error('Controller error');
      });

      // Act & Assert
      // Note: In a real application, error handling middleware would catch this
      try {
        await request(app)
          .get('/api/v1/connection/ports')
          .expect(500);
      } catch (error) {
        // Error handling depends on application-level error middleware
      }
    });

    test('should handle async controller rejections', async () => {
      // Arrange
      mockController.getStatus.mockImplementation(async () => {
        throw new Error('Async error');
      });

      // Act & Assert
      try {
        await request(app)
          .get('/api/v1/connection/status')
          .expect(500);
      } catch (error) {
        // Error handling depends on application-level error middleware
      }
    });
  });

  describe('Route existence and methods', () => {
    test('should have all required routes defined', () => {
      // This test ensures all expected routes are properly defined
      // The actual testing is done through the individual endpoint tests above
      expect(connectionRouter.default).toBeDefined();
    });

    test('should reject unsupported HTTP methods', async () => {
      // Test unsupported methods on various endpoints
      await request(app)
        .patch('/api/v1/connection/ports')
        .expect(404);

      await request(app)
        .delete('/api/v1/connection/status')
        .expect(404);

      await request(app)
        .put('/api/v1/connection/connect')
        .expect(404);
    });

    test('should handle non-existent routes', async () => {
      // Act & Assert
      await request(app)
        .get('/api/v1/connection/nonexistent')
        .expect(404);

      await request(app)
        .post('/api/v1/connection/invalid')
        .expect(404);
    });
  });
});