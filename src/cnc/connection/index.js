/**
 * Connection Module Public API
 * 
 * Exports the public interface for serial port connection management.
 */

export { ConnectionManager } from './ConnectionManager.js';

// Re-export commonly used types/constants if needed
export const CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting', 
  CONNECTED: 'connected',
  ERROR: 'error'
};