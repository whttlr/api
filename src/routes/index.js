/**
 * API Routes Index
 * 
 * Central router configuration for all API routes
 */

import express from 'express';
import { routes as connectionRoutes } from '../features/connection/index.js';
import { machineRoutes } from '../features/machine/index.js';
import { gcodeRoutes } from '../features/gcode/index.js';
import { fileRoutes } from '../features/files/index.js';
import { presetRoutes } from '../features/presets/index.js';
import { healthRoutes } from '../features/health/index.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags: [Health]
 *     summary: API health check
 *     description: Check if the API is running and healthy
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         service:
 *                           type: string
 *                           example: "CNC G-code Sender API"
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         status:
 *                           type: string
 *                           example: "healthy"
 *                         uptime:
 *                           type: number
 *                           example: 3600.5
 *                           description: "Server uptime in seconds"
 *             example:
 *               success: true
 *               data:
 *                 service: "CNC G-code Sender API"
 *                 version: "1.0.0"
 *                 status: "healthy"
 *                 uptime: 3600.5
 *                 timestamp: "2024-06-24T12:00:00.000Z"
 *               message: "API is healthy"
 *               timestamp: "2024-06-24T12:00:00.000Z"
 *               execution_time_ms: 1
 */
// Health endpoint is now handled by the health feature routes

/**
 * @swagger
 * /api/v1/info:
 *   get:
 *     tags: [Health]
 *     summary: API information
 *     description: Get information about the API, its version, and available endpoints
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "CNC G-code Sender API"
 *                         version:
 *                           type: string
 *                           example: "1.0.0"
 *                         description:
 *                           type: string
 *                           example: "REST API for CNC machine control and G-code execution"
 *                         endpoints:
 *                           type: object
 *                           properties:
 *                             connection:
 *                               type: string
 *                               example: "/api/v1/connection/*"
 *                             health:
 *                               type: string
 *                               example: "/api/v1/health"
 *                             info:
 *                               type: string
 *                               example: "/api/v1/info"
 *                         documentation:
 *                           type: string
 *                           example: "/api/v1/docs"
 *             example:
 *               success: true
 *               data:
 *                 name: "CNC G-code Sender API"
 *                 version: "1.0.0"
 *                 description: "REST API for CNC machine control and G-code execution"
 *                 endpoints:
 *                   connection: "/api/v1/connection/*"
 *                   health: "/api/v1/health"
 *                   info: "/api/v1/info"
 *                 documentation: "/api/v1/docs"
 *               message: "API information retrieved successfully"
 *               timestamp: "2024-06-24T12:00:00.000Z"
 *               execution_time_ms: 1
 */
router.get('/info', (req, res) => {
  res.success({
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
  }, 'API information retrieved successfully');
});

/**
 * Mount route modules
 */
router.use('/connection', connectionRoutes);
router.use('/machine', machineRoutes);
router.use('/gcode', gcodeRoutes);
router.use('/files', fileRoutes);
router.use('/presets', presetRoutes);
router.use('/', healthRoutes);

export default router;