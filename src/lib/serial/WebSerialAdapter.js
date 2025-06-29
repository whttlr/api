/**
 * Web Serial API Adapter
 * 
 * Adapter that implements SerialInterface using Web Serial API.
 * Provides the same functionality as NodeSerialAdapter but for browser environments.
 * Manually implements ReadlineParser functionality for line-based communication.
 */

import { SerialInterface } from './SerialInterface.js';
import { debug } from '../logger/LoggerService.js';

export class WebSerialAdapter extends SerialInterface {
  constructor() {
    super();
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.readLoop = false;
    this.readBuffer = '';
  }

  /**
   * Connect to a serial port using Web Serial API
   * @param {object} portOptions - Options for port selection and connection
   * @returns {Promise<void>}
   */
  async connect(portOptions = {}) {
    try {
      // Check Web Serial API support
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser');
      }

      debug('WebSerialAdapter: Requesting port selection');

      // Request port from user with filters for common CNC controllers
      const requestOptions = {
        filters: [
          { usbVendorId: 0x1a86 }, // CH340/CH341 chips (common on Arduino clones)
          { usbVendorId: 0x0403 }, // FTDI chips
          { usbVendorId: 0x10c4 }, // CP210x chips
          { usbVendorId: 0x2341 }, // Arduino
          ...((portOptions.filters || []))
        ]
      };

      this.port = await navigator.serial.requestPort(requestOptions);

      // Open the port with connection options
      const connectionOptions = {
        baudRate: portOptions.baudRate || 115200,
        dataBits: portOptions.dataBits || 8,
        stopBits: portOptions.stopBits || 1,
        parity: portOptions.parity || 'none',
        flowControl: portOptions.flowControl || 'none',
        ...portOptions
      };

      console.log(`WebSerialAdapter: Opening port with options:`, connectionOptions);
      await this.port.open(connectionOptions);

      // Set up reader and writer
      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();

      this.isConnected = true;
      this.connectionInfo = {
        portInfo: this.port.getInfo(),
        connectionOptions,
        connectedAt: new Date(),
        adapter: 'WebSerialAdapter'
      };

      console.log('WebSerialAdapter: Connected successfully');

      // Start the read loop
      this.startReadLoop();

      this.emit('connect', this.connectionInfo);

    } catch (err) {
      console.error('WebSerialAdapter: Error during connection', err);
      this.isConnected = false;
      throw err;
    }
  }

  /**
   * Connect to a previously authorized port by index
   * @param {number} portIndex - Index of the port in getPorts() array
   * @param {object} connectionOptions - Connection options
   * @returns {Promise<void>}
   */
  async connectToAuthorizedPort(portIndex = 0, connectionOptions = {}) {
    try {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial API not supported in this browser');
      }

      const ports = await navigator.serial.getPorts();
      if (ports.length === 0) {
        throw new Error('No authorized ports available. Use connect() to authorize a port first.');
      }

      if (portIndex >= ports.length) {
        throw new Error(`Port index ${portIndex} not available. Only ${ports.length} ports authorized.`);
      }

      this.port = ports[portIndex];

      const options = {
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        ...connectionOptions
      };

      console.log(`WebSerialAdapter: Connecting to authorized port ${portIndex}`, options);
      await this.port.open(options);

      this.reader = this.port.readable.getReader();
      this.writer = this.port.writable.getWriter();

      this.isConnected = true;
      this.connectionInfo = {
        portInfo: this.port.getInfo(),
        connectionOptions: options,
        connectedAt: new Date(),
        adapter: 'WebSerialAdapter'
      };

      this.startReadLoop();
      this.emit('connect', this.connectionInfo);

    } catch (err) {
      console.error('WebSerialAdapter: Error connecting to authorized port', err);
      this.isConnected = false;
      throw err;
    }
  }

  /**
   * Disconnect from the serial port
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      console.log('WebSerialAdapter: Disconnecting');

      // Stop read loop
      this.readLoop = false;

      // Cancel and release reader
      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch (err) {
          // Reader may already be cancelled
          console.warn('WebSerialAdapter: Reader cancel error (expected)', err.message);
        }
        this.reader.releaseLock();
        this.reader = null;
      }

      // Release writer
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      // Close port
      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      this.isConnected = false;
      this.connectionInfo = null;
      this.readBuffer = '';

      console.log('WebSerialAdapter: Disconnected successfully');
      this.emit('disconnect');

    } catch (err) {
      console.error('WebSerialAdapter: Error during disconnect', err);
      throw err;
    }
  }

  /**
   * Write data to the serial port
   * @param {string} data - Data to write
   * @returns {Promise<void>}
   */
  async write(data) {
    try {
      if (!this.writer) {
        throw new Error('WebSerialAdapter: Port not connected or writer not available');
      }

      // Ensure data ends with newline for GRBL compatibility
      const dataToSend = data.endsWith('\n') ? data : data + '\n';

      console.log(`WebSerialAdapter: Writing data: ${data}`);

      const encoder = new TextEncoder();
      await this.writer.write(encoder.encode(dataToSend));

      console.log(`WebSerialAdapter: Data written successfully: ${data}`);

    } catch (err) {
      console.error('WebSerialAdapter: Error writing data', err);
      throw err;
    }
  }

  /**
   * List available (previously authorized) serial ports
   * @returns {Promise<Array>} Array of port information objects
   */
  async listPorts() {
    try {
      if (!('serial' in navigator)) {
        console.warn('WebSerialAdapter: Web Serial API not supported');
        return [];
      }

      console.log('WebSerialAdapter: Listing authorized ports');
      const ports = await navigator.serial.getPorts();

      const portList = ports.map((port, index) => {
        const info = port.getInfo();
        return {
          path: `web-serial-${index}`,
          index: index,
          usbVendorId: info.usbVendorId,
          usbProductId: info.usbProductId,
          manufacturer: 'Unknown', // Web Serial API doesn't provide manufacturer name
          serialNumber: 'Unknown', // Web Serial API doesn't provide serial number
          adapter: 'WebSerialAdapter',
          port: port // Keep reference to actual port object
        };
      });

      console.log(`WebSerialAdapter: Found ${portList.length} authorized ports`);
      return portList;

    } catch (err) {
      console.error('WebSerialAdapter: Error listing ports', err);
      return [];
    }
  }

  /**
   * Start the read loop to handle incoming data
   * Implements ReadlineParser functionality manually
   */
  async startReadLoop() {
    this.readLoop = true;
    const decoder = new TextDecoder();

    console.log('WebSerialAdapter: Starting read loop');

    try {
      while (this.readLoop && this.reader) {
        const { value, done } = await this.reader.read();

        if (done) {
          console.log('WebSerialAdapter: Read loop completed (port closed)');
          break;
        }

        // Decode incoming data and add to buffer
        this.readBuffer += decoder.decode(value, { stream: true });

        // Process complete lines (equivalent to ReadlineParser with delimiter '\n')
        this.processReadBuffer();
      }
    } catch (err) {
      if (this.readLoop) {
        // Only emit error if we're still supposed to be reading
        console.error('WebSerialAdapter: Read loop error', err);
        this.emit('error', err);
      }
    }

    console.log('WebSerialAdapter: Read loop ended');
  }

  /**
   * Process the read buffer to extract complete lines
   * Mimics ReadlineParser behavior
   */
  processReadBuffer() {
    // Split buffer by newlines
    const lines = this.readBuffer.split('\n');
    
    // Keep the last (potentially incomplete) line in the buffer
    this.readBuffer = lines.pop() || '';

    // Process each complete line
    lines.forEach(line => {
      // Clean data - remove carriage returns and trim whitespace
      const cleanedData = line.replace(/\r/g, '').trim();

      if (cleanedData.length > 0) {
        console.log(`WebSerialAdapter: Received data: ${cleanedData}`);
        this.emit('data', cleanedData);
      }
    });
  }

  /**
   * Get port connection information
   * @returns {object|null} Port information or null if not connected
   */
  getPortInfo() {
    return this.port ? this.port.getInfo() : null;
  }

  /**
   * Check if the port is currently open
   * @returns {boolean} True if port is connected and readable/writable
   */
  isPortOpen() {
    return this.isConnected && this.port && this.reader && this.writer;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.readLoop = false;
    this.readBuffer = '';
    super.cleanup();
  }
}