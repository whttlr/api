/**
 * Error Translation Service
 * 
 * Provides user-friendly error messages and actionable suggestions for common
 * CNC machine errors, connection issues, and operational problems.
 * 
 * @module ErrorTranslator
 */

/**
 * Predefined error messages with user-friendly translations
 */
export const ErrorMessages = {
  // Connection Errors
  CONNECTION_TIMEOUT: {
    message: "Connection timeout - the machine didn't respond",
    suggestion: "Check your cable connection and make sure the machine is powered on",
    action: "Try reconnecting with a slower baud rate"
  },
  PORT_NOT_FOUND: {
    message: "Serial port not found or busy",
    suggestion: "Another program might be using this port",
    action: "Close other CNC software and try again"
  },
  PERMISSION_DENIED: {
    message: "Permission denied accessing the serial port",
    suggestion: "You may not have permission to access this device",
    action: "Run as administrator or check device permissions"
  },
  
  // Machine Errors
  MACHINE_ALARM: {
    message: "Machine is in alarm state",
    suggestion: "Check for limit switch triggers or mechanical issues",
    action: "Clear alarms and home the machine before continuing"
  },
  GRBL_ERROR: {
    message: "Machine rejected the command",
    suggestion: "The G-code command is invalid or unsafe",
    action: "Check your G-code syntax and machine state"
  },
  EMERGENCY_STOP: {
    message: "Emergency stop activated",
    suggestion: "Machine movement has been halted for safety",
    action: "Resolve the issue and reset the machine"
  },
  
  // File Errors
  FILE_NOT_FOUND: {
    message: "G-code file not found",
    suggestion: "The file may have been moved or deleted",
    action: "Browse to select a different file"
  },
  FILE_CORRUPT: {
    message: "File appears to be corrupted or invalid",
    suggestion: "The G-code file contains syntax errors",
    action: "Check the file in a text editor and fix any issues"
  },
  
  // Command Errors
  INVALID_GCODE: {
    message: "Invalid G-code command",
    suggestion: "The command syntax is incorrect",
    action: "Check G-code reference for proper syntax"
  },
  MACHINE_NOT_CONNECTED: {
    message: "Machine not connected",
    suggestion: "Connect to your CNC machine first",
    action: "Go to Connection screen and select your serial port"
  },
  
  // Safety Errors
  SOFT_LIMIT: {
    message: "Movement would exceed machine limits",
    suggestion: "The requested move is outside safe working area",
    action: "Reduce movement distance or check machine limits"
  },
  UNSAFE_OPERATION: {
    message: "Unsafe operation detected",
    suggestion: "This action could damage the machine or workpiece",
    action: "Home the machine and verify setup before continuing"
  }
};

/**
 * Translate raw error messages into user-friendly format
 * @param {Error|string} error - Error object or error message string
 * @param {string} context - Optional context for more specific error handling
 * @returns {Object} User-friendly error object with message, suggestion, and action
 */
export function translateError(error, context = '') {
  const errorStr = error.toString().toLowerCase();
  
  // Check for specific error patterns
  if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
    return ErrorMessages.CONNECTION_TIMEOUT;
  }
  if (errorStr.includes('permission denied') || errorStr.includes('access denied')) {
    return ErrorMessages.PERMISSION_DENIED;
  }
  if (errorStr.includes('port') && (errorStr.includes('busy') || errorStr.includes('not found'))) {
    return ErrorMessages.PORT_NOT_FOUND;
  }
  if (errorStr.includes('alarm')) {
    return ErrorMessages.MACHINE_ALARM;
  }
  if (errorStr.includes('grbl') && errorStr.includes('error')) {
    return ErrorMessages.GRBL_ERROR;
  }
  if (errorStr.includes('emergency') || errorStr.includes('estop')) {
    return ErrorMessages.EMERGENCY_STOP;
  }
  if (errorStr.includes('file') && errorStr.includes('not found')) {
    return ErrorMessages.FILE_NOT_FOUND;
  }
  if (errorStr.includes('invalid') && errorStr.includes('gcode')) {
    return ErrorMessages.INVALID_GCODE;
  }
  if (errorStr.includes('not connected')) {
    return ErrorMessages.MACHINE_NOT_CONNECTED;
  }
  if (errorStr.includes('limit')) {
    return ErrorMessages.SOFT_LIMIT;
  }
  
  // Context-specific error handling
  if (context) {
    switch (context) {
      case 'connection':
        return {
          message: `Connection error: ${error.message || error}`,
          suggestion: "Check your machine connection and cable",
          action: "Try reconnecting or select a different serial port"
        };
      case 'file_execution':
        return {
          message: `File execution error: ${error.message || error}`,
          suggestion: "The G-code file may contain errors",
          action: "Review the file and fix any syntax issues"
        };
      case 'command':
        return {
          message: `Command error: ${error.message || error}`,
          suggestion: "The G-code command is invalid",
          action: "Check command syntax and machine state"
        };
    }
  }
  
  // Fallback for unknown errors
  return {
    message: `Error: ${error.message || error}`,
    suggestion: "An unexpected error occurred",
    action: "Check the logs for more details or restart the application"
  };
}

/**
 * Get error category based on error type
 * @param {Error|string} error - Error to categorize
 * @returns {string} Error category ('connection', 'machine', 'file', 'command', 'safety', 'unknown')
 */
export function getErrorCategory(error) {
  const errorStr = error.toString().toLowerCase();
  
  if (errorStr.includes('timeout') || errorStr.includes('port') || errorStr.includes('permission')) {
    return 'connection';
  }
  if (errorStr.includes('alarm') || errorStr.includes('grbl') || errorStr.includes('emergency')) {
    return 'machine';
  }
  if (errorStr.includes('file') || errorStr.includes('corrupt')) {
    return 'file';
  }
  if (errorStr.includes('gcode') || errorStr.includes('command') || errorStr.includes('invalid')) {
    return 'command';
  }
  if (errorStr.includes('limit') || errorStr.includes('unsafe')) {
    return 'safety';
  }
  
  return 'unknown';
}

/**
 * Check if error is recoverable
 * @param {Error|string} error - Error to check
 * @returns {boolean} True if error might be recoverable
 */
export function isRecoverableError(error) {
  const category = getErrorCategory(error);
  
  // Most connection and command errors are recoverable
  return ['connection', 'command', 'file'].includes(category);
}

export default {
  ErrorMessages,
  translateError,
  getErrorCategory,
  isRecoverableError
};