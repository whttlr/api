/**
 * API Routes Integration Tests
 */

import request from 'supertest';
import express from 'express';
import apiRoutes from '../index.js';
import { responseFormatter } from '../../shared/responseFormatter.js';

// Mock all feature routes
jest.mock('../../features/connection/index.js', () => ({
  routes: (req, res) => res.json({ feature: 'connection' })
}));

jest.mock('../../features/machine/index.js', () => ({
  machineRoutes: (req, res) => res.json({ feature: 'machine' })
}));

jest.mock('../../features/gcode/index.js', () => ({
  gcodeRoutes: (req, res) => res.json({ feature: 'gcode' })
}));

jest.mock('../../features/files/index.js', () => ({
  fileRoutes: (req, res) => res.json({ feature: 'files' })
}));

jest.mock('../../features/presets/index.js', () => ({
  presetRoutes: (req, res) => res.json({ feature: 'presets' })
}));

jest.mock('../../features/health/index.js', () => ({
  healthRoutes: (req, res) => res.json({ feature: 'health' })
}));

describe('API Routes Integration', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(responseFormatter);
    app.use('/api/v1', apiRoutes);
  });

  describe('Health endpoints', () => {
    test('GET /api/v1/health should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          service: 'CNC G-code Sender API',
          version: '1.0.0',
          status: 'healthy',
          uptime: expect.any(Number),
          timestamp: expect.any(String)
        },
        message: 'API is healthy',
        timestamp: expect.any(String),
        execution_time_ms: expect.any(Number)
      });
    });

    test('GET /api/v1/info should return API information', async () => {
      const response = await request(app)
        .get('/api/v1/info')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          name: 'CNC G-code Sender API',
          version: '1.0.0',
          description: 'REST API for CNC machine control and G-code execution',
          endpoints: {
            connection: '/api/v1/connection/*',
            machine: '/api/v1/machine/*',
            gcode: '/api/v1/gcode/*',
            files: '/api/v1/files/*',
            presets: '/api/v1/presets/*',
            help: '/api/v1/help',
            commands: '/api/v1/commands',
            health: '/api/v1/health',
            info: '/api/v1/info'
          },
          documentation: '/api/v1/docs'
        },
        message: 'API information retrieved successfully',
        execution_time_ms: expect.any(Number)
      });
    });
  });

  describe('Route mounting', () => {
    test('should mount connection routes at /connection', async () => {
      const response = await request(app)
        .get('/api/v1/connection/test')
        .expect(200);

      expect(response.body).toEqual({ feature: 'connection' });
    });

    test('should mount machine routes at /machine', async () => {
      const response = await request(app)
        .get('/api/v1/machine/test')
        .expect(200);

      expect(response.body).toEqual({ feature: 'machine' });
    });

    test('should mount gcode routes at /gcode', async () => {
      const response = await request(app)
        .get('/api/v1/gcode/test')
        .expect(200);

      expect(response.body).toEqual({ feature: 'gcode' });
    });

    test('should mount files routes at /files', async () => {
      const response = await request(app)
        .get('/api/v1/files/test')
        .expect(200);

      expect(response.body).toEqual({ feature: 'files' });
    });

    test('should mount presets routes at /presets', async () => {
      const response = await request(app)
        .get('/api/v1/presets/test')
        .expect(200);

      expect(response.body).toEqual({ feature: 'presets' });
    });

    test('should mount health routes at root', async () => {
      const response = await request(app)
        .get('/api/v1/help')
        .expect(200);

      expect(response.body).toEqual({ feature: 'health' });
    });
  });

  describe('Response formatting', () => {
    test('should include execution time in responses', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('execution_time_ms');
      expect(typeof response.body.execution_time_ms).toBe('number');
      expect(response.body.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    test('should include timestamp in responses', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    test('should format success responses consistently', async () => {
      const response = await request(app)
        .get('/api/v1/info')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.any(Object),
        message: expect.any(String),
        timestamp: expect.any(String),
        execution_time_ms: expect.any(Number)
      });
    });
  });

  describe('Error handling', () => {
    test('should handle 404 for unknown endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent')
        .expect(404);

      // Since we don't have the actual error handler in this test,
      // we just verify the route doesn't match
      expect(response.status).toBe(404);
    });

    test('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);

      expect(response.status).toBe(400);
    });
  });

  describe('CORS and headers', () => {
    test('should accept JSON content type', async () => {
      await request(app)
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(200);
    });

    test('should handle OPTIONS requests', async () => {
      await request(app)
        .options('/api/v1/health')
        .expect(200);
    });
  });

  describe('API versioning', () => {
    test('should serve all routes under /api/v1', async () => {
      const endpoints = [
        '/api/v1/health',
        '/api/v1/info'
      ];

      for (const endpoint of endpoints) {
        await request(app)
          .get(endpoint)
          .expect(200);
      }
    });
  });

  describe('Documentation endpoints', () => {
    test('should provide API documentation links', async () => {
      const response = await request(app)
        .get('/api/v1/info')
        .expect(200);

      expect(response.body.data.documentation).toBe('/api/v1/docs');
      expect(response.body.data.endpoints).toHaveProperty('help');
      expect(response.body.data.endpoints).toHaveProperty('commands');
    });
  });

  describe('Service information', () => {
    test('should return consistent service information', async () => {
      const healthResponse = await request(app)
        .get('/api/v1/health')
        .expect(200);

      const infoResponse = await request(app)
        .get('/api/v1/info')
        .expect(200);

      expect(healthResponse.body.data.service).toBe('CNC G-code Sender API');
      expect(infoResponse.body.data.name).toBe('CNC G-code Sender API');
      expect(healthResponse.body.data.version).toBe('1.0.0');
      expect(infoResponse.body.data.version).toBe('1.0.0');
    });
  });
});