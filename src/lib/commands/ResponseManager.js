/**
 * Response Manager Implementation
 * 
 * Manages pending command responses and matches incoming data to waiting commands.
 * Implements FIFO response matching similar to existing system but with better tracking.
 */

import { debug, warn } from '../logger/LoggerService.js';

export class ResponseManager {
  constructor(options = {}) {
    this.pendingCommands = new Map();
    this.maxPendingCommands = options.maxPendingCommands || 50;
    this.defaultTimeout = options.defaultTimeout || 5000;
    this.name = options.name || 'ResponseManager';
  }

  /**
   * Add a command to the pending responses list
   * @param {string} commandId - Unique command identifier
   * @param {object} command - Command object with resolve/reject callbacks
   * @returns {boolean} True if added successfully
   */
  addPending(commandId, command) {
    if (this.pendingCommands.size >= this.maxPendingCommands) {
      warn(`${this.name}: Too many pending commands (${this.pendingCommands.size}), rejecting: ${commandId}`);
      return false;
    }

    const pendingCommand = {
      ...command,
      addedAt: Date.now(),
      timeoutHandle: null
    };

    // Set up timeout handler
    if (command.timeout && command.timeout > 0) {
      pendingCommand.timeoutHandle = setTimeout(() => {
        this.handleTimeout(commandId);
      }, command.timeout);
    }

    this.pendingCommands.set(commandId, pendingCommand);
    debug(`${this.name}: Added pending command: ${commandId} (pending: ${this.pendingCommands.size})`);
    
    return true;
  }

  /**
   * Resolve a pending command with a response
   * @param {string} commandId - Command ID to resolve
   * @param {object} response - Response data
   * @returns {boolean} True if command was found and resolved
   */
  resolve(commandId, response) {
    const pendingCommand = this.pendingCommands.get(commandId);
    
    if (!pendingCommand) {
      debug(`${this.name}: No pending command found for ID: ${commandId}`);
      return false;
    }

    // Clear timeout if set
    if (pendingCommand.timeoutHandle) {
      clearTimeout(pendingCommand.timeoutHandle);
    }

    // Remove from pending list
    this.pendingCommands.delete(commandId);

    // Calculate response time
    const responseTime = Date.now() - pendingCommand.addedAt;
    debug(`${this.name}: Resolved command: ${commandId} in ${responseTime}ms (pending: ${this.pendingCommands.size})`);

    // Resolve the promise
    if (pendingCommand.resolve) {
      pendingCommand.resolve({
        ...response,
        responseTime,
        commandId
      });
    }

    return true;
  }

  /**
   * Reject a pending command with an error
   * @param {string} commandId - Command ID to reject
   * @param {Error} error - Error object
   * @returns {boolean} True if command was found and rejected
   */
  reject(commandId, error) {
    const pendingCommand = this.pendingCommands.get(commandId);
    
    if (!pendingCommand) {
      debug(`${this.name}: No pending command found for rejection: ${commandId}`);
      return false;
    }

    // Clear timeout if set
    if (pendingCommand.timeoutHandle) {
      clearTimeout(pendingCommand.timeoutHandle);
    }

    // Remove from pending list
    this.pendingCommands.delete(commandId);

    const responseTime = Date.now() - pendingCommand.addedAt;
    debug(`${this.name}: Rejected command: ${commandId} after ${responseTime}ms (pending: ${this.pendingCommands.size})`);

    // Reject the promise
    if (pendingCommand.reject) {
      pendingCommand.reject(error);
    }

    return true;
  }

  /**
   * Handle command timeout
   * @param {string} commandId - Command ID that timed out
   */
  handleTimeout(commandId) {
    const pendingCommand = this.pendingCommands.get(commandId);
    
    if (pendingCommand) {
      const timeoutError = new Error(`Command timeout: ${pendingCommand.command} (${pendingCommand.timeout}ms)`);
      timeoutError.code = 'COMMAND_TIMEOUT';
      timeoutError.commandId = commandId;
      timeoutError.command = pendingCommand.command;
      
      warn(`${this.name}: Command timed out: ${commandId} after ${pendingCommand.timeout}ms`);
      this.reject(commandId, timeoutError);
    }
  }

  /**
   * Check if a command is pending
   * @param {string} commandId - Command ID to check
   * @returns {boolean} True if command is pending
   */
  isPending(commandId) {
    return this.pendingCommands.has(commandId);
  }

  /**
   * Get the oldest pending command (FIFO order)
   * Matches existing system behavior for response matching
   * @returns {object|null} Oldest pending command or null if none
   */
  getOldestPending() {
    if (this.pendingCommands.size === 0) {
      return null;
    }

    // Find the command with the earliest addedAt timestamp
    let oldestCommand = null;
    let oldestTime = Infinity;

    for (const [commandId, command] of this.pendingCommands) {
      if (command.addedAt < oldestTime) {
        oldestTime = command.addedAt;
        oldestCommand = { commandId, ...command };
      }
    }

    return oldestCommand;
  }

  /**
   * Get all pending command IDs in chronological order
   * @returns {Array} Array of command IDs in order they were added
   */
  getPendingIds() {
    const commands = Array.from(this.pendingCommands.entries());
    commands.sort((a, b) => a[1].addedAt - b[1].addedAt);
    return commands.map(([commandId]) => commandId);
  }

  /**
   * Get number of pending commands
   * @returns {number} Number of pending commands
   */
  getPendingCount() {
    return this.pendingCommands.size;
  }

  /**
   * Clear all pending commands
   * @param {string} reason - Reason for clearing (for logging)
   * @returns {Array} Array of cleared commands for cleanup
   */
  clearAll(reason = 'Manual clear') {
    const clearedCommands = [];

    for (const [commandId, command] of this.pendingCommands) {
      // Clear timeout if set
      if (command.timeoutHandle) {
        clearTimeout(command.timeoutHandle);
      }

      // Reject pending promises
      if (command.reject) {
        const error = new Error(`Command cancelled: ${reason}`);
        error.code = 'COMMAND_CANCELLED';
        error.commandId = commandId;
        command.reject(error);
      }

      clearedCommands.push({ commandId, ...command });
    }

    this.pendingCommands.clear();
    debug(`${this.name}: Cleared ${clearedCommands.length} pending commands (${reason})`);
    
    return clearedCommands;
  }

  /**
   * Get pending commands statistics
   * @returns {object} Statistics about pending commands
   */
  getStats() {
    const now = Date.now();
    const commands = Array.from(this.pendingCommands.values());
    
    const stats = {
      count: commands.length,
      maxCapacity: this.maxPendingCommands,
      utilization: (commands.length / this.maxPendingCommands) * 100
    };

    if (commands.length > 0) {
      const waitTimes = commands.map(cmd => now - cmd.addedAt);
      stats.avgWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
      stats.maxWaitTime = Math.max(...waitTimes);
      stats.minWaitTime = Math.min(...waitTimes);
      stats.oldestPendingTime = Math.max(...waitTimes);
    }

    return stats;
  }

  /**
   * Get a snapshot of pending commands for monitoring
   * @returns {Array} Array of pending command summaries
   */
  getPendingSnapshot() {
    const now = Date.now();
    return Array.from(this.pendingCommands.entries()).map(([commandId, cmd]) => ({
      commandId,
      command: cmd.command,
      addedAt: cmd.addedAt,
      waitTime: now - cmd.addedAt,
      timeout: cmd.timeout,
      hasTimeout: !!cmd.timeoutHandle
    }));
  }

  /**
   * Remove commands that have been pending too long
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Array} Array of removed commands
   */
  removeOldPending(maxAge) {
    const cutoff = Date.now() - maxAge;
    const removedCommands = [];

    for (const [commandId, command] of this.pendingCommands) {
      if (command.addedAt < cutoff) {
        const timeoutError = new Error(`Command expired: ${command.command} (pending for ${maxAge}ms)`);
        timeoutError.code = 'COMMAND_EXPIRED';
        timeoutError.commandId = commandId;
        
        this.reject(commandId, timeoutError);
        removedCommands.push({ commandId, ...command });
      }
    }

    if (removedCommands.length > 0) {
      debug(`${this.name}: Removed ${removedCommands.length} expired commands (older than ${maxAge}ms)`);
    }

    return removedCommands;
  }
}