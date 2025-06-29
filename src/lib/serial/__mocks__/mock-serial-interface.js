/**
 * Mock Serial Interface for Testing
 * 
 * Provides a complete mock implementation of SerialInterface for testing
 * both NodeSerialAdapter and WebSerialAdapter functionality.
 */

import { EventEmitter } from 'events';

export class MockSerialInterface extends EventEmitter {
  constructor(options = {}) {
    super();
    this.isConnected = false;
    this.connectionInfo = null;
    this.writtenData = [];
    this.mockResponses = [];
    this.responseDelay = options.responseDelay || 10;
    this.shouldFailConnection = options.shouldFailConnection || false;
    this.shouldFailWrite = options.shouldFailWrite || false;
    this.mockPorts = options.mockPorts || [
      { path: '/dev/ttyUSB0', manufacturer: 'Test Manufacturer', adapter: 'MockAdapter' },
      { path: '/dev/ttyACM0', manufacturer: 'Arduino', adapter: 'MockAdapter' }
    ];
  }

  async connect(portPath, baudRate = 115200) {
    if (this.shouldFailConnection) {
      throw new Error('Mock connection failure');
    }

    this.isConnected = true;
    this.connectionInfo = {
      portPath,
      baudRate,
      connectedAt: new Date(),
      adapter: 'MockSerialInterface'
    };

    // Simulate async connection
    setTimeout(() => {
      this.emit('connect', this.connectionInfo);
    }, 5);

    return Promise.resolve();
  }

  async disconnect() {
    if (!this.isConnected) {
      return Promise.resolve();
    }

    this.isConnected = false;
    this.connectionInfo = null;

    // Simulate async disconnection
    setTimeout(() => {
      this.emit('disconnect');
    }, 5);

    return Promise.resolve();
  }

  async write(data) {
    if (!this.isConnected) {
      throw new Error('Mock serial interface not connected');
    }

    if (this.shouldFailWrite) {
      throw new Error('Mock write failure');
    }

    // Store written data for verification
    this.writtenData.push({
      data: data,
      timestamp: Date.now()
    });

    // Simulate response after delay
    setTimeout(() => {
      this.simulateResponse(data);
    }, this.responseDelay);

    return Promise.resolve();
  }

  async listPorts() {
    return Promise.resolve([...this.mockPorts]);
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      connectionInfo: this.connectionInfo
    };
  }

  // Mock-specific methods for testing

  /**
   * Add a mock response for the next command
   */
  addMockResponse(response) {
    this.mockResponses.push(response);
  }

  /**
   * Add multiple mock responses
   */
  addMockResponses(responses) {
    this.mockResponses.push(...responses);
  }

  /**
   * Simulate receiving data
   */
  simulateData(data) {
    if (this.isConnected) {
      this.emit('data', data);
    }
  }

  /**
   * Simulate an error
   */
  simulateError(error) {
    this.emit('error', error);
  }

  /**
   * Simulate automatic response based on command
   */
  simulateResponse(command) {
    let response;

    // Use queued mock response if available
    if (this.mockResponses.length > 0) {
      response = this.mockResponses.shift();
    } else {
      // Generate automatic response based on command
      response = this.generateAutoResponse(command);
    }

    if (response) {
      this.simulateData(response);
    }
  }

  /**
   * Generate automatic responses for common G-code commands
   */
  generateAutoResponse(command) {
    const cleanCommand = command.trim().toLowerCase();

    if (cleanCommand === '?') {
      return '<Idle|MPos:0.000,0.000,0.000|FS:0,0>';
    } else if (cleanCommand === '$h') {
      return 'ok';
    } else if (cleanCommand === '$x') {
      return 'ok';
    } else if (cleanCommand.startsWith('g0') || cleanCommand.startsWith('g1')) {
      return 'ok';
    } else if (cleanCommand.startsWith('g4')) {
      return 'ok';
    } else if (cleanCommand === '$$') {
      return '$0=10 (Step pulse time, microseconds)';
    } else if (cleanCommand.startsWith('$')) {
      return 'ok';
    } else {
      return 'ok';
    }
  }

  /**
   * Get all data that was written to this mock interface
   */
  getWrittenData() {
    return [...this.writtenData];
  }

  /**
   * Clear written data history
   */
  clearWrittenData() {
    this.writtenData = [];
  }

  /**
   * Set response delay for testing timing
   */
  setResponseDelay(delay) {
    this.responseDelay = delay;
  }

  /**
   * Configure mock to fail next connection attempt
   */
  setConnectionFailure(shouldFail) {
    this.shouldFailConnection = shouldFail;
  }

  /**
   * Configure mock to fail next write attempt
   */
  setWriteFailure(shouldFail) {
    this.shouldFailWrite = shouldFail;
  }

  /**
   * Reset mock to initial state
   */
  reset() {
    this.isConnected = false;
    this.connectionInfo = null;
    this.writtenData = [];
    this.mockResponses = [];
    this.shouldFailConnection = false;
    this.shouldFailWrite = false;
    this.removeAllListeners();
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.reset();
  }

  // Compatibility methods for different adapter types

  /**
   * Mock getRawPort for NodeSerialAdapter compatibility
   */
  getRawPort() {
    return {
      path: this.connectionInfo?.portPath || '/dev/mock',
      isOpen: this.isConnected,
      write: (data, callback) => {
        this.write(data)
          .then(() => callback && callback())
          .catch(err => callback && callback(err));
      }
    };
  }

  /**
   * Mock getPortInfo for WebSerialAdapter compatibility
   */
  getPortInfo() {
    return {
      usbVendorId: 0x1234,
      usbProductId: 0x5678
    };
  }
}