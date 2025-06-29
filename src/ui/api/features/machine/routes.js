/**
 * Machine Feature Routes
 * 
 * API routes for machine status, limits, diagnostics, and control operations.
 * Migrated to feature-based architecture with Swagger documentation.
 */

import express from 'express';
import {
  getMachineStatus,
  getMachineLimits,
  runDiagnostics,
  unlockMachine,
  homeMachine,
  resetMachine,
  emergencyStop,
  getMachineHealth
} from './controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/machine/status:
 *   get:
 *     tags: [Machine]
 *     summary: Get machine status
 *     description: Retrieve the current machine status including state and position
 *     responses:
 *       200:
 *         description: Machine status retrieved successfully
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
 *                         connected:
 *                           type: boolean
 *                           example: true
 *                         port:
 *                           type: string
 *                           example: "/dev/tty.usbmodem1101"
 *                         status:
 *                           $ref: '#/components/schemas/MachineStatus'
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/status', getMachineStatus);

/**
 * @swagger
 * /api/v1/machine/limits:
 *   get:
 *     tags: [Machine]
 *     summary: Get machine limits
 *     description: Retrieve machine travel limits and current position information
 *     responses:
 *       200:
 *         description: Machine limits retrieved successfully
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
 *                         connected:
 *                           type: boolean
 *                           example: true
 *                         port:
 *                           type: string
 *                           example: "/dev/tty.usbmodem1101"
 *                         limits:
 *                           $ref: '#/components/schemas/MachineLimits'
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/limits', getMachineLimits);

/**
 * @swagger
 * /api/v1/machine/diagnostics:
 *   get:
 *     tags: [Machine]
 *     summary: Run machine diagnostics
 *     description: Execute comprehensive movement diagnostics to test machine responsiveness
 *     responses:
 *       200:
 *         description: Diagnostics completed successfully
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
 *                         connected:
 *                           type: boolean
 *                           example: true
 *                         port:
 *                           type: string
 *                           example: "/dev/tty.usbmodem1101"
 *                         diagnostics:
 *                           $ref: '#/components/schemas/DiagnosticsResult'
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                           example: "2024-06-24T12:00:00.000Z"
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/diagnostics', runDiagnostics);

/**
 * @swagger
 * /api/v1/machine/unlock:
 *   post:
 *     tags: [Machine]
 *     summary: Unlock machine
 *     description: Send unlock command ($X) to clear alarm states and unlock the machine
 *     responses:
 *       200:
 *         description: Unlock command sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ExecutionResult'
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/unlock', unlockMachine);

/**
 * @swagger
 * /api/v1/machine/home:
 *   post:
 *     tags: [Machine]
 *     summary: Home machine
 *     description: Send homing command ($H) to move machine to home position
 *     responses:
 *       200:
 *         description: Homing command sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ExecutionResult'
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/home', homeMachine);

/**
 * @swagger
 * /api/v1/machine/reset:
 *   post:
 *     tags: [Machine]
 *     summary: Soft reset machine
 *     description: Send soft reset to restart the machine controller
 *     responses:
 *       200:
 *         description: Soft reset sent successfully
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
 *                         command:
 *                           type: string
 *                           example: "SOFT_RESET"
 *                         message:
 *                           type: string
 *                           example: "Soft reset sent to machine"
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/reset', resetMachine);

/**
 * @swagger
 * /api/v1/machine/stop:
 *   post:
 *     tags: [Machine]
 *     summary: Emergency stop
 *     description: Send emergency stop command (M112) to immediately halt all machine operations
 *     responses:
 *       200:
 *         description: Emergency stop sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ExecutionResult'
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/stop', emergencyStop);

/**
 * @swagger
 * /api/v1/machine/health:
 *   get:
 *     tags: [Machine]
 *     summary: Machine health check
 *     description: Get overall machine health status including connection and responsiveness
 *     responses:
 *       200:
 *         description: Machine health status retrieved
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
 *                         status:
 *                           type: string
 *                           enum: [healthy, unhealthy]
 *                           example: "healthy"
 *                         connection:
 *                           type: object
 *                           properties:
 *                             connected:
 *                               type: boolean
 *                               example: true
 *                             port:
 *                               type: string
 *                               example: "/dev/tty.usbmodem1101"
 *                         machine:
 *                           type: object
 *                           properties:
 *                             statusAvailable:
 *                               type: boolean
 *                               example: true
 *                             state:
 *                               type: string
 *                               example: "Idle"
 *                             responsive:
 *                               type: boolean
 *                               example: true
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/health', getMachineHealth);

export default router;