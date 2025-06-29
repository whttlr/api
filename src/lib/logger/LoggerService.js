import { Config } from '../../cnc/config.js';

// Function to get config safely
function getConfig() {
  try {
    return Config.get();
  } catch (error) {
    // Fallback config if Config is not available
    return {
      logging: {
        level: 'info',
        timestampFormat: 'YYYY-MM-DD HH:mm:ss',
        enableColors: true,
        enableTimestamps: true
      }
    };
  }
}

/**
 * Log levels for controlling output verbosity
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  VERBOSE: 4
};

/**
 * Get current log level from config
 */
function getLogLevel() {
  const config = getConfig();
  // Handle case where config might be null or missing logLevel
  const level = (config && config.logLevel) || 'INFO';
  return LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
}

/**
 * Log messages with appropriate level filtering
 */
function log(message, data = null, level = 'info') {
  const messageLevel = LOG_LEVELS[level.toUpperCase()] || LOG_LEVELS.INFO;
  const currentLevel = getLogLevel();
  
  // Filter out messages above current log level
  if (messageLevel > currentLevel) return;

  const timestamp = new Date().toISOString();
  const prefix = level.toUpperCase() === 'INFO' ? '' : `[${level.toUpperCase()}] `;
  const logMessage = `${prefix}${message}`;

  // For errors and warnings, include timestamp
  if (level === 'error' || level === 'warn' || level === 'debug') {
    const timestampedMessage = `[${timestamp}] ${logMessage}`;
    if (data) {
      console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](timestampedMessage, data);
    } else {
      console[level === 'warn' ? 'warn' : level === 'error' ? 'error' : 'log'](timestampedMessage);
    }
  } else {
    // For info level, clean output without timestamp
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

/**
 * Convenience functions for different log levels
 */
function error(message, data = null) {
  log(message, data, 'error');
}

function warn(message, data = null) {
  log(message, data, 'warn');
}

function info(message, data = null) {
  log(message, data, 'info');
}

function debug(message, data = null) {
  log(message, data, 'debug');
}

function verbose(message, data = null) {
  log(message, data, 'verbose');
}

export { log, error, warn, info, debug, verbose };