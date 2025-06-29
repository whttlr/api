/**
 * Instance Manager
 * 
 * Manages shared instances across different interfaces (API, CLI) to ensure consistency
 * and enable connection sharing between multiple interface types.
 */

import { GcodeSender } from '../../cnc/GcodeSender.js';

/**
 * Shared GcodeSender instance
 */
let sharedGcodeSender = null;

/**
 * Get or create the shared GcodeSender instance
 * @param {string} interfaceType - Type of interface using the instance ('api', 'cli', 'ink')
 */
export function getSharedGcodeSender(interfaceType = 'unknown') {
  if (!sharedGcodeSender) {
    sharedGcodeSender = new GcodeSender();
    sharedGcodeSender._currentInterface = interfaceType;
  }
  return sharedGcodeSender;
}

/**
 * Reset the shared instance (useful for testing or error recovery)
 */
export function resetSharedGcodeSender() {
  if (sharedGcodeSender && sharedGcodeSender.isConnected) {
    sharedGcodeSender.disconnect();
  }
  sharedGcodeSender = null;
}

/**
 * Check if shared instance exists
 */
export function hasSharedGcodeSender() {
  return sharedGcodeSender !== null;
}

/**
 * Get connection status information
 */
export function getConnectionStatus() {
  if (!sharedGcodeSender) {
    return {
      isConnected: false,
      port: null,
      interface: null,
      inUse: false
    };
  }

  return {
    isConnected: sharedGcodeSender.isConnected,
    port: sharedGcodeSender.currentPort || null,
    interface: sharedGcodeSender._currentInterface || 'unknown',
    inUse: true
  };
}