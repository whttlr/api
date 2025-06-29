/**
 * Health Routes
 * 
 * API routes for system health, help information, and documentation
 */

import express from 'express';
import { getHelp, getCommands } from './controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/help:
 *   get:
 *     tags: [Health]
 *     summary: Get help information
 *     description: Retrieve comprehensive help information about the API and CLI
 *     responses:
 *       200:
 *         description: Help information retrieved successfully
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
 *                         api:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: "CNC G-code Sender API"
 *                             version:
 *                               type: string
 *                               example: "1.0.0"
 *                             description:
 *                               type: string
 *                               example: "REST API for CNC machine control and G-code execution"
 *                             endpoints:
 *                               type: object
 *                         cli:
 *                           type: object
 *                           properties:
 *                             description:
 *                               type: string
 *                             commands:
 *                               type: object
 *                             safetyTips:
 *                               type: array
 *                               items:
 *                                 type: string
 *                         quickStart:
 *                           type: object
 *                           properties:
 *                             steps:
 *                               type: array
 *                               items:
 *                                 type: string
 *                             safetyReminders:
 *                               type: array
 *                               items:
 *                                 type: string
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/help', getHelp);

/**
 * @swagger
 * /api/v1/commands:
 *   get:
 *     tags: [Health]
 *     summary: Get G-code commands documentation
 *     description: Retrieve documentation for available G-code commands and their usage
 *     responses:
 *       200:
 *         description: Commands documentation retrieved successfully
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
 *                         commands:
 *                           type: object
 *                           properties:
 *                             motion:
 *                               type: object
 *                             machine:
 *                               type: object
 *                             coordinates:
 *                               type: object
 *                             special:
 *                               type: object
 *                         categories:
 *                           type: array
 *                           items:
 *                             type: string
 *                         totalCommands:
 *                           type: number
 *                         usage:
 *                           type: string
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/commands', getCommands);

export default router;