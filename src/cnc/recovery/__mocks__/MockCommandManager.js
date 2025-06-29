/**
 * Mock Command Manager for Recovery Testing
 * 
 * Provides a mock implementation of CommandManager specifically
 * tailored for testing recovery scenarios and alarm handling.
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
    
    // Machine state simulation
    this.machineState = {
      state: 'IDLE',
      position: { x: 0, y: 0, z: 0 },
      workOffset: { x: 0, y: 0, z: 0 },
      spindle: { running: false, speed: 0 },
      coolant: false,
      isHomed: false,
      alarmState: null
    };
    
    // Default GRBL responses
    this.defaultResponses = {
      '$H': 'ok',           // Homing
      '?': this.generateStatusResponse(),
      'G0': 'ok',           // Rapid positioning
      'G1': 'ok',           // Linear interpolation
      'M3': 'ok',           // Spindle on
      'M5': 'ok',           // Spindle off
      'M8': 'ok',           // Coolant on
      'M9': 'ok',           // Coolant off
      '$X': 'ok',           // Unlock
      '\x18': 'ok'          // Soft reset (Ctrl-X)
    };
  }

  /**
   * Set connection state
   */
  setConnected(connected) {
    this.isConnected = connected;
    if (connected) {
      this.emit('connected');
    } else {
      this.emit('disconnected');
    }
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
   * Clear sent commands history
   */
  clearSentCommands() {
    this.sentCommands = [];
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

    // Check if not connected
    if (!this.isConnected) {
      throw new Error('Machine not connected');
    }

    // Check for mock error
    if (this.mockErrors.has(command)) {
      throw this.mockErrors.get(command);
    }

    // Handle specific commands
    const response = await this.handleSpecificCommand(command);
    if (response) {
      return response;
    }

    // Check for mock response
    if (this.mockResponses.has(command)) {
      return this.mockResponses.get(command);
    }

    // Check default responses
    const cmdBase = command.split(' ')[0]; // Get command without parameters
    if (this.defaultResponses[cmdBase]) {
      return this.defaultResponses[cmdBase];
    }

    // Default response
    return 'ok';
  }

  /**
   * Handle specific commands with state changes
   */
  async handleSpecificCommand(command) {
    const cmd = command.trim();

    // Homing command
    if (cmd === '$H') {
      this.machineState.isHomed = true;
      this.machineState.position = { x: 0, y: 0, z: 0 };
      this.machineState.state = 'IDLE';
      this.machineState.alarmState = null;
      this.emit('homingComplete');
      return 'ok';
    }

    // Unlock command
    if (cmd === '$X') {
      this.machineState.state = 'IDLE';
      this.machineState.alarmState = null;
      this.emit('unlocked');
      return 'ok';
    }

    // Soft reset
    if (cmd === '\x18') {
      this.machineState.state = 'IDLE';
      this.machineState.alarmState = null;
      this.machineState.spindle = { running: false, speed: 0 };
      this.machineState.coolant = false;
      this.emit('softReset');
      return 'ok';
    }

    // Status query
    if (cmd === '?') {
      return this.generateStatusResponse();
    }

    // Movement commands
    if (cmd.startsWith('G0') || cmd.startsWith('G1')) {
      this.handleMovementCommand(cmd);
      return 'ok';
    }

    // Spindle commands
    if (cmd.startsWith('M3') || cmd.startsWith('M4')) {
      const speedMatch = cmd.match(/S(\d+)/);
      this.machineState.spindle = {
        running: true,
        speed: speedMatch ? parseInt(speedMatch[1]) : 0
      };
      this.emit('spindleStateChanged', this.machineState.spindle);
      return 'ok';
    }

    if (cmd === 'M5') {
      this.machineState.spindle = { running: false, speed: 0 };
      this.emit('spindleStateChanged', this.machineState.spindle);
      return 'ok';
    }

    // Coolant commands
    if (cmd === 'M8') {
      this.machineState.coolant = true;
      this.emit('coolantStateChanged', true);
      return 'ok';
    }

    if (cmd === 'M9') {
      this.machineState.coolant = false;
      this.emit('coolantStateChanged', false);
      return 'ok';
    }

    return null; // Let default handling take over
  }

  /**
   * Handle movement commands and update position
   */
  handleMovementCommand(command) {
    const xMatch = command.match(/X([-\d.]+)/);
    const yMatch = command.match(/Y([-\d.]+)/);
    const zMatch = command.match(/Z([-\d.]+)/);

    if (xMatch) this.machineState.position.x = parseFloat(xMatch[1]);
    if (yMatch) this.machineState.position.y = parseFloat(yMatch[1]);
    if (zMatch) this.machineState.position.z = parseFloat(zMatch[1]);

    this.emit('positionChanged', { ...this.machineState.position });
  }

  /**
   * Generate status response based on current machine state
   */
  generateStatusResponse() {
    const pos = this.machineState.position;
    const state = this.machineState.state;
    const spindle = this.machineState.spindle;
    
    let statusString = `<${state}|MPos:${pos.x},${pos.y},${pos.z}`;
    
    if (spindle.running) {
      statusString += `|S:${spindle.speed}`;
    }
    
    statusString += '>';
    
    return {
      response: 'status',
      data: statusString,
      parsed: {
        state,
        position: { ...pos },
        spindle: { ...spindle },
        coolant: this.machineState.coolant
      }
    };
  }

  /**
   * Simulate alarm condition
   */
  simulateAlarm(alarmCode, message = '') {
    this.machineState.state = 'ALARM';
    this.machineState.alarmState = {
      code: alarmCode,
      message: message || this.getAlarmMessage(alarmCode)
    };
    
    this.emit('alarm', {
      code: alarmCode,
      message: this.machineState.alarmState.message
    });
  }

  /**
   * Get alarm message for code
   */
  getAlarmMessage(code) {
    const alarmMessages = {
      1: 'Hard limit triggered',
      2: 'Soft limit exceeded',
      3: 'Abort cycle',
      4: 'Probe fail initial',
      5: 'Probe fail contact',
      8: 'Homing fail reset',
      9: 'Homing fail door'
    };
    
    return alarmMessages[code] || `Unknown alarm ${code}`;
  }

  /**
   * Clear alarm state
   */
  clearAlarm() {
    this.machineState.alarmState = null;
    if (this.machineState.state === 'ALARM') {
      this.machineState.state = 'IDLE';
    }
    this.emit('alarmCleared');
  }

  /**
   * Simulate communication error
   */
  simulateCommError(duration = 1000) {
    const originalConnected = this.isConnected;
    this.isConnected = false;
    this.emit('communicationError', new Error('Communication timeout'));
    
    setTimeout(() => {
      this.isConnected = originalConnected;
      this.emit('communicationRestored');
    }, duration);
  }

  /**
   * Simulate buffer overflow
   */
  simulateBufferOverflow() {
    this.emit('bufferOverflow', new Error('Buffer overflow'));
  }

  /**
   * Get current machine state
   */
  getMachineState() {
    return { ...this.machineState };
  }

  /**
   * Set machine state (for testing)
   */
  setMachineState(state) {
    this.machineState = { ...this.machineState, ...state };
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
   * Send immediate command (mocked)
   */
  async sendImmediateCommand(command, options = {}) {
    return this.sendCommand(command, { ...options, immediate: true });
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
    
    // Reset machine state
    this.machineState = {
      state: 'IDLE',
      position: { x: 0, y: 0, z: 0 },
      workOffset: { x: 0, y: 0, z: 0 },
      spindle: { running: false, speed: 0 },
      coolant: false,
      isHomed: false,
      alarmState: null
    };
  }

  /**
   * Simulate rapid movement for testing
   */
  async simulateRapidMovement(target, duration = 100) {
    const steps = 10;
    const stepTime = duration / steps;
    const start = { ...this.machineState.position };
    
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      this.machineState.position = {
        x: start.x + (target.x - start.x) * progress,
        y: start.y + (target.y - start.y) * progress,
        z: start.z + (target.z - start.z) * progress
      };
      
      this.emit('positionChanged', { ...this.machineState.position });
      await new Promise(resolve => setTimeout(resolve, stepTime));
    }
  }

  /**
   * Simulate homing sequence
   */
  async simulateHomingSequence(duration = 500) {
    this.machineState.state = 'HOME';
    this.emit('homingStarted');
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    this.machineState.isHomed = true;
    this.machineState.position = { x: 0, y: 0, z: 0 };
    this.machineState.state = 'IDLE';
    this.emit('homingComplete');
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      sentCommands: this.sentCommands,
      machineState: this.machineState,
      isConnected: this.isConnected,
      mockResponses: Object.fromEntries(this.mockResponses),
      mockErrors: Object.fromEntries(this.mockErrors)
    };
  }
}