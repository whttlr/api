/**
 * Logger Service Module Public API
 * 
 * Exports logging functionality for the CNC application.
 */

export { log, debug, info, warn, error } from './LoggerService.js';

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info', 
  WARN: 'warn',
  ERROR: 'error',
  LOG: 'log'
};