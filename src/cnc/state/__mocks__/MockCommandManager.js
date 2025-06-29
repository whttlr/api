/**
 * Mock Command Manager for State Testing
 * 
 * Provides a mock implementation of CommandManager specifically
 * tailored for state synchronization testing scenarios.
 */

import { EventEmitter } from 'events';

export class MockCommandManager extends EventEmitter {
  constructor() {
    super();
    
    this.isConnected = true;
    this.mockResponses = new Map();
    this.mockErrors = new Map();
    this.mockDelay = 0;
    this.callCounts = new Map();
    this.commandHistory = [];
    
    // State-specific mock data
    this.mockState = {
      state: 'Idle',
      mpos: { x: 0, y: 0, z: 0 },
      wpos: { x: 0, y: 0, z: 0 },
      wco: { x: 0, y: 0, z: 0 },
      modal: {
        motion: 'G00',
        plane: 'G17',
        units: 'G21',
        distance: 'G90',
        feedRate: 'G94'
      }
    };
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
   * Clear mock error for a command
   */
  clearMockError(command) {
    this.mockErrors.delete(command);
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
   * Set mock state data for status queries
   */
  setMockStateData(stateData) {
    this.mockState = { ...this.mockState, ...stateData };
    
    // Update status query response
    this.setMockResponse('?', this.mockState);
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

    // Handle status queries
    if (command === '?') {
      return { ...this.mockState };
    }

    // Handle position queries
    if (command === '?' || command.startsWith('?')) {
      return {
        mpos: this.mockState.mpos,
        wpos: this.mockState.wpos,
        wco: this.mockState.wco
      };
    }

    // Handle modal group queries
    if (command === '$G') {
      return { modal: this.mockState.modal };
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
    const result = await this.sendCommand('?');
    return {
      machine: result.mpos,
      work: result.wpos,
      offset: result.wco
    };
  }

  /**
   * Query modal groups (mocked)
   */
  async queryModalGroups() {
    const result = await this.sendCommand('$G');
    return result.modal;
  }

  /**
   * Query machine settings (mocked)
   */
  async querySettings() {
    return {
      '$0': '10',    // Step pulse time
      '$1': '25',    // Step idle delay
      '$2': '0',     // Step pulse invert
      '$3': '0',     // Step direction invert
      '$4': '0',     // Invert step enable pin
      '$5': '0',     // Invert limit pins
      '$6': '0',     // Invert probe pin
      '$10': '1',    // Status report options
      '$11': '0.010', // Junction deviation
      '$12': '0.002', // Arc tolerance
      '$13': '0',    // Report in inches
      '$20': '0',    // Soft limits enabled
      '$21': '0',    // Hard limits enabled
      '$22': '0',    // Homing cycle enabled
      '$23': '0',    // Homing direction invert
      '$24': '25.000', // Homing locate feed rate
      '$25': '500.000', // Homing search seek rate
      '$26': '250',  // Homing switch debounce delay
      '$27': '1.000', // Homing switch pull-off distance
      '$30': '1000', // Maximum spindle speed
      '$31': '0',    // Minimum spindle speed
      '$32': '0',    // Laser-mode enable
      '$100': '250.000', // X-axis travel resolution
      '$101': '250.000', // Y-axis travel resolution
      '$102': '250.000', // Z-axis travel resolution
      '$110': '500.000', // X-axis maximum rate
      '$111': '500.000', // Y-axis maximum rate
      '$112': '500.000', // Z-axis maximum rate
      '$120': '10.000',  // X-axis acceleration
      '$121': '10.000',  // Y-axis acceleration
      '$122': '10.000',  // Z-axis acceleration
      '$130': '200.000', // X-axis maximum travel
      '$131': '200.000', // Y-axis maximum travel
      '$132': '200.000'  // Z-axis maximum travel
    };
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
    this.emit('connected', { port, options });
    return { success: true, port };
  }

  /**
   * Disconnect (mocked)
   */
  async disconnect() {
    this.isConnected = false;
    this.emit('disconnected');
    return { success: true };
  }

  /**
   * Simulate state change
   */
  simulateStateChange(newState) {
    this.mockState.state = newState;
    this.setMockResponse('?', this.mockState);
    this.emit('stateChanged', { state: newState });
  }

  /**
   * Simulate position change
   */
  simulatePositionChange(machinePos, workPos = null) {
    this.mockState.mpos = { ...machinePos };
    
    if (workPos) {
      this.mockState.wpos = { ...workPos };
    } else {
      // Calculate work position from coordinate offset
      this.mockState.wpos = {
        x: machinePos.x - this.mockState.wco.x,
        y: machinePos.y - this.mockState.wco.y,
        z: machinePos.z - this.mockState.wco.z
      };
    }
    
    this.setMockResponse('?', this.mockState);
    this.emit('positionChanged', {
      machine: this.mockState.mpos,
      work: this.mockState.wpos
    });
  }

  /**
   * Simulate coordinate system change
   */
  simulateCoordinateSystemChange(offset) {
    this.mockState.wco = { ...offset };
    
    // Recalculate work position
    this.mockState.wpos = {
      x: this.mockState.mpos.x - offset.x,
      y: this.mockState.mpos.y - offset.y,
      z: this.mockState.mpos.z - offset.z
    };
    
    this.setMockResponse('?', this.mockState);
    this.emit('coordinateSystemChanged', { offset });
  }

  /**
   * Simulate modal group change
   */
  simulateModalGroupChange(group, value) {
    this.mockState.modal[group] = value;
    this.setMockResponse('?', this.mockState);
    this.setMockResponse('$G', { modal: this.mockState.modal });
    this.emit('modalGroupChanged', { group, value });
  }

  /**
   * Simulate communication error
   */
  simulateCommError(duration = 1000) {
    const originalConnected = this.isConnected;
    this.isConnected = false;
    this.setMockError('?', new Error('Communication timeout'));
    
    setTimeout(() => {
      this.isConnected = originalConnected;
      this.clearMockError('?');
      this.emit('communicationRestored');
    }, duration);
    
    this.emit('communicationError', new Error('Communication timeout'));
  }

  /**
   * Get current mock state
   */
  getCurrentMockState() {
    return { ...this.mockState };
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
    
    this.mockState = {
      state: 'Idle',
      mpos: { x: 0, y: 0, z: 0 },
      wpos: { x: 0, y: 0, z: 0 },
      wco: { x: 0, y: 0, z: 0 },
      modal: {
        motion: 'G00',
        plane: 'G17',
        units: 'G21',
        distance: 'G90',
        feedRate: 'G94'
      }
    };
  }

  /**
   * Set connection state
   */
  setConnected(connected) {
    this.isConnected = connected;
  }
}