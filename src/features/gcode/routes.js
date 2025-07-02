/**
 * G-code Routes
 * 
 * API routes for G-code execution, file operations, and queue management
 */

import express from 'express';
import {
  executeGcodeCommand,
  executeGcodeFile,
  getExecutionQueue,
  clearExecutionQueue
} from './controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/gcode/execute:
 *   post:
 *     tags: [G-code]
 *     summary: Execute single G-code command
 *     description: Execute a single G-code command and return the response
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - command
 *             properties:
 *               command:
 *                 type: string
 *                 description: G-code command to execute
 *                 example: "G0 X10 Y20"
 *           examples:
 *             movement:
 *               summary: Movement command
 *               value:
 *                 command: "G0 X10 Y20 Z5"
 *             spindle:
 *               summary: Spindle control
 *               value:
 *                 command: "M3 S1000"
 *             query:
 *               summary: Status query
 *               value:
 *                 command: "?"
 *     responses:
 *       200:
 *         description: G-code command executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/GcodeExecutionResult'
 *             example:
 *               success: true
 *               data:
 *                 command: "G0 X10 Y20"
 *                 response: "ok"
 *                 duration_ms: 150
 *                 timestamp: "2024-06-24T12:00:00.000Z"
 *                 execution_details:
 *                   sent_at: 1703422800000
 *                   completed_at: 1703422800150
 *                   raw_response: "ok"
 *               message: "G-code command executed successfully"
 *               timestamp: "2024-06-24T12:00:00.000Z"
 *               execution_time_ms: 155
 *       400:
 *         description: Invalid G-code command or machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_command:
 *                 summary: Invalid command format
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_INPUT"
 *                     message: "G-code command must be a non-empty string"
 *                     details:
 *                       providedCommand: ""
 *                   timestamp: "2024-06-24T12:00:00.000Z"
 *               not_connected:
 *                 summary: Machine not connected
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "NOT_CONNECTED"
 *                     message: "Machine must be connected before executing G-code"
 *                   timestamp: "2024-06-24T12:00:00.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/execute', executeGcodeCommand);

/**
 * @swagger
 * /api/v1/gcode/file:
 *   post:
 *     tags: [G-code]
 *     summary: Execute G-code file
 *     description: Execute G-code commands from a file or validate file contents
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePath
 *             properties:
 *               filePath:
 *                 type: string
 *                 description: Path to G-code file (absolute or relative to project root)
 *                 example: ".gcode/example.gcode"
 *               validateOnly:
 *                 type: boolean
 *                 default: false
 *                 description: If true, only validates the file without executing
 *           examples:
 *             execute_file:
 *               summary: Execute G-code file
 *               value:
 *                 filePath: ".gcode/app.gcode"
 *                 validateOnly: false
 *             validate_file:
 *               summary: Validate G-code file only
 *               value:
 *                 filePath: ".gcode/app.gcode"
 *                 validateOnly: true
 *     responses:
 *       200:
 *         description: G-code file processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       oneOf:
 *                         - $ref: '#/components/schemas/GcodeFileExecutionResult'
 *                         - $ref: '#/components/schemas/GcodeFileValidationResult'
 *             examples:
 *               execution_result:
 *                 summary: File execution result
 *                 value:
 *                   success: true
 *                   data:
 *                     filePath: "/Users/user/cnc/.gcode/app.gcode"
 *                     execution:
 *                       totalCommands: 15
 *                       successful: 15
 *                       failed: 0
 *                       duration_ms: 2500
 *                       completed_at: "2024-06-24T12:00:00.000Z"
 *                     results:
 *                       - command: "G21"
 *                         success: true
 *                         response: "ok"
 *                         duration_ms: 45
 *                     summary:
 *                       success_rate: "100.0%"
 *                       average_command_time: "167ms"
 *                       file_size_bytes: 1024
 *                     timestamp: "2024-06-24T12:00:00.000Z"
 *                   message: "G-code file execution completed: 15/15 commands successful"
 *               validation_result:
 *                 summary: File validation result
 *                 value:
 *                   success: true
 *                   data:
 *                     filePath: "/Users/user/cnc/.gcode/app.gcode"
 *                     valid: true
 *                     totalLines: 43
 *                     executableCommands: 15
 *                     fileSize: 1024
 *                     preview: ["G21", "G90", "M3 S8000", "G0 X7.8", "G0 Y95"]
 *                     timestamp: "2024-06-24T12:00:00.000Z"
 *                   message: "G-code file validation completed successfully"
 *       400:
 *         description: Invalid file path or machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               missing_file_path:
 *                 summary: Missing file path
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_INPUT"
 *                     message: "File path is required"
 *                   timestamp: "2024-06-24T12:00:00.000Z"
 *               empty_file:
 *                 summary: Empty G-code file
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_INPUT"
 *                     message: "G-code file contains no executable commands"
 *                     details:
 *                       filePath: "/path/to/empty.gcode"
 *                       totalLines: 5
 *                   timestamp: "2024-06-24T12:00:00.000Z"
 *       403:
 *         description: File access denied
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "FILE_ACCESS_ERROR"
 *                 message: "Cannot access G-code file"
 *                 details:
 *                   filePath: "/protected/file.gcode"
 *                   error: "Permission denied"
 *               timestamp: "2024-06-24T12:00:00.000Z"
 *       404:
 *         description: G-code file not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error:
 *                 code: "FILE_NOT_FOUND"
 *                 message: "G-code file not found"
 *                 details:
 *                   filePath: "/nonexistent/file.gcode"
 *                   error: "File does not exist"
 *               timestamp: "2024-06-24T12:00:00.000Z"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/file', executeGcodeFile);

/**
 * @swagger
 * /api/v1/gcode/queue:
 *   get:
 *     tags: [G-code]
 *     summary: Get execution queue status
 *     description: Retrieve current execution queue status and command information
 *     responses:
 *       200:
 *         description: Execution queue status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ExecutionQueueStatus'
 *             examples:
 *               active_queue:
 *                 summary: Active execution queue
 *                 value:
 *                   success: true
 *                   data:
 *                     connected: true
 *                     port: "/dev/tty.usbmodem1101"
 *                     commandsInQueue: 5
 *                     isExecuting: true
 *                     currentCommand: "G0 X15 Y25"
 *                     queueStatus: "active"
 *                     estimatedTime: 30000
 *                     timestamp: "2024-06-24T12:00:00.000Z"
 *                   message: "Execution queue status retrieved successfully"
 *               empty_queue:
 *                 summary: Empty execution queue
 *                 value:
 *                   success: true
 *                   data:
 *                     connected: true
 *                     port: "/dev/tty.usbmodem1101"
 *                     commandsInQueue: 0
 *                     isExecuting: false
 *                     currentCommand: null
 *                     queueStatus: "empty"
 *                     timestamp: "2024-06-24T12:00:00.000Z"
 *                   message: "Execution queue status retrieved successfully"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   delete:
 *     tags: [G-code]
 *     summary: Clear execution queue
 *     description: Clear all pending commands and stop current execution (emergency stop)
 *     responses:
 *       200:
 *         description: Execution queue cleared successfully
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
 *                         cleared:
 *                           type: boolean
 *                           example: true
 *                         previousQueue:
 *                           type: object
 *                           properties:
 *                             commandsInQueue:
 *                               type: number
 *                               example: 5
 *                         currentStatus:
 *                           $ref: '#/components/schemas/ExecutionQueueStatus'
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *             example:
 *               success: true
 *               data:
 *                 cleared: true
 *                 previousQueue:
 *                   commandsInQueue: 5
 *                 currentStatus:
 *                   connected: true
 *                   port: "/dev/tty.usbmodem1101"
 *                   commandsInQueue: 0
 *                   isExecuting: false
 *                   queueStatus: "empty"
 *                 timestamp: "2024-06-24T12:00:00.000Z"
 *               message: "Execution queue cleared successfully"
 *       400:
 *         description: Machine not connected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/queue', getExecutionQueue);
router.delete('/queue', clearExecutionQueue);

export default router;