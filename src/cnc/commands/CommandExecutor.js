/**
 * Command Execution Module
 * 
 * Handles G-code command execution, safety checks, and emergency operations.
 * Updated to use EventLoopCommandManager for improved performance.
 * Maintains backward compatibility with existing API.
 */

import { EventEmitter } from 'events';
import i18n from '../../i18n.js';
import { log, error, warn, info } from '../../lib/logger/LoggerService.js';
import {
  requiresHoming,
  ensureHomed,
  sendRawGcode,
  checkSafeLimits
} from '../../lib/helpers/index.js';
import { EventLoopCommandManager } from '../../lib/commands/index.js';

export class CommandExecutor extends EventEmitter {
  constructor(connectionManager, config) {
    super();
    this.connectionManager = connectionManager;
    this.config = config;
    this.responseCallbacks = new Map(); // Kept for backward compatibility
    this.commandId = 0;
    this.commandManager = null;
    
    // Set up connection event handling
    if (this.connectionManager) {
      this.connectionManager.on('connect', () => {
        this.setupCommandManager();
      });
      
      this.connectionManager.on('disconnect', () => {
        this.cleanupCommandManager();
      });
    }
  }
  
  /**
   * Set up the EventLoopCommandManager when connected
   */
  setupCommandManager() {
    if (this.connectionManager.serialInterface) {
      this.commandManager = new EventLoopCommandManager(
        this.connectionManager.serialInterface,
        {
          ...this.config.eventLoop,
          commandTimeout: this.config.timeouts?.command || 5000
        }
      );
      
      // Forward command manager events
      this.commandManager.on('commandSent', (data) => this.emit('commandSent', data));
      this.commandManager.on('commandResponse', (data) => this.emit('commandResponse', data));
      this.commandManager.on('commandError', (data) => this.emit('commandError', data));
      this.commandManager.on('commandQueued', (data) => this.emit('commandQueued', data));
      
      info('CommandExecutor: EventLoopCommandManager initialized');
    }
  }
  
  /**
   * Clean up the command manager on disconnect
   */
  cleanupCommandManager() {
    if (this.commandManager) {
      this.commandManager.cleanup();
      this.commandManager = null;
      info('CommandExecutor: EventLoopCommandManager cleaned up');
    }
  }

  /**
   * Create a standardized command wrapper for raw G-code sending
   */
  createCommandWrapper(port, isConnected) {
    return (gcode, timeout) => 
      sendRawGcode(port, isConnected, ++this.commandId, this.responseCallbacks, gcode, timeout);
  }

  /**
   * Calculate appropriate timeout for G-code command
   */
  calculateCommandTimeout(gcode, defaultTimeout) {
    // Handle G4 (dwell) commands with special timeout logic
    const g4Match = gcode.match(/G4\s*P(\d+(?:\.\d+)?)/i);
    if (g4Match) {
      const dwellSeconds = parseFloat(g4Match[1]);
      // Add buffer time: dwell time + 5 seconds for processing
      const calculatedTimeout = Math.max((dwellSeconds + 5) * 1000, defaultTimeout);
      info(`CommandExecutor: G4 command detected, dwell=${dwellSeconds}s, timeout=${calculatedTimeout}ms`);
      return calculatedTimeout;
    }
    
    // Handle other potentially long-running commands
    if (gcode.match(/^\s*\$H/i)) { // Homing command
      info(`CommandExecutor: Homing command detected, using extended timeout`);
      return Math.max(30000, defaultTimeout); // 30 seconds for homing
    }
    
    return defaultTimeout;
  }

  /**
   * Send G-code command with automatic homing and safety checks
   * Now uses EventLoopCommandManager for improved performance
   */
  async sendGcode(port, isConnected, gcode, timeoutMs = null) {
    // Handle both old and new calling patterns
    if (typeof port === 'string' && typeof isConnected === 'undefined') {
      // New pattern: sendGcode(gcode, options)
      return this.sendGcodeNew(port, isConnected);
    }
    
    // Legacy pattern: sendGcode(port, isConnected, gcode, timeoutMs)
    return this.sendGcodeLegacy(port, isConnected, gcode, timeoutMs);
  }
  
  /**
   * New sendGcode implementation using EventLoopCommandManager
   * @param {string} gcode - G-code command to send
   * @param {object} options - Command options
   */
  async sendGcodeNew(gcode, options = {}) {
    if (!this.commandManager) {
      throw new Error('EventLoopCommandManager not available. Ensure connection is established.');
    }
    
    const startTime = Date.now();
    const defaultTimeout = options.timeout || this.config.timeouts?.command || 5000;
    const timeout = this.calculateCommandTimeout(gcode, defaultTimeout);
    
    // Validate command
    const validation = this.validateCommand(gcode);
    if (!validation.valid) {
      throw new Error(`Command validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Safety check against machine limits
    const safetyCheck = checkSafeLimits(requiresHoming, gcode);
    if (!safetyCheck.safe) {
      const warningIcon = this.config.ui?.safetyWarningIcon || '⚠️';
      
      warn(i18n.t('commandExecutor.safetyWarning', { icon: warningIcon }));
      safetyCheck.warnings.forEach(warning => warn(i18n.t('commandExecutor.safetyWarningDetail', { warning })));
      warn(i18n.t('commandExecutor.commandCancelled'));
      throw new Error(i18n.t('commandExecutor.unsafeCommandBlocked', { warnings: safetyCheck.warnings.join(', ') }));
    }
    
    // Ensure homing if required (using new command manager)
    if (requiresHoming(gcode)) {
      await ensureHomed((cmd, timeout) => this.commandManager.sendCommand(cmd, { timeout }), log);
    }
    
    try {
      // Execute the command using EventLoopCommandManager
      const response = await this.commandManager.sendCommand(gcode, { timeout });
      const duration = Date.now() - startTime;
      
      if (response.type === 'error') {
        throw new Error(`GRBL Error ${response.code}: ${response.raw}`);
      }
      
      return {
        response: response.raw,
        type: response.type,
        duration,
        success: true
      };
      
    } catch (error) {
      this.emit('commandError', { command: gcode, error });
      throw error;
    }
  }
  
  /**
   * Legacy sendGcode implementation for backward compatibility
   * @deprecated Use sendGcodeNew() or the simplified sendGcode(gcode, options) pattern
   */
  async sendGcodeLegacy(port, isConnected, gcode, timeoutMs = null) {
    warn('CommandExecutor: Using legacy sendGcode pattern. Consider upgrading to new pattern.');
    
    const startTime = Date.now();
    const defaultTimeout = timeoutMs || this.config.timeouts.command;
    const timeout = this.calculateCommandTimeout(gcode, defaultTimeout);
    
    // Safety check against machine limits
    const safetyCheck = checkSafeLimits(requiresHoming, gcode);
    if (!safetyCheck.safe) {
      const warningIcon = this.config.ui?.safetyWarningIcon || '⚠️';
      
      warn(i18n.t('commandExecutor.safetyWarning', { icon: warningIcon }));
      safetyCheck.warnings.forEach(warning => warn(i18n.t('commandExecutor.safetyWarningDetail', { warning })));
      warn(i18n.t('commandExecutor.commandCancelled'));
      throw new Error(i18n.t('commandExecutor.unsafeCommandBlocked', { warnings: safetyCheck.warnings.join(', ') }));
    }
    
    // Ensure homing if required
    if (requiresHoming(gcode)) {
      await ensureHomed(this.createCommandWrapper(port, isConnected), log);
    }
    
    // Execute the command using legacy method
    const result = await sendRawGcode(port, isConnected, ++this.commandId, this.responseCallbacks, gcode, timeout);
    const duration = Date.now() - startTime;
    
    return {
      ...result,
      duration
    };
  }

  /**
   * Emergency stop command
   */
  async emergencyStop(port, isConnected) {
    const emergencyIcon = this.config.ui?.emergencyIcon || '🚨';
    
    // Check if we have a connection and command manager available
    if (!this.commandManager) {
      const errorMsg = 'Cannot execute emergency stop: No active connection to CNC machine';
      error(errorMsg);
      throw new Error(errorMsg);
    }
    
    warn(i18n.t('commandExecutor.emergencyStopInitiated', { icon: emergencyIcon }));
    
    try {
      // Use the EventLoopCommandManager for emergency stop
      const response = await this.commandManager.sendCommand(
        this.config.emergencyStopCommand,
        { timeout: this.config.timeouts.emergency, priority: 'emergency' }
      );
      info(i18n.t('commandExecutor.emergencyStopSuccess', { response: response.raw }));
      return { response: response.raw, success: true };
    } catch (err) {
      error(i18n.t('commandExecutor.emergencyStopFailed', { error: err.message }));
      throw err;
    }
  }

  /**
   * Send multiple commands in sequence
   */
  async sendCommandSequence(port, isConnected, commands, options = {}) {
    const results = [];
    const { stopOnError = false, delayBetween = 0 } = options;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      const commandNumber = i + 1;
      
      try {
        if (this.config.verboseExecution) {
          info(i18n.t('commandExecutor.executingCommand', { commandNumber, totalCommands: commands.length, command }));
        }
        
        const result = await this.sendGcode(port, isConnected, command);
        results.push({
          command,
          commandNumber,
          success: true,
          response: result.response,
          duration: result.duration
        });
        
        // Optional delay between commands
        if (delayBetween > 0 && i < commands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
        
      } catch (error) {
        results.push({
          command,
          commandNumber,
          success: false,
          error: error.message
        });
        
        if (stopOnError) {
          break;
        }
      }
    }
    
    return {
      totalCommands: commands.length,
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }

  /**
   * Execute a single command with retry logic
   */
  async executeWithRetry(port, isConnected, command, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.sendGcode(port, isConnected, command);
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          const retryDelay = this.config.retryDelay || 1000;
          warn(i18n.t('commandExecutor.commandRetry', { retryDelay, attempt, maxRetries }));
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    throw new Error(i18n.t('commandExecutor.commandFailedAfterRetries', { maxRetries, error: lastError.message }));
  }

  /**
   * Validate command before execution
   */
  validateCommand(command) {
    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };
    
    // Check command length
    const maxLength = this.config.validation?.maxCommandLength || 256;
    if (command.length > maxLength) {
      validation.errors.push(i18n.t('commandExecutor.commandTooLong', { length: command.length, maxLength }));
      validation.valid = false;
    }
    
    // Check for valid G-code format
    const gcodeRegex = this.config.validation?.gcodeCommandRegex || /^[GMT]\d+/i;
    if (!gcodeRegex.test(command.trim())) {
      validation.warnings.push(i18n.t('commandExecutor.invalidGcodePrefix'));
    }
    
    // Check for dangerous commands
    const dangerousCommands = this.config.safety?.dangerousCommands || [];
    if (dangerousCommands.some(dangerous => command.toUpperCase().includes(dangerous))) {
      validation.errors.push(i18n.t('commandExecutor.dangerousCommand'));
      validation.valid = false;
    }
    
    return validation;
  }

  /**
   * Get command execution statistics
   */
  getExecutionStats() {
    return {
      totalCommands: this.commandId,
      pendingCommands: this.responseCallbacks.size,
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  /**
   * Calculate average response time from recent commands
   */
  calculateAverageResponseTime() {
    // This would need to be implemented with actual timing data
    // For now, return a placeholder
    return 0;
  }

  /**
   * Clear pending callbacks (for cleanup)
   */
  clearPendingCallbacks() {
    this.responseCallbacks.clear();
  }

  /**
   * Get response callbacks map (for external handlers)
   */
  getResponseCallbacks() {
    return this.responseCallbacks;
  }

  /**
   * Get detailed execution queue status
   */
  getExecutionQueueStatus() {
    if (this.commandManager) {
      return this.commandManager.getStatus();
    }
    
    // Fallback to legacy status
    return {
      commandsInQueue: this.responseCallbacks.size,
      isExecuting: this.responseCallbacks.size > 0,
      pendingCommandIds: Array.from(this.responseCallbacks.keys()),
      lastCommandId: this.commandId,
      queueStatus: this.responseCallbacks.size > 0 ? 'active' : 'empty'
    };
  }

  /**
   * Get queue status for monitoring
   * @returns {object} Current queue and processing status
   */
  getQueueStatus() {
    if (!this.commandManager) {
      return { pending: 0, queue: [] };
    }
    
    return {
      pending: this.commandManager.responseManager.getPendingCount(),
      queue: this.commandManager.commandQueue.getQueueSnapshot()
    };
  }

  /**
   * Clear command queue
   */
  clearQueue() {
    if (this.commandManager) {
      this.commandManager.clearAll();
    }
    
    // Also clear legacy callbacks
    this.clearPendingCallbacks();
  }

  /**
   * Get detailed status including both queue and pending commands
   * @returns {object} Detailed status information
   */
  getDetailedStatus() {
    if (this.commandManager) {
      return this.commandManager.getDetailedStatus();
    }
    
    return this.getExecutionQueueStatus();
  }

  /**
   * Check if connected and ready to execute commands
   * @returns {boolean} True if ready to execute commands
   */
  isReady() {
    return this.connectionManager && 
           this.connectionManager.isConnected && 
           this.commandManager !== null;
  }

  /**
   * Get adapter information
   * @returns {object} Information about current serial adapter
   */
  getAdapterInfo() {
    if (this.connectionManager) {
      return this.connectionManager.getAdapterInfo();
    }
    
    return { adapter: null, connected: false };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.cleanupCommandManager();
    this.clearPendingCallbacks();
    this.removeAllListeners();
    
    if (this.connectionManager) {
      this.connectionManager.removeAllListeners();
    }
  }
}