/**
 * G-code API Schemas
 * 
 * Request and response schemas for G-code operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     GcodeExecutionResult:
 *       type: object
 *       properties:
 *         command:
 *           type: string
 *           description: The executed G-code command
 *           example: "G0 X10 Y20"
 *         response:
 *           type: string
 *           description: Response from the CNC machine
 *           example: "ok"
 *         duration_ms:
 *           type: number
 *           description: Execution time in milliseconds
 *           example: 150
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: Execution timestamp
 *           example: "2024-06-24T12:00:00.000Z"
 *         execution_details:
 *           type: object
 *           properties:
 *             sent_at:
 *               type: number
 *               description: Unix timestamp when command was sent
 *               example: 1703422800000
 *             completed_at:
 *               type: number
 *               description: Unix timestamp when command completed
 *               example: 1703422800150
 *             raw_response:
 *               type: string
 *               description: Raw response from machine
 *               example: "ok"
 * 
 *     GcodeFileExecutionResult:
 *       type: object
 *       properties:
 *         filePath:
 *           type: string
 *           description: Path to the executed G-code file
 *           example: "/Users/user/cnc/.gcode/app.gcode"
 *         execution:
 *           type: object
 *           properties:
 *             totalCommands:
 *               type: number
 *               description: Total number of commands in file
 *               example: 15
 *             successful:
 *               type: number
 *               description: Number of successfully executed commands
 *               example: 15
 *             failed:
 *               type: number
 *               description: Number of failed commands
 *               example: 0
 *             duration_ms:
 *               type: number
 *               description: Total execution time in milliseconds
 *               example: 2500
 *             completed_at:
 *               type: string
 *               format: date-time
 *               description: Completion timestamp
 *               example: "2024-06-24T12:00:00.000Z"
 *         results:
 *           type: array
 *           description: Detailed results for each command
 *           items:
 *             type: object
 *             properties:
 *               command:
 *                 type: string
 *                 example: "G21"
 *               success:
 *                 type: boolean
 *                 example: true
 *               response:
 *                 type: string
 *                 example: "ok"
 *               error:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *               duration_ms:
 *                 type: number
 *                 example: 45
 *         summary:
 *           type: object
 *           properties:
 *             success_rate:
 *               type: string
 *               description: Success rate percentage
 *               example: "100.0%"
 *             average_command_time:
 *               type: string
 *               description: Average command execution time
 *               example: "167ms"
 *             file_size_bytes:
 *               type: number
 *               description: File size in bytes
 *               example: 1024
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-06-24T12:00:00.000Z"
 * 
 *     GcodeFileValidationResult:
 *       type: object
 *       properties:
 *         filePath:
 *           type: string
 *           description: Path to the validated G-code file
 *           example: "/Users/user/cnc/.gcode/app.gcode"
 *         valid:
 *           type: boolean
 *           description: Whether the file is valid
 *           example: true
 *         totalLines:
 *           type: number
 *           description: Total lines in file (including comments)
 *           example: 43
 *         executableCommands:
 *           type: number
 *           description: Number of executable G-code commands
 *           example: 15
 *         fileSize:
 *           type: number
 *           description: File size in bytes
 *           example: 1024
 *         preview:
 *           type: array
 *           description: Preview of first 5 commands
 *           items:
 *             type: string
 *           example: ["G21", "G90", "M3 S8000", "G0 X7.8", "G0 Y95"]
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-06-24T12:00:00.000Z"
 * 
 *     ExecutionQueueStatus:
 *       type: object
 *       properties:
 *         connected:
 *           type: boolean
 *           description: Whether machine is connected
 *           example: true
 *         port:
 *           type: string
 *           nullable: true
 *           description: Current serial port
 *           example: "/dev/tty.usbmodem1101"
 *         commandsInQueue:
 *           type: number
 *           description: Number of commands pending in queue
 *           example: 5
 *         isExecuting:
 *           type: boolean
 *           description: Whether a command is currently executing
 *           example: true
 *         currentCommand:
 *           type: string
 *           nullable: true
 *           description: Currently executing command
 *           example: "G0 X15 Y25"
 *         queueStatus:
 *           type: string
 *           enum: [active, empty]
 *           description: Current queue status
 *           example: "active"
 *         estimatedTime:
 *           type: number
 *           nullable: true
 *           description: Estimated completion time in milliseconds
 *           example: 30000
 *         progress:
 *           type: object
 *           nullable: true
 *           description: Execution progress information
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2024-06-24T12:00:00.000Z"
 */

export const schemas = {
  // Placeholder for future schema validation functions
};