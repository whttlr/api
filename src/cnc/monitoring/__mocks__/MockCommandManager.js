/**
 * Mock Command Manager
 * 
 * Provides a mock implementation of CommandManager for testing
 * monitoring components without real hardware dependencies.
 */

export class MockCommandManager {
  constructor() {
    this.isConnected = true;
    this.mockResponses = new Map();
    this.mockErrors = new Map();
    this.mockDelay = 0;
    this.callCounts = new Map();
    this.commandHistory = [];
  }

  /**
   * Set mock response for a command
   */
  setMockResponse(command, response) {
    this.mockResponses.set(command, response);
  }

  /**
   * Set mock error for a command
   */
  setMockError(command, error) {
    this.mockErrors.set(command, error);
  }

  /**
   * Set mock delay for all commands
   */
  setMockDelay(delay) {
    this.mockDelay = delay;
  }

  /**
   * Get call count for a command
   */
  getCallCount(command) {
    return this.callCounts.get(command) || 0;
  }

  /**
   * Get command history
   */
  getCommandHistory() {
    return [...this.commandHistory];
  }

  /**
   * Send command (mocked)
   */
  async sendCommand(command, options = {}) {
    // Record call
    this.callCounts.set(command, (this.callCounts.get(command) || 0) + 1);
    this.commandHistory.push({
      command,
      timestamp: Date.now(),
      options
    });

    // Apply delay if set
    if (this.mockDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.mockDelay));
    }

    // Check for mock error
    if (this.mockErrors.has(command)) {
      throw this.mockErrors.get(command);
    }

    // Return mock response
    if (this.mockResponses.has(command)) {
      return this.mockResponses.get(command);
    }

    // Default response
    return { response: 'ok', command };
  }

  /**
   * Send immediate command (mocked)
   */
  async sendImmediateCommand(command, options = {}) {
    return this.sendCommand(command, { ...options, immediate: true });
  }

  /**
   * Query status (mocked)
   */
  async queryStatus() {
    return this.sendCommand('?');
  }

  /**
   * Query position (mocked)
   */
  async queryPosition() {
    return this.sendCommand('?');
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      port: '/dev/mock',
      baudRate: 115200
    };
  }

  /**
   * Connect (mocked)
   */
  async connect(port, options = {}) {
    this.isConnected = true;
    return { success: true, port };
  }

  /**
   * Disconnect (mocked)
   */
  async disconnect() {
    this.isConnected = false;
    return { success: true };
  }

  /**
   * Reset mock state
   */
  reset() {
    this.mockResponses.clear();
    this.mockErrors.clear();
    this.callCounts.clear();
    this.commandHistory = [];
    this.mockDelay = 0;
    this.isConnected = true;
  }

  /**
   * Set connection state
   */
  setConnected(connected) {
    this.isConnected = connected;
  }
}