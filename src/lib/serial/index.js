/**
 * Serial Interface Factory and Exports
 * 
 * Main entry point for the serial abstraction layer.
 * Automatically detects the environment and creates the appropriate adapter.
 */

import { NodeSerialAdapter } from './NodeSerialAdapter.js';
import { WebSerialAdapter } from './WebSerialAdapter.js';
import { debug, warn } from '../logger/LoggerService.js';

/**
 * Create the appropriate serial interface for the current environment
 * @param {object} options - Configuration options
 * @param {string} options.forceAdapter - Force specific adapter ('node' or 'web')
 * @param {boolean} options.preferWeb - Prefer Web Serial API if available
 * @returns {SerialInterface} The appropriate serial interface adapter
 */
export function createSerialInterface(options = {}) {
  const { forceAdapter, preferWeb = false } = options;

  // Allow explicit adapter selection (useful for testing)
  if (forceAdapter) {
    switch (forceAdapter.toLowerCase()) {
      case 'node':
        debug('SerialFactory: Forced to use NodeSerialAdapter');
        return new NodeSerialAdapter();
      case 'web':
        debug('SerialFactory: Forced to use WebSerialAdapter');
        return new WebSerialAdapter();
      default:
        throw new Error(`Unknown serial adapter: ${forceAdapter}. Use 'node' or 'web'.`);
    }
  }

  // Detect environment and create appropriate adapter
  const isNode = typeof process !== 'undefined' && 
                 process.versions && 
                 process.versions.node;
  
  const isBrowser = typeof window !== 'undefined' && 
                    typeof document !== 'undefined';
  
  const hasWebSerial = typeof navigator !== 'undefined' && 
                       'serial' in navigator;

  debug(`SerialFactory: Environment detection - Node: ${isNode}, Browser: ${isBrowser}, WebSerial: ${hasWebSerial}`);

  // Choose adapter based on environment and preferences
  if (isBrowser && hasWebSerial && (preferWeb || !isNode)) {
    debug('SerialFactory: Using WebSerialAdapter for browser environment');
    return new WebSerialAdapter();
  } else if (isNode) {
    debug('SerialFactory: Using NodeSerialAdapter for Node.js environment');
    return new NodeSerialAdapter();
  } else if (isBrowser && !hasWebSerial) {
    throw new Error(
      'Web Serial API not supported in this browser. ' +
      'Please use Chrome 89+, Edge 89+, or Opera 75+ with HTTPS.'
    );
  } else {
    throw new Error(
      'No compatible serial interface available. ' +
      'Requires Node.js environment or browser with Web Serial API support.'
    );
  }
}

/**
 * Check what serial interfaces are available in the current environment
 * @returns {object} Object describing available interfaces
 */
export function getAvailableInterfaces() {
  const isNode = typeof process !== 'undefined' && 
                 process.versions && 
                 process.versions.node;
  
  const isBrowser = typeof window !== 'undefined' && 
                    typeof document !== 'undefined';
  
  const hasWebSerial = typeof navigator !== 'undefined' && 
                       'serial' in navigator;

  return {
    environment: {
      isNode,
      isBrowser,
      hasWebSerial
    },
    available: {
      nodeSerial: isNode,
      webSerial: isBrowser && hasWebSerial
    },
    recommended: isNode ? 'NodeSerialAdapter' : 
                 (hasWebSerial ? 'WebSerialAdapter' : 'none')
  };
}

/**
 * Test serial interface creation without actually creating an instance
 * @param {object} options - Options to test
 * @returns {object} Test results
 */
export function testSerialInterfaceAvailability(options = {}) {
  try {
    const interfaces = getAvailableInterfaces();
    
    // Test if we can create the interface
    const adapter = createSerialInterface(options);
    const adapterType = adapter.constructor.name;
    
    return {
      success: true,
      adapterType,
      interfaces,
      message: `Successfully created ${adapterType}`
    };
  } catch (error) {
    return {
      success: false,
      adapterType: null,
      interfaces: getAvailableInterfaces(),
      error: error.message
    };
  }
}

// Re-export the base interface and adapters for direct use if needed
export { SerialInterface } from './SerialInterface.js';
export { NodeSerialAdapter } from './NodeSerialAdapter.js';
export { WebSerialAdapter } from './WebSerialAdapter.js';