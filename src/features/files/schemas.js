/**
 * Files API Schemas
 * 
 * Request and response schemas for file operations
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     FileInfo:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: File name
 *           example: "app.gcode"
 *         path:
 *           type: string
 *           description: Full file path
 *           example: "/Users/user/cnc/.gcode/app.gcode"
 *         size:
 *           type: number
 *           description: File size in bytes
 *           example: 1024
 *         sizeFormatted:
 *           type: string
 *           description: Human-readable file size
 *           example: "1.00 KB"
 *         created:
 *           type: string
 *           format: date-time
 *           description: File creation timestamp
 *           example: "2024-06-24T12:00:00.000Z"
 *         modified:
 *           type: string
 *           format: date-time
 *           description: Last modification timestamp
 *           example: "2024-06-24T12:00:00.000Z"
 *         extension:
 *           type: string
 *           description: File extension
 *           example: ".gcode"
 *         type:
 *           type: string
 *           description: File type description
 *           example: "G-code"
 *         content:
 *           type: object
 *           properties:
 *             totalLines:
 *               type: number
 *               description: Total lines in file
 *               example: 43
 *             executableLines:
 *               type: number
 *               description: Number of executable G-code commands
 *               example: 15
 *             commentLines:
 *               type: number
 *               description: Number of comment lines
 *               example: 28
 *             preview:
 *               type: array
 *               description: Preview of first 10 executable commands
 *               items:
 *                 type: string
 *               example: ["G21", "G90", "M3 S8000", "G0 X7.8", "G0 Y95"]
 *             estimatedDuration:
 *               type: object
 *               properties:
 *                 seconds:
 *                   type: number
 *                   example: 120
 *                 formatted:
 *                   type: string
 *                   example: "2m 0s"
 * 
 *     FileListResult:
 *       type: object
 *       properties:
 *         files:
 *           type: array
 *           description: List of files
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "app.gcode"
 *               path:
 *                 type: string
 *                 example: ".gcode/app.gcode"
 *               size:
 *                 type: number
 *                 example: 1024
 *               sizeFormatted:
 *                 type: string
 *                 example: "1.00 KB"
 *               created:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-24T12:00:00.000Z"
 *               modified:
 *                 type: string
 *                 format: date-time
 *                 example: "2024-06-24T12:00:00.000Z"
 *               extension:
 *                 type: string
 *                 example: ".gcode"
 *               type:
 *                 type: string
 *                 example: "G-code"
 *         count:
 *           type: number
 *           description: Number of files found
 *           example: 1
 *         directory:
 *           type: string
 *           description: Directory path
 *           example: ".gcode"
 *         sort:
 *           type: object
 *           properties:
 *             field:
 *               type: string
 *               example: "name"
 *             order:
 *               type: string
 *               example: "asc"
 *         totalSize:
 *           type: number
 *           description: Total size of all files in bytes
 *           example: 1024
 *         totalSizeFormatted:
 *           type: string
 *           description: Human-readable total size
 *           example: "1.00 KB"
 * 
 *     FileUploadResult:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           description: Uploaded filename
 *           example: "app.gcode"
 *         originalName:
 *           type: string
 *           description: Original uploaded filename
 *           example: "my_part.gcode"
 *         path:
 *           type: string
 *           description: File storage path
 *           example: "/Users/user/cnc/.gcode/app.gcode"
 *         size:
 *           type: number
 *           description: File size in bytes
 *           example: 1024
 *         sizeFormatted:
 *           type: string
 *           description: Human-readable file size
 *           example: "1.00 KB"
 *         mimetype:
 *           type: string
 *           description: MIME type
 *           example: "text/plain"
 *         uploaded:
 *           type: string
 *           format: date-time
 *           description: Upload timestamp
 *           example: "2024-06-24T12:00:00.000Z"
 *         description:
 *           type: string
 *           nullable: true
 *           description: File description
 *           example: "CNC facing operation"
 *         tags:
 *           type: array
 *           description: File tags
 *           items:
 *             type: string
 *           example: ["facing", "production"]
 *         content:
 *           type: object
 *           properties:
 *             totalLines:
 *               type: number
 *               example: 43
 *             executableLines:
 *               type: number
 *               example: 15
 *             commentLines:
 *               type: number
 *               example: 28
 *             preview:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["G21", "G90", "M3 S8000", "G0 X7.8", "G0 Y95"]
 *             estimatedDuration:
 *               type: object
 *               properties:
 *                 seconds:
 *                   type: number
 *                   example: 120
 *                 formatted:
 *                   type: string
 *                   example: "2m 0s"
 *         validation:
 *           type: object
 *           properties:
 *             valid:
 *               type: boolean
 *               example: true
 *             errors:
 *               type: array
 *               items:
 *                 type: string
 *               example: []
 * 
 *     FileUpdateResult:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           example: "app.gcode"
 *         path:
 *           type: string
 *           example: "/Users/user/cnc/.gcode/app.gcode"
 *         size:
 *           type: number
 *           example: 1024
 *         sizeFormatted:
 *           type: string
 *           example: "1.00 KB"
 *         modified:
 *           type: string
 *           format: date-time
 *           example: "2024-06-24T12:00:00.000Z"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Updated CNC program"
 *         backup:
 *           type: boolean
 *           example: true
 *         content:
 *           type: object
 *           properties:
 *             totalLines:
 *               type: number
 *               example: 43
 *             executableLines:
 *               type: number
 *               example: 15
 *             commentLines:
 *               type: number
 *               example: 28
 *             estimatedDuration:
 *               type: object
 *               properties:
 *                 seconds:
 *                   type: number
 *                   example: 120
 *                 formatted:
 *                   type: string
 *                   example: "2m 0s"
 * 
 *     FileValidationResult:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           example: "app.gcode"
 *         valid:
 *           type: boolean
 *           description: Whether the file is valid
 *           example: true
 *         errors:
 *           type: array
 *           description: Validation errors
 *           items:
 *             type: string
 *           example: []
 *         warnings:
 *           type: array
 *           description: Validation warnings
 *           items:
 *             type: string
 *           example: ["Found 1 potentially unsafe commands (M0, M1, M112)"]
 *         stats:
 *           type: object
 *           properties:
 *             totalLines:
 *               type: number
 *               example: 43
 *             executableLines:
 *               type: number
 *               example: 15
 *             commentLines:
 *               type: number
 *               example: 28
 *             estimatedDuration:
 *               type: object
 *               properties:
 *                 seconds:
 *                   type: number
 *                   example: 120
 *                 formatted:
 *                   type: string
 *                   example: "2m 0s"
 */

export const schemas = {
  // Placeholder for future schema validation functions
};