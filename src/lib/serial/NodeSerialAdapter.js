/**
 * Node.js SerialPort Adapter
 * 
 * Adapter that implements SerialInterface using Node.js SerialPort library.
 * Maintains all existing ReadlineParser functionality while providing a 
 * unified interface for the abstraction layer.
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { SerialInterface } from './SerialInterface.js';
import { debug, error } from '../logger/LoggerService.js';

export class NodeSerialAdapter extends SerialInterface {
  constructor() {
    super();
    this.port = null;
    this.parser = null;
  }

  /**
   * Connect to a serial port using Node.js SerialPort
   * @param {string} portPath - Path to serial port (e.g., '/dev/ttyUSB0')
   * @param {number} baudRate - Baud rate for connection
   * @returns {Promise<void>}
   */
  async connect(portPath, baudRate = 115200) {
    return new Promise((resolve, reject) => {
      try {
        debug(`NodeSerialAdapter: Connecting to ${portPath} at ${baudRate} baud`);

        // Create SerialPort instance with proper configuration
        this.port = new SerialPort({
          path: portPath,
          baudRate: baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          autoOpen: false
        });

        // Set up ReadlineParser - maintains existing functionality
        this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));

        // Set up event handlers
        this.port.on('open', () => {
          this.isConnected = true;
          this.connectionInfo = {
            portPath,
            baudRate,
            connectedAt: new Date(),
            adapter: 'NodeSerialAdapter'
          };

          debug(`NodeSerialAdapter: Connected successfully to ${portPath}`);
          this.emit('connect', this.connectionInfo);
          resolve();
        });

        this.port.on('error', (err) => {
          error(`NodeSerialAdapter: Port error on ${portPath}`, err);
          this.isConnected = false;
          this.emit('error', err);
          reject(err);
        });

        this.port.on('close', () => {
          debug(`NodeSerialAdapter: Port closed ${portPath}`);
          this.isConnected = false;
          this.emit('disconnect');
        });

        // Set up data handling with ReadlineParser
        this.parser.on('data', (data) => {
          // Clean data - remove carriage returns and trim whitespace
          const cleanedData = data.replace(/\r/g, '').trim();
          
          if (cleanedData.length > 0) {
            debug(`NodeSerialAdapter: Received data: ${cleanedData}`);
            this.emit('data', cleanedData);
          }
        });

        // Open the port
        this.port.open();

      } catch (err) {
        error('NodeSerialAdapter: Error during connection setup', err);
        this.isConnected = false;
        reject(err);
      }
    });
  }

  /**
   * Disconnect from the serial port
   * @returns {Promise<void>}
   */
  async disconnect() {
    return new Promise((resolve) => {
      if (!this.port || !this.port.isOpen) {
        debug('NodeSerialAdapter: Already disconnected or no port available');
        this.isConnected = false;
        resolve();
        return;
      }

      debug('NodeSerialAdapter: Disconnecting from port');

      this.port.close((err) => {
        if (err) {
          error('NodeSerialAdapter: Error during disconnect', err);
        } else {
          debug('NodeSerialAdapter: Disconnected successfully');
        }

        this.isConnected = false;
        this.connectionInfo = null;
        this.port = null;
        this.parser = null;

        resolve();
      });
    });
  }

  /**
   * Write data to the serial port
   * @param {string} data - Data to write
   * @returns {Promise<void>}
   */
  async write(data) {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.port.isOpen) {
        const error = new Error('NodeSerialAdapter: Port not connected');
        reject(error);
        return;
      }

      // Ensure data ends with newline for GRBL compatibility
      const dataToSend = data.endsWith('\n') ? data : data + '\n';

      debug(`NodeSerialAdapter: Writing data: ${data}`);

      this.port.write(dataToSend, (err) => {
        if (err) {
          error('NodeSerialAdapter: Error writing data', err);
          reject(err);
        } else {
          debug(`NodeSerialAdapter: Data written successfully: ${data}`);
          resolve();
        }
      });
    });
  }

  /**
   * List available serial ports
   * @returns {Promise<Array>} Array of port information objects
   */
  async listPorts() {
    try {
      debug('NodeSerialAdapter: Listing available ports');
      const ports = await SerialPort.list();
      
      const portList = ports.map(port => ({
        path: port.path,
        manufacturer: port.manufacturer || 'Unknown',
        serialNumber: port.serialNumber || 'Unknown',
        vendorId: port.vendorId || 'Unknown',
        productId: port.productId || 'Unknown',
        adapter: 'NodeSerialAdapter'
      }));

      debug(`NodeSerialAdapter: Found ${portList.length} ports`);
      return portList;

    } catch (err) {
      error('NodeSerialAdapter: Error listing ports', err);
      return [];
    }
  }

  /**
   * Get the raw SerialPort instance for backward compatibility
   * @returns {SerialPort|null} The raw SerialPort instance
   */
  getRawPort() {
    return this.port;
  }

  /**
   * Get the ReadlineParser instance for backward compatibility
   * @returns {ReadlineParser|null} The parser instance
   */
  getParser() {
    return this.parser;
  }

  /**
   * Check if the port is currently open
   * @returns {boolean} True if port is open
   */
  isPortOpen() {
    return this.port && this.port.isOpen;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.parser) {
      this.parser.removeAllListeners();
    }
    if (this.port) {
      this.port.removeAllListeners();
    }
    super.cleanup();
  }
}