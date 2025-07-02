/**
 * File Routes
 * 
 * API routes for G-code file management including upload, download, CRUD operations
 */

import express from 'express';
import {
  listFiles,
  getFileInfo,
  uploadFile,
  updateFile,
  deleteFile,
  downloadFile,
  validateFile
} from './controller.js';
import { handleFileUpload, validateFileOperation } from './middleware/fileUpload.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/files:
 *   get:
 *     tags: [Files]
 *     summary: List all G-code files
 *     description: Retrieve a list of all available G-code files with metadata
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [gcode, temp, backups]
 *           default: gcode
 *         description: File storage type to list
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [name, size, created, modified]
 *           default: name
 *         description: Sort field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: File listing retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileListResult'
 *             example:
 *               success: true
 *               data:
 *                 files:
 *                   - name: "app.gcode"
 *                     path: ".gcode/app.gcode"
 *                     size: 1024
 *                     sizeFormatted: "1.00 KB"
 *                     created: "2024-06-24T12:00:00.000Z"
 *                     modified: "2024-06-24T12:00:00.000Z"
 *                     extension: ".gcode"
 *                     type: "G-code"
 *                 count: 1
 *                 directory: ".gcode"
 *                 sort: { field: "name", order: "asc" }
 *                 totalSize: 1024
 *                 totalSizeFormatted: "1.00 KB"
 *               message: "Found 1 G-code files"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   post:
 *     tags: [Files]
 *     summary: Upload G-code file
 *     description: Upload a new G-code file to the server
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: G-code file to upload
 *               filename:
 *                 type: string
 *                 description: Custom filename (optional)
 *               description:
 *                 type: string
 *                 description: File description
 *               tags:
 *                 type: string
 *                 description: Comma-separated tags
 *               overwrite:
 *                 type: boolean
 *                 default: false
 *                 description: Allow overwriting existing files
 *               type:
 *                 type: string
 *                 enum: [gcode, temp]
 *                 default: gcode
 *                 description: Storage type
 *           examples:
 *             basic_upload:
 *               summary: Basic file upload
 *               value:
 *                 file: "[binary data]"
 *                 description: "CNC facing operation"
 *             custom_filename:
 *               summary: Upload with custom filename
 *               value:
 *                 file: "[binary data]"
 *                 filename: "custom_part.gcode"
 *                 tags: "facing,production"
 *                 overwrite: false
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileUploadResult'
 *       400:
 *         description: Invalid file or upload error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_file:
 *                 summary: No file provided
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_INPUT"
 *                     message: "File is required for upload"
 *               invalid_type:
 *                 summary: Invalid file type
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "INVALID_FILE_TYPE"
 *                     message: "Invalid file type. Allowed extensions: .gcode, .nc, .txt, .cnc"
 *               file_too_large:
 *                 summary: File too large
 *                 value:
 *                   success: false
 *                   error:
 *                     code: "FILE_UPLOAD_ERROR"
 *                     message: "File too large. Maximum size is 10MB"
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/', listFiles);
router.post('/', handleFileUpload('file'), uploadFile);

/**
 * @swagger
 * /api/v1/files/{filename}:
 *   get:
 *     tags: [Files]
 *     summary: Get file information
 *     description: Retrieve detailed information about a specific G-code file
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the G-code file
 *         example: "app.gcode"
 *     responses:
 *       200:
 *         description: File information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileInfo'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   put:
 *     tags: [Files]
 *     summary: Update file content
 *     description: Update the content of an existing G-code file
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the G-code file
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: New file content
 *               description:
 *                 type: string
 *                 description: Updated description
 *               backup:
 *                 type: boolean
 *                 default: true
 *                 description: Create backup before updating
 *           example:
 *             content: "G21\nG90\nG0 X0 Y0\nM2"
 *             description: "Updated CNC program"
 *             backup: true
 *     responses:
 *       200:
 *         description: File updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileUpdateResult'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: File not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 *   delete:
 *     tags: [Files]
 *     summary: Delete file
 *     description: Delete a G-code file from the server
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the G-code file
 *       - in: query
 *         name: backup
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Create backup before deletion
 *     responses:
 *       200:
 *         description: File deleted successfully
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
 *                         filename:
 *                           type: string
 *                         deleted:
 *                           type: boolean
 *                         backup:
 *                           type: boolean
 *                         backupPath:
 *                           type: string
 *                           nullable: true
 *                         deletedAt:
 *                           type: string
 *                           format: date-time
 *       404:
 *         description: File not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:filename', validateFileOperation, getFileInfo);
router.put('/:filename', validateFileOperation, updateFile);
router.delete('/:filename', validateFileOperation, deleteFile);

/**
 * @swagger
 * /api/v1/files/{filename}/download:
 *   get:
 *     tags: [Files]
 *     summary: Download file
 *     description: Download a G-code file as an attachment
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the G-code file
 *     responses:
 *       200:
 *         description: File download started
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Disposition:
 *             description: Attachment filename
 *             schema:
 *               type: string
 *               example: 'attachment; filename="app.gcode"'
 *           Content-Length:
 *             description: File size in bytes
 *             schema:
 *               type: integer
 *           Last-Modified:
 *             description: Last modification date
 *             schema:
 *               type: string
 *               format: date-time
 *       404:
 *         description: File not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.get('/:filename/download', validateFileOperation, downloadFile);

/**
 * @swagger
 * /api/v1/files/{filename}/validate:
 *   post:
 *     tags: [Files]
 *     summary: Validate file content
 *     description: Validate G-code file content without executing
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Name of the G-code file
 *     responses:
 *       200:
 *         description: File validation completed
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/FileValidationResult'
 *             example:
 *               success: true
 *               data:
 *                 filename: "app.gcode"
 *                 valid: true
 *                 errors: []
 *                 warnings: ["Found 1 potentially unsafe commands (M0, M1, M112)"]
 *                 stats:
 *                   totalLines: 43
 *                   executableLines: 15
 *                   commentLines: 28
 *                   estimatedDuration:
 *                     seconds: 120
 *                     formatted: "2m 0s"
 *               message: "File validation completed"
 *       404:
 *         description: File not found
 *       500:
 *         $ref: '#/components/responses/InternalError'
 */
router.post('/:filename/validate', validateFileOperation, validateFile);

export default router;