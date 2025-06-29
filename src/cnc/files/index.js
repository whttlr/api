/**
 * Files Module Public API
 * 
 * Exports the public interface for G-code file operations.
 */

export { FileProcessor } from './FileProcessor.js';

// Re-export file-related constants
export const FILE_TYPES = {
  GCODE: '.gcode',
  NC: '.nc',
  TXT: '.txt'
};

export const VALIDATION_STATES = {
  VALID: 'valid',
  INVALID: 'invalid',
  WARNING: 'warning'
};

export const EXECUTION_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};