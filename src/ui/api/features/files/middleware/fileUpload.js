/**
 * File Upload Middleware
 * 
 * Handles file uploads using multer with validation and storage configuration
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { info, error as logError } from '@cnc/core/services/logger';
import { ErrorCodes } from '../../../shared/responseFormatter.js';

// Define allowed file types
const ALLOWED_EXTENSIONS = ['.gcode', '.nc', '.txt', '.cnc'];
const ALLOWED_MIME_TYPES = ['text/plain', 'application/octet-stream'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Define upload directories
const UPLOAD_DIRS = {
  gcode: '.gcode',
  temp: '.temp',
  backups: '.backups'
};

/**
 * Ensure upload directories exist
 */
async function ensureUploadDirs() {
  for (const [type, dir] of Object.entries(UPLOAD_DIRS)) {
    try {
      await fs.access(dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        await fs.mkdir(dir, { recursive: true });
        info(`Created upload directory: ${dir}`);
      } else {
        throw error;
      }
    }
  }
}

/**
 * Validate file type and content
 */
function validateFile(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Check file extension
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file type. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }
  
  // Check MIME type (basic validation)
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    info(`Warning: Unexpected MIME type ${file.mimetype} for file ${file.originalname}`);
  }
  
  return true;
}

/**
 * Generate safe filename
 */
function generateSafeFilename(originalname) {
  const ext = path.extname(originalname);
  const basename = path.basename(originalname, ext);
  
  // Remove unsafe characters and limit length
  const safeName = basename
    .replace(/[^a-zA-Z0-9_\-\.]/g, '_')
    .substring(0, 50);
  
  const timestamp = Date.now();
  return `${safeName}_${timestamp}${ext}`;
}

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureUploadDirs();
      
      // Default to gcode directory
      const uploadDir = req.body.type === 'temp' ? UPLOAD_DIRS.temp : UPLOAD_DIRS.gcode;
      cb(null, uploadDir);
    } catch (error) {
      logError('Failed to create upload directory:', error.message);
      cb(error);
    }
  },
  
  filename: (req, file, cb) => {
    try {
      validateFile(file);
      
      // Use provided filename or generate safe one
      let filename = req.body.filename || file.originalname;
      
      // If overwrite is not allowed, generate unique filename
      if (!req.body.overwrite) {
        filename = generateSafeFilename(file.originalname);
      }
      
      // Store filename in request for later use
      req.uploadedFilename = filename;
      
      cb(null, filename);
    } catch (error) {
      cb(error);
    }
  }
});

/**
 * File filter function
 */
function fileFilter(req, file, cb) {
  try {
    validateFile(file);
    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
}

/**
 * Create multer upload instance
 */
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1 // Only allow single file upload
  }
});

/**
 * Enhanced file upload middleware with error handling
 */
export function handleFileUpload(fieldName = 'file') {
  return (req, res, next) => {
    const uploadSingle = upload.single(fieldName);
    
    uploadSingle(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        // Handle multer-specific errors
        switch (error.code) {
          case 'LIMIT_FILE_SIZE':
            return res.error(
              ErrorCodes.FILE_UPLOAD_ERROR,
              `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
              { maxSize: MAX_FILE_SIZE },
              413
            );
          case 'LIMIT_FILE_COUNT':
            return res.error(
              ErrorCodes.FILE_UPLOAD_ERROR,
              'Too many files. Only one file allowed per upload',
              { maxFiles: 1 },
              400
            );
          case 'LIMIT_UNEXPECTED_FILE':
            return res.error(
              ErrorCodes.FILE_UPLOAD_ERROR,
              `Unexpected field name. Expected '${fieldName}'`,
              { expectedField: fieldName },
              400
            );
          default:
            return res.error(
              ErrorCodes.FILE_UPLOAD_ERROR,
              'File upload error',
              { code: error.code, message: error.message },
              400
            );
        }
      } else if (error) {
        // Handle validation and other errors
        return res.error(
          ErrorCodes.INVALID_FILE_TYPE,
          error.message,
          { allowedExtensions: ALLOWED_EXTENSIONS },
          400
        );
      }
      
      // If no file was uploaded and it's required
      if (!req.file && req.method === 'POST') {
        return res.error(
          ErrorCodes.INVALID_INPUT,
          'File is required for upload',
          { fieldName },
          400
        );
      }
      
      next();
    });
  };
}

/**
 * Middleware to validate file operations
 */
export function validateFileOperation(req, res, next) {
  const { filename } = req.params;
  
  if (!filename) {
    return res.error(
      ErrorCodes.INVALID_INPUT,
      'Filename is required',
      null,
      400
    );
  }
  
  // Basic filename validation
  if (filename.includes('../') || filename.includes('..\\')) {
    return res.error(
      ErrorCodes.INVALID_INPUT,
      'Invalid filename: Path traversal not allowed',
      { filename },
      400
    );
  }
  
  // Check file extension
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return res.error(
      ErrorCodes.INVALID_FILE_TYPE,
      `Invalid file type. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
      { filename, allowedExtensions: ALLOWED_EXTENSIONS },
      400
    );
  }
  
  next();
}

/**
 * Get file storage path
 */
export function getFilePath(filename, type = 'gcode') {
  const dir = UPLOAD_DIRS[type] || UPLOAD_DIRS.gcode;
  return path.join(dir, filename);
}

/**
 * Get upload directory info
 */
export function getUploadInfo() {
  return {
    allowedExtensions: ALLOWED_EXTENSIONS,
    allowedMimeTypes: ALLOWED_MIME_TYPES,
    maxFileSize: MAX_FILE_SIZE,
    maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
    uploadDirectories: UPLOAD_DIRS
  };
}

// Initialize upload directories on module load
ensureUploadDirs().catch(error => {
  logError('Failed to initialize upload directories:', error.message);
});