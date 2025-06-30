/**
 * G-code Controller
 * 
 * Handles G-code execution, file operations, and queue management
 */

import { info, error as logError } from '@cnc/core/services/logger';
import { asyncHandler, throwError } from '../../shared/middleware/errorHandler.js';
import { ErrorCodes } from '../../shared/responseFormatter.js';
import { getSharedGcodeSender } from '@cnc/core/services/shared/InstanceManager';
import fs from 'fs/promises';
import path from 'path';

/**
 * Get shared GcodeSender instance
 */
function getGcodeSender() {
  return getSharedGcodeSender();
}

/**
 * Ensure machine is connected before operations
 */
function ensureConnected(sender) {
  const status = sender.getStatus();
  if (!status.isConnected) {
    throwError(
      ErrorCodes.NOT_CONNECTED,
      'Machine must be connected before executing G-code',
      { currentStatus: status },
      400
    );
  }
  return status;
}

/**
 * Validate G-code command format
 */
function validateGcodeCommand(command) {
  if (!command || typeof command !== 'string') {
    throwError(
      ErrorCodes.INVALID_INPUT,
      'G-code command must be a non-empty string',
      { providedCommand: command },
      400
    );
  }
  
  const trimmedCommand = command.trim();
  if (!trimmedCommand) {
    throwError(
      ErrorCodes.INVALID_INPUT,
      'G-code command cannot be empty or whitespace only',
      { providedCommand: command },
      400
    );
  }
  
  // Basic G-code validation - should start with G, M, $ or be a coordinate
  const gcodePattern = /^[GM$]|^[XYZ\-+0-9\s.]+$/i;
  if (!gcodePattern.test(trimmedCommand) && !trimmedCommand.startsWith(';')) {
    info(`API: Warning - Potentially invalid G-code format: ${trimmedCommand}`);
  }
  
  return trimmedCommand;
}

/**
 * Execute a single G-code command
 */
export const executeGcodeCommand = asyncHandler(async (req, res) => {
  info('API: Executing G-code command');
  
  const sender = getGcodeSender();
  ensureConnected(sender);
  
  const { command } = req.body;
  
  try {
    // Validate the command
    const validatedCommand = validateGcodeCommand(command);
    
    info(`API: Executing G-code: ${validatedCommand}`);
    
    // Execute the command using existing GcodeSender functionality
    const startTime = Date.now();
    const result = await sender.sendGcode(validatedCommand);
    const duration = Date.now() - startTime;
    
    info(`API: G-code executed successfully: ${result.response} (${duration}ms)`);
    
    res.success({
      command: validatedCommand,
      response: result.response,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      execution_details: {
        sent_at: startTime,
        completed_at: Date.now(),
        raw_response: result.rawResponse || result.response
      }
    }, 'G-code command executed successfully');
    
  } catch (error) {
    logError('API: Failed to execute G-code command:', error.message);
    throwError(
      ErrorCodes.COMMAND_FAILED,
      'Failed to execute G-code command',
      { 
        command: command,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      500
    );
  }
});

/**
 * Execute G-code from file
 */
export const executeGcodeFile = asyncHandler(async (req, res) => {
  info('API: Processing G-code file request');
  
  const sender = getGcodeSender();
  
  let { filePath, validateOnly = false } = req.body;
  
  if (!filePath) {
    throwError(
      ErrorCodes.INVALID_INPUT,
      'File path is required',
      { providedFilePath: filePath },
      400
    );
  }
  
  // Handle relative paths from project root
  if (!path.isAbsolute(filePath)) {
    filePath = path.resolve(process.cwd(), filePath);
  }
  
  try {
    // Check if file exists
    await fs.access(filePath);
    info(`API: File found: ${filePath}`);
    
    // Read file content for validation
    const fileContent = await fs.readFile(filePath, 'utf8');
    const lines = fileContent.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith(';'));
    
    if (lines.length === 0) {
      throwError(
        ErrorCodes.INVALID_INPUT,
        'G-code file contains no executable commands',
        { filePath, totalLines: fileContent.split('\n').length },
        400
      );
    }
    
    // If only validation is requested
    if (validateOnly) {
      info(`API: G-code file validation completed: ${lines.length} commands found`);
      
      return res.success({
        filePath,
        valid: true,
        totalLines: fileContent.split('\n').length,
        executableCommands: lines.length,
        fileSize: Buffer.byteLength(fileContent, 'utf8'),
        preview: lines.slice(0, 5), // First 5 commands as preview
        timestamp: new Date().toISOString()
      }, 'G-code file validation completed successfully');
    }
    
    // For execution, ensure connection
    ensureConnected(sender);
    
    // Execute the file using existing GcodeSender functionality
    info(`API: Starting execution of G-code file: ${filePath} (${lines.length} commands)`);
    const startTime = Date.now();
    
    const result = await sender.executeGcodeFile(filePath);
    const duration = Date.now() - startTime;
    
    info(`API: G-code file execution completed: ${result.totalCommands} commands processed`);
    
    const successCount = result.results.filter(r => r.success).length;
    const failureCount = result.results.filter(r => !r.success).length;
    
    res.success({
      filePath,
      execution: {
        totalCommands: result.totalCommands,
        successful: successCount,
        failed: failureCount,
        duration_ms: duration,
        completed_at: new Date().toISOString()
      },
      results: result.results.map(r => ({
        command: r.command,
        success: r.success,
        response: r.response,
        error: r.error || null,
        duration_ms: r.duration || 0
      })),
      summary: {
        success_rate: ((successCount / result.totalCommands) * 100).toFixed(1) + '%',
        average_command_time: Math.round(duration / result.totalCommands) + 'ms',
        file_size_bytes: Buffer.byteLength(fileContent, 'utf8')
      },
      timestamp: new Date().toISOString()
    }, `G-code file execution completed: ${successCount}/${result.totalCommands} commands successful`);
    
  } catch (error) {
    if (error.code === 'ENOENT') {
      logError(`API: G-code file not found: ${filePath}`);
      throwError(
        ErrorCodes.FILE_NOT_FOUND,
        'G-code file not found',
        { filePath, error: 'File does not exist' },
        404
      );
    } else if (error.syscall === 'open' || error.code === 'EACCES') {
      logError(`API: Cannot access G-code file: ${filePath}`, error.message);
      throwError(
        ErrorCodes.FILE_ACCESS_ERROR,
        'Cannot access G-code file',
        { filePath, error: error.message },
        403
      );
    } else {
      logError('API: Failed to execute G-code file:', error.message);
      throwError(
        ErrorCodes.EXECUTION_FAILED,
        'Failed to execute G-code file',
        { 
          filePath,
          error: error.message,
          timestamp: new Date().toISOString()
        },
        500
      );
    }
  }
});

/**
 * Get current execution queue status
 */
export const getExecutionQueue = asyncHandler(async (req, res) => {
  info('API: Getting execution queue status');
  
  const sender = getGcodeSender();
  const status = sender.getStatus();
  
  // Get queue information from GcodeSender
  const queueInfo = {
    connected: status.isConnected,
    port: status.currentPort || null,
    commandsInQueue: status.commandsInQueue || 0,
    isExecuting: status.isExecuting || false,
    currentCommand: status.currentCommand || null,
    queueStatus: status.commandsInQueue > 0 ? 'active' : 'empty',
    timestamp: new Date().toISOString()
  };
  
  // If there are commands in queue, get more details
  if (status.isConnected && status.commandsInQueue > 0) {
    try {
      // Try to get additional queue details if available
      queueInfo.estimatedTime = status.estimatedTime || null;
      queueInfo.progress = status.progress || null;
    } catch (error) {
      info('API: Could not retrieve detailed queue information');
    }
  }
  
  res.success(queueInfo, 'Execution queue status retrieved successfully');
});

/**
 * Clear execution queue (emergency stop)
 */
export const clearExecutionQueue = asyncHandler(async (req, res) => {
  info('API: Clearing execution queue');
  
  const sender = getGcodeSender();
  ensureConnected(sender);
  
  try {
    // Send emergency stop to clear any running operations
    await sender.emergencyStop();
    
    info('API: Execution queue cleared successfully');
    
    const finalStatus = sender.getStatus();
    
    res.success({
      cleared: true,
      previousQueue: {
        commandsInQueue: finalStatus.commandsInQueue || 0
      },
      currentStatus: {
        connected: finalStatus.isConnected,
        port: finalStatus.currentPort || null,
        commandsInQueue: 0,
        isExecuting: false
      },
      timestamp: new Date().toISOString()
    }, 'Execution queue cleared successfully');
    
  } catch (error) {
    logError('API: Failed to clear execution queue:', error.message);
    throwError(
      ErrorCodes.COMMAND_FAILED,
      'Failed to clear execution queue',
      { error: error.message },
      500
    );
  }
});