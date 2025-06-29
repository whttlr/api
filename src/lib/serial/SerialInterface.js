/**
 * Serial Interface Abstraction Layer
 * 
 * Abstract base class that defines the interface for all serial communication adapters.
 * This enables support for both Node.js SerialPort and Web Serial API through a 
 * unified interface.
 * 
 * Based on CoastRunner CRWrite v2 insights about JavaScript event loop optimization
 * for CNC communication.
 */

import { EventEmitter } from 'events';

export class SerialInterface extends EventEmitter {
  constructor() {
    super();
    this.isConnected = false;
    this.connectionInfo = null;
  }

  /**
   * Connect to a serial port
   * @param {string|object} portPath - Port path (Node.js) or options object (Web Serial)
   * @param {number} baudRate - Baud rate for connection
   * @returns {Promise<void>}
   */
  async connect(portPath, baudRate = 115200) {
    throw new Error('connect() must be implemented by adapter');
  }

  /**
   * Disconnect from the serial port
   * @returns {Promise<void>}
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by adapter');
  }

  /**
   * Write data to the serial port
   * @param {string} data - Data to write
   * @returns {Promise<void>}
   */
  async write(data) {
    throw new Error('write() must be implemented by adapter');
  }

  /**
   * List available serial ports
   * @returns {Promise<Array>} Array of port information objects
   */
  async listPorts() {
    throw new Error('listPorts() must be implemented by adapter');
  }

  /**
   * Get current connection status
   * @returns {object} Connection status information
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      connectionInfo: this.connectionInfo
    };
  }

  /**
   * Register data event handler
   * @param {function} callback - Callback for received data
   */
  onData(callback) {
    this.on('data', callback);
  }

  /**
   * Register error event handler  
   * @param {function} callback - Callback for errors
   */
  onError(callback) {
    this.on('error', callback);
  }

  /**
   * Register disconnect event handler
   * @param {function} callback - Callback for disconnection
   */
  onDisconnect(callback) {
    this.on('disconnect', callback);
  }

  /**
   * Register connect event handler
   * @param {function} callback - Callback for connection
   */
  onConnect(callback) {
    this.on('connect', callback);
  }

  /**
   * Clean up event listeners and resources
   */
  cleanup() {
    this.removeAllListeners();
    this.isConnected = false;
    this.connectionInfo = null;
  }
}