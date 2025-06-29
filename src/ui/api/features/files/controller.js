/**
 * File Controller
 * 
 * Handles G-code file management operations including upload, download, list, and CRUD operations
 */

import { info, error as logError } from '../../../../lib/logger/LoggerService.js';
import { asyncHandler, throwError } from '../../shared/middleware/errorHandler.js';
import { ErrorCodes } from '../../shared/responseFormatter.js';
import { getFilePath, getUploadInfo } from './middleware/fileUpload.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Get all available files
 */
export const listFiles = asyncHandler(async (req, res) => {
  info('API: Listing G-code files');
  
  const { type = 'gcode', sort = 'name', order = 'asc' } = req.query;
  
  try {
    const uploadInfo = getUploadInfo();
    const directory = uploadInfo.uploadDirectories[type] || uploadInfo.uploadDirectories.gcode;
    
    // Check if directory exists
    try {
      await fs.access(directory);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist, return empty list
        return res.success({
          files: [],
          count: 0,
          directory,
          sort: { field: sort, order }
        }, 'File listing completed (directory empty)');
      }
      throw error;
    }
    
    // Read directory contents
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];
    
    for (const entry of entries) {
      if (entry.isFile() && entry.name.match(/\.(gcode|nc|txt|cnc)$/i)) {
        const filePath = path.join(directory, entry.name);
        const stats = await fs.stat(filePath);
        
        files.push({
          name: entry.name,
          path: filePath,
          size: stats.size,
          sizeFormatted: formatFileSize(stats.size),
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          extension: path.extname(entry.name).toLowerCase(),
          type: getFileType(entry.name)
        });
      }
    }
    
    // Sort files
    files.sort((a, b) => {
      let aVal, bVal;
      
      switch (sort) {
        case 'size':
          aVal = a.size;
          bVal = b.size;
          break;
        case 'created':
          aVal = new Date(a.created);
          bVal = new Date(b.created);
          break;
        case 'modified':
          aVal = new Date(a.modified);
          bVal = new Date(b.modified);
          break;
        case 'name':
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
      }
      
      if (order === 'desc') {
        return aVal < bVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
    
    res.success({
      files,
      count: files.length,
      directory,
      sort: { field: sort, order },
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      totalSizeFormatted: formatFileSize(files.reduce((sum, file) => sum + file.size, 0))
    }, `Found ${files.length} G-code files`);
    
  } catch (error) {
    logError('API: Failed to list files:', error.message);
    throwError(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to list files',
      { directory, error: error.message },
      500
    );
  }
});

/**
 * Get specific file information
 */
export const getFileInfo = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  info(`API: Getting file info for: ${filename}`);
  
  try {
    const filePath = getFilePath(filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    const stats = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');
    
    // Parse G-code content
    const lines = content.split('\n');
    const executableLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(');
    });
    
    const fileInfo = {
      name: filename,
      path: filePath,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      extension: path.extname(filename).toLowerCase(),
      type: getFileType(filename),
      content: {
        totalLines: lines.length,
        executableLines: executableLines.length,
        commentLines: lines.length - executableLines.length,
        preview: executableLines.slice(0, 10), // First 10 executable commands
        estimatedDuration: estimateExecutionTime(executableLines)
      }
    };
    
    res.success(fileInfo, 'File information retrieved successfully');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throwError(
        ErrorCodes.FILE_NOT_FOUND,
        'G-code file not found',
        { filename },
        404
      );
    } else {
      logError('API: Failed to get file info:', error.message);
      throwError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to retrieve file information',
        { filename, error: error.message },
        500
      );
    }
  }
});

/**
 * Upload new file
 */
export const uploadFile = asyncHandler(async (req, res) => {
  info('API: Processing file upload');
  
  if (!req.file) {
    throwError(
      ErrorCodes.INVALID_INPUT,
      'No file provided for upload',
      null,
      400
    );
  }
  
  try {
    const { filename, path: filePath, size, mimetype, originalname } = req.file;
    const { description, tags } = req.body;
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    // Read and validate content
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const executableLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(');
    });
    
    const uploadResult = {
      filename: filename,
      originalName: originalname,
      path: filePath,
      size: size,
      sizeFormatted: formatFileSize(size),
      mimetype: mimetype,
      uploaded: new Date().toISOString(),
      description: description || null,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      content: {
        totalLines: lines.length,
        executableLines: executableLines.length,
        commentLines: lines.length - executableLines.length,
        preview: executableLines.slice(0, 5),
        estimatedDuration: estimateExecutionTime(executableLines)
      },
      validation: {
        valid: executableLines.length > 0,
        errors: executableLines.length === 0 ? ['No executable G-code commands found'] : []
      }
    };
    
    info(`API: File uploaded successfully: ${filename} (${formatFileSize(size)})`);
    
    res.success(uploadResult, 'File uploaded successfully');
    
  } catch (error) {
    logError('API: Failed to process uploaded file:', error.message);
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        logError('API: Failed to cleanup uploaded file:', cleanupError.message);
      }
    }
    
    throwError(
      ErrorCodes.FILE_UPLOAD_ERROR,
      'Failed to process uploaded file',
      { error: error.message },
      500
    );
  }
});

/**
 * Update file content
 */
export const updateFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { content, description, backup = true } = req.body;
  
  info(`API: Updating file: ${filename}`);
  
  if (!content) {
    throwError(
      ErrorCodes.INVALID_INPUT,
      'File content is required',
      null,
      400
    );
  }
  
  try {
    const filePath = getFilePath(filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Create backup if requested
    if (backup) {
      const backupPath = getFilePath(`${filename}.backup.${Date.now()}`, 'backups');
      await fs.copyFile(filePath, backupPath);
      info(`API: Created backup: ${backupPath}`);
    }
    
    // Write new content
    await fs.writeFile(filePath, content, 'utf8');
    
    // Get updated file stats
    const stats = await fs.stat(filePath);
    const lines = content.split('\n');
    const executableLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(');
    });
    
    const updateResult = {
      filename,
      path: filePath,
      size: stats.size,
      sizeFormatted: formatFileSize(stats.size),
      modified: stats.mtime.toISOString(),
      description: description || null,
      backup: backup,
      content: {
        totalLines: lines.length,
        executableLines: executableLines.length,
        commentLines: lines.length - executableLines.length,
        estimatedDuration: estimateExecutionTime(executableLines)
      }
    };
    
    res.success(updateResult, 'File updated successfully');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throwError(
        ErrorCodes.FILE_NOT_FOUND,
        'G-code file not found',
        { filename },
        404
      );
    } else {
      logError('API: Failed to update file:', error.message);
      throwError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to update file',
        { filename, error: error.message },
        500
      );
    }
  }
});

/**
 * Delete file
 */
export const deleteFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  const { backup = true } = req.query;
  
  info(`API: Deleting file: ${filename}`);
  
  try {
    const filePath = getFilePath(filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    // Create backup if requested
    let backupPath = null;
    if (backup === 'true') {
      backupPath = getFilePath(`${filename}.deleted.${Date.now()}`, 'backups');
      await fs.copyFile(filePath, backupPath);
      info(`API: Created backup before deletion: ${backupPath}`);
    }
    
    // Delete the file
    await fs.unlink(filePath);
    
    res.success({
      filename,
      deleted: true,
      backup: backup === 'true',
      backupPath: backupPath,
      deletedAt: new Date().toISOString()
    }, 'File deleted successfully');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throwError(
        ErrorCodes.FILE_NOT_FOUND,
        'G-code file not found',
        { filename },
        404
      );
    } else {
      logError('API: Failed to delete file:', error.message);
      throwError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to delete file',
        { filename, error: error.message },
        500
      );
    }
  }
});

/**
 * Download file
 */
export const downloadFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  info(`API: Downloading file: ${filename}`);
  
  try {
    const filePath = getFilePath(filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    const stats = await fs.stat(filePath);
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    
    // Stream the file
    const fileStream = await fs.readFile(filePath);
    res.send(fileStream);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throwError(
        ErrorCodes.FILE_NOT_FOUND,
        'G-code file not found',
        { filename },
        404
      );
    } else {
      logError('API: Failed to download file:', error.message);
      throwError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to download file',
        { filename, error: error.message },
        500
      );
    }
  }
});

/**
 * Validate file content
 */
export const validateFile = asyncHandler(async (req, res) => {
  const { filename } = req.params;
  info(`API: Validating file: ${filename}`);
  
  try {
    const filePath = getFilePath(filename);
    
    // Check if file exists
    await fs.access(filePath);
    
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const executableLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(');
    });
    
    // Perform validation checks
    const validation = {
      filename,
      valid: true,
      errors: [],
      warnings: [],
      stats: {
        totalLines: lines.length,
        executableLines: executableLines.length,
        commentLines: lines.length - executableLines.length,
        estimatedDuration: estimateExecutionTime(executableLines)
      }
    };
    
    // Check for common issues
    if (executableLines.length === 0) {
      validation.valid = false;
      validation.errors.push('No executable G-code commands found');
    }
    
    // Check for potentially unsafe commands
    const unsafeCommands = executableLines.filter(line => 
      line.includes('M112') || line.includes('M0') || line.includes('M1')
    );
    
    if (unsafeCommands.length > 0) {
      validation.warnings.push(`Found ${unsafeCommands.length} potentially unsafe commands (M0, M1, M112)`);
    }
    
    res.success(validation, 'File validation completed');
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      throwError(
        ErrorCodes.FILE_NOT_FOUND,
        'G-code file not found',
        { filename },
        404
      );
    } else {
      logError('API: Failed to validate file:', error.message);
      throwError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to validate file',
        { filename, error: error.message },
        500
      );
    }
  }
});

/**
 * Utility Functions
 */

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.gcode':
      return 'G-code';
    case '.nc':
      return 'Numerical Control';
    case '.cnc':
      return 'CNC Program';
    case '.txt':
      return 'Text/G-code';
    default:
      return 'Unknown';
  }
}

function estimateExecutionTime(executableLines) {
  // Simple estimation based on command count and types
  // This is a rough estimate and would need calibration for specific machines
  
  let estimatedSeconds = 0;
  
  for (const line of executableLines) {
    const command = line.trim().toUpperCase();
    
    if (command.startsWith('G0') || command.startsWith('G00')) {
      // Rapid positioning - fast
      estimatedSeconds += 0.5;
    } else if (command.startsWith('G1') || command.startsWith('G01')) {
      // Linear interpolation - depends on feed rate, assume moderate
      estimatedSeconds += 2;
    } else if (command.startsWith('G2') || command.startsWith('G3')) {
      // Circular interpolation - moderate
      estimatedSeconds += 3;
    } else if (command.startsWith('M')) {
      // Machine commands - quick
      estimatedSeconds += 0.2;
    } else {
      // Other commands - quick
      estimatedSeconds += 0.1;
    }
  }
  
  return {
    seconds: Math.round(estimatedSeconds),
    formatted: formatDuration(estimatedSeconds)
  };
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}