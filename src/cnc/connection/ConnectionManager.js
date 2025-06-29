/**
 * Connection Manager Module
 * 
 * Handles serial port connection management, discovery, and event handling.
 * Separated from main GcodeSender to follow single responsibility principle.
 */

import { EventEmitter } from 'events';
import { createSerialInterface } from '../../lib/serial/index.js';
import i18n from '../../i18n.js';
import { debug, info, warn, error } from '../../lib/logger/index.js';
import { initializeGRBL } from '../../lib/helpers/index.js';

export class ConnectionManager extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.serialInterface = null;
    this.isConnected = false;
    this.currentPort = null;
    this.connectionInfo = null;
  }

  /**
   * Get list of available serial ports
   */
  async getAvailablePorts() {
    try {
      // Create a temporary serial interface to list ports
      const tempInterface = createSerialInterface();
      const ports = await tempInterface.listPorts();
      
      debug(i18n.t('connectionManager.portsFound', { count: ports.length }));
      
      return ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Unknown',
        serialNumber: port.serialNumber || 'Unknown',
        vendorId: port.vendorId || 'Unknown',
        productId: port.productId || 'Unknown',
        adapter: port.adapter || 'Unknown'
      }));
    } catch (err) {
      error(i18n.t('connectionManager.errorListingPorts'), err);
      return [];
    }
  }

  /**
   * Connect to specified serial port using abstracted interface
   */
  async connect(portPath, options = {}) {
    try {
      debug(i18n.t('connectionManager.connectingToPort', { portPath }));
      portPath = portPath || this.config.defaultPort;
      
      // Create serial interface
      this.serialInterface = createSerialInterface();
      
      // Set up event listeners before connecting
      this.setupEventListeners();
      
      // Merge default config with provided options
      const connectionOptions = {
        baudRate: this.config.serialPort?.baudRate || 115200,
        ...options
      };
      
      // Connect using abstracted interface
      await this.serialInterface.connect(portPath, connectionOptions.baudRate);
      
      this.isConnected = true;
      this.currentPort = portPath;
      this.connectionInfo = {
        portPath,
        options: connectionOptions,
        connectedAt: new Date(),
        adapter: this.serialInterface.constructor.name
      };
      
      info(i18n.t('connectionManager.connectedSuccessfully', { portPath }));
      
      // Emit connect event
      this.emit('connect', this.connectionInfo);
      
      // Initialize GRBL with wake-up command
      setTimeout(async () => {
        try {
          await initializeGRBL(this.serialInterface, this.isConnected);
          debug('ConnectionManager: GRBL initialization completed');
        } catch (err) {
          warn(i18n.t('connectionManager.grblInitFailed'), err);
          // Continue anyway, initialization is optional
        }
      }, this.config.connectionInitDelay || 100);
      
      return { success: true, port: portPath };
      
    } catch (err) {
      error(i18n.t('connectionManager.errorDuringConnection'), err);
      this.isConnected = false;
      this.connectionInfo = null;
      
      if (this.serialInterface) {
        try {
          await this.serialInterface.disconnect();
        } catch (disconnectErr) {
          warn('Error during cleanup disconnect:', disconnectErr);
        }
        this.serialInterface = null;
      }
      
      throw err;
    }
  }

  /**
   * Set up event listeners for the serial interface
   */
  setupEventListeners() {
    if (!this.serialInterface) return;
    
    this.serialInterface.onData((data) => {
      this.emit('data', data);
    });
    
    this.serialInterface.onError((err) => {
      error(i18n.t('connectionManager.portError', { error: err.message }));
      this.isConnected = false;
      this.emit('error', err);
    });
    
    this.serialInterface.onDisconnect(() => {
      info(i18n.t('connectionManager.portClosed'));
      this.isConnected = false;
      this.connectionInfo = null;
      this.emit('disconnect');
    });
  }

  /**
   * Disconnect from serial port using abstracted interface
   */  
  async disconnect() {
    if (!this.serialInterface || !this.isConnected) {
      info(i18n.t('connectionManager.alreadyDisconnected'));
      return { success: true };
    }

    try {
      info(i18n.t('connectionManager.disconnecting'));
      
      await this.serialInterface.disconnect();
      
      info(i18n.t('connectionManager.disconnectedSuccessfully'));
      
      this.isConnected = false;
      this.currentPort = null;
      this.connectionInfo = null;
      this.serialInterface = null;
      
      return { success: true };
      
    } catch (err) {
      error(i18n.t('connectionManager.errorDuringDisconnect'), err);
      
      // Force cleanup even if disconnect failed
      this.isConnected = false;
      this.currentPort = null;
      this.connectionInfo = null;
      this.serialInterface = null;
      
      throw err;
    }
  }

  /**
   * Set up data handler with callback (backward compatibility)
   */
  setupDataHandler(handleDataCallback) {
    if (!this.serialInterface) {
      throw new Error(i18n.t('connectionManager.parserNotInitialized'));
    }

    // Use the event listener we already set up, but add an additional handler
    this.serialInterface.onData((data) => {
      // Data is already cleaned by the adapter
      if (this.config.verboseSerial && data.length > 0) {
        debug(i18n.t('connectionManager.serialRawReceived', { data, length: data.length }));
        debug(i18n.t('connectionManager.serialCleanedProcessing', { cleanedData: data }));
      }
      
      if (data.length > 0) {
        handleDataCallback(data);
      }
    });
  }

  /**
   * Get current connection status
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      port: this.currentPort,
      hasSerialInterface: !!this.serialInterface,
      connectionInfo: this.connectionInfo,
      adapter: this.serialInterface ? this.serialInterface.constructor.name : null
    };
  }

  /**
   * Get the serial interface (replaces getPort for new code)
   */
  getSerialInterface() {
    return this.serialInterface;
  }
  
  /**
   * Get the raw port instance (for backward compatibility)
   * @deprecated Use getSerialInterface() instead
   */
  getPort() {
    warn('ConnectionManager.getPort() is deprecated. Use getSerialInterface() instead.');
    
    // Try to return the raw port if using NodeSerialAdapter
    if (this.serialInterface && this.serialInterface.getRawPort) {
      return this.serialInterface.getRawPort();
    }
    
    // Return the serial interface as fallback
    return this.serialInterface;
  }

  /**
   * Check if connected
   */
  isPortConnected() {
    return this.isConnected;
  }
  
  /**
   * Write data to the serial interface
   * @param {string} data - Data to write
   * @returns {Promise<void>}
   */
  async write(data) {
    if (!this.serialInterface) {
      throw new Error('Serial interface not available');
    }
    
    return await this.serialInterface.write(data);
  }
  
  /**
   * Get adapter information
   * @returns {object} Information about the current adapter
   */
  getAdapterInfo() {
    if (!this.serialInterface) {
      return { adapter: null, connected: false };
    }
    
    return {
      adapter: this.serialInterface.constructor.name,
      connected: this.isConnected,
      connectionInfo: this.connectionInfo
    };
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.serialInterface) {
      this.serialInterface.cleanup();
    }
    this.removeAllListeners();
  }
}