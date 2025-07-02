/**
 * Connection Feature Routes
 * 
 * Express routes for serial port connection management.
 */

import express from 'express';
import {
  listPorts,
  getStatus,
  connect,
  disconnect,
  healthCheck,
  reset
} from './controller.js';
import { validateConnection } from './schemas.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/connection/ports:
 *   get:
 *     summary: List available serial ports
 *     tags: [Connection]
 *     responses:
 *       200:
 *         description: List of available ports
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ports:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       path:
 *                         type: string
 *                       manufacturer:
 *                         type: string
 *                 count:
 *                   type: integer
 */
router.get('/ports', listPorts);

/**
 * @swagger
 * /api/v1/connection/status:
 *   get:
 *     summary: Get current connection status
 *     tags: [Connection]
 *     responses:
 *       200:
 *         description: Current connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 connected:
 *                   type: boolean
 *                 port:
 *                   type: string
 *                   nullable: true
 */
router.get('/status', getStatus);

/**
 * @swagger
 * /api/v1/connection/connect:
 *   post:
 *     summary: Connect to a serial port
 *     tags: [Connection]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - port
 *             properties:
 *               port:
 *                 type: string
 *                 description: Serial port path
 *                 example: "/dev/ttyUSB0"
 *     responses:
 *       200:
 *         description: Successfully connected
 *       400:
 *         description: Invalid port or port not available
 *       409:
 *         description: Already connected to another port
 */
router.post('/connect', validateConnection, connect);

/**
 * @swagger
 * /api/v1/connection/disconnect:
 *   post:
 *     summary: Disconnect from current port
 *     tags: [Connection]
 *     responses:
 *       200:
 *         description: Successfully disconnected
 */
router.post('/disconnect', disconnect);

/**
 * @swagger
 * /api/v1/connection/health:
 *   get:
 *     summary: Get connection system health status
 *     tags: [Connection]
 *     responses:
 *       200:
 *         description: Connection system health information
 */
router.get('/health', healthCheck);

/**
 * @swagger
 * /api/v1/connection/reset:
 *   post:
 *     summary: Reset connection (disconnect and clear state)
 *     tags: [Connection]
 *     responses:
 *       200:
 *         description: Connection reset completed
 */
router.post('/reset', reset);

export default router;