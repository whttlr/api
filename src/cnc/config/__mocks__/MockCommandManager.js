/**
 * Mock Command Manager for Config Testing
 * 
 * Provides a mock implementation of CommandManager specifically
 * tailored for configuration and GRBL settings testing scenarios.
 */

import { EventEmitter } from 'events';

export class MockCommandManager extends EventEmitter {
  constructor() {
    super();
    
    this.isConnected = true;
    this.mockResponses = new Map();
    this.mockErrors = new Map();
    this.mockDelay = 0;
    this.sentCommands = [];
    
    // GRBL-specific mock data
    this.mockGrblSettings = new Map();
    this.defaultGrblSettings = {
      '$0': '10',        // Step pulse time
      '$1': '25',        // Step idle delay  
      '$2': '0',         // Step pulse invert
      '$3': '0',         // Step direction invert
      '$4': '0',         // Invert step enable pin
      '$5': '0',         // Invert limit pins
      '$6': '0',         // Invert probe pin
      '$10': '1',        // Status report options
      '$11': '0.010',    // Junction deviation
      '$12': '0.002',    // Arc tolerance
      '$13': '0',        // Report in inches
      '$20': '0',        // Soft limits enabled
      '$21': '0',        // Hard limits enabled
      '$22': '0',        // Homing cycle enabled
      '$23': '0',        // Homing direction invert
      '$24': '25.000',   // Homing locate feed rate
      '$25': '500.000',  // Homing search seek rate
      '$26': '250',      // Homing switch debounce delay
      '$27': '1.000',    // Homing switch pull-off distance
      '$30': '1000',     // Maximum spindle speed
      '$31': '0',        // Minimum spindle speed
      '$32': '0',        // Laser-mode enable
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
    
    // Initialize with default settings
    Object.entries(this.defaultGrblSettings).forEach(([key, value]) => {
      this.mockGrblSettings.set(key, value);
    });
  }

  /**
   * Set mock GRBL settings
   */
  setMockGrblSettings(settings) {
    Object.entries(settings).forEach(([key, value]) => {
      this.mockGrblSettings.set(key, value);
    });
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
   * Get sent commands history
   */
  getSentCommands() {
    return [...this.sentCommands];
  }

  /**
   * Get last sent command
   */
  getSentCommand() {
    return this.sentCommands[this.sentCommands.length - 1];
  }

  /**
   * Send command (mocked)
   */
  async sendCommand(command, options = {}) {
    // Record sent command
    this.sentCommands.push(command);

    // Apply delay if set
    if (this.mockDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.mockDelay));
    }

    // Check for mock error
    if (this.mockErrors.has(command)) {
      throw this.mockErrors.get(command);
    }

    // Handle GRBL settings queries
    if (command === '$$') {
      return this.handleSettingsQuery();
    }

    // Handle individual setting queries
    if (command.startsWith('$') && !command.includes('=')) {
      return this.handleSingleSettingQuery(command);
    }

    // Handle setting updates
    if (command.includes('=')) {
      return this.handleSettingUpdate(command);
    }

    // Return mock response if available
    if (this.mockResponses.has(command)) {
      return this.mockResponses.get(command);
    }

    // Default response
    return { response: 'ok', command };
  }

  /**
   * Handle GRBL settings query ($$)
   */
  handleSettingsQuery() {
    const settingsArray = [];
    for (const [key, value] of this.mockGrblSettings.entries()) {
      settingsArray.push(`${key}=${value}`);
    }
    
    return {
      response: 'ok',
      data: settingsArray.join('\r\n'),
      settings: Object.fromEntries(this.mockGrblSettings)
    };
  }

  /**
   * Handle single setting query
   */
  handleSingleSettingQuery(setting) {
    const value = this.mockGrblSettings.get(setting);
    if (value !== undefined) {
      return {
        response: 'ok',
        data: `${setting}=${value}`,
        value
      };
    } else {
      throw new Error(`Unknown setting: ${setting}`);
    }
  }

  /**
   * Handle setting update
   */
  handleSettingUpdate(command) {
    const [setting, value] = command.split('=');
    
    if (!setting.startsWith('$')) {
      throw new Error(`Invalid setting format: ${command}`);
    }

    // Validate setting exists
    if (!this.mockGrblSettings.has(setting)) {
      throw new Error(`Unknown setting: ${setting}`);
    }

    // Update the setting
    this.mockGrblSettings.set(setting, value);

    this.emit('settingUpdated', {
      setting,
      value,
      command
    });

    return {
      response: 'ok',
      setting,
      value,
      updated: true
    };
  }

  /**
   * Send immediate command (mocked)
   */
  async sendImmediateCommand(command, options = {}) {
    return this.sendCommand(command, { ...options, immediate: true });
  }

  /**
   * Query all GRBL settings
   */
  async queryGrblSettings() {
    return this.sendCommand('$$');
  }

  /**
   * Query specific GRBL setting
   */
  async queryGrblSetting(setting) {
    return this.sendCommand(setting);
  }

  /**
   * Update GRBL setting
   */
  async updateGrblSetting(setting, value) {
    return this.sendCommand(`${setting}=${value}`);
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
   * Simulate GRBL reset
   */
  async resetGrbl() {
    // Reset settings to defaults
    this.mockGrblSettings.clear();
    Object.entries(this.defaultGrblSettings).forEach(([key, value]) => {
      this.mockGrblSettings.set(key, value);
    });

    this.emit('grblReset');
    return { response: 'ok', reset: true };
  }

  /**
   * Simulate communication error
   */
  simulateCommError(duration = 1000) {
    const originalConnected = this.isConnected;
    this.isConnected = false;
    this.setMockError('$$', new Error('Communication timeout'));
    
    setTimeout(() => {
      this.isConnected = originalConnected;
      this.mockErrors.delete('$$');
      this.emit('communicationRestored');
    }, duration);
    
    this.emit('communicationError', new Error('Communication timeout'));
  }

  /**
   * Get current mock GRBL settings
   */
  getCurrentMockSettings() {
    return Object.fromEntries(this.mockGrblSettings);
  }

  /**
   * Set specific GRBL setting value
   */
  setMockSettingValue(setting, value) {
    this.mockGrblSettings.set(setting, value);
  }

  /**
   * Get specific GRBL setting value
   */
  getMockSettingValue(setting) {
    return this.mockGrblSettings.get(setting);
  }

  /**
   * Reset mock state
   */
  reset() {
    this.mockResponses.clear();
    this.mockErrors.clear();
    this.sentCommands = [];
    this.mockDelay = 0;
    this.isConnected = true;
    
    // Reset GRBL settings to defaults
    this.mockGrblSettings.clear();
    Object.entries(this.defaultGrblSettings).forEach(([key, value]) => {
      this.mockGrblSettings.set(key, value);
    });
  }

  /**
   * Set connection state
   */
  setConnected(connected) {
    this.isConnected = connected;
  }

  /**
   * Clear sent commands history
   */
  clearSentCommands() {
    this.sentCommands = [];
  }
}