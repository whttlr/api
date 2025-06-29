/**
 * Command Queue Implementation
 * 
 * Manages a FIFO queue of commands for sequential execution.
 * Optimized for JavaScript event loop pattern with non-blocking operations.
 */

import { debug } from '../logger/LoggerService.js';

export class CommandQueue {
  constructor(options = {}) {
    this.queue = [];
    this.maxQueueSize = options.maxQueueSize || 100;
    this.name = options.name || 'CommandQueue';
  }

  /**
   * Add a command to the queue
   * @param {object} command - Command object with id, command string, callbacks, etc.
   * @returns {boolean} True if added successfully, false if queue is full
   */
  enqueue(command) {
    if (this.queue.length >= this.maxQueueSize) {
      debug(`${this.name}: Queue full, rejecting command: ${command.command}`);
      return false;
    }

    this.queue.push({
      ...command,
      enqueuedAt: Date.now()
    });

    debug(`${this.name}: Enqueued command: ${command.command} (queue size: ${this.queue.length})`);
    return true;
  }

  /**
   * Remove and return the next command from the queue
   * @returns {object|null} Next command or null if queue is empty
   */
  dequeue() {
    if (this.queue.length === 0) {
      return null;
    }

    const command = this.queue.shift();
    debug(`${this.name}: Dequeued command: ${command.command} (queue size: ${this.queue.length})`);
    
    return command;
  }

  /**
   * Look at the next command without removing it
   * @returns {object|null} Next command or null if queue is empty
   */
  peek() {
    return this.queue.length > 0 ? this.queue[0] : null;
  }

  /**
   * Check if the queue is empty
   * @returns {boolean} True if queue is empty
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * Check if the queue is full
   * @returns {boolean} True if queue is at maximum capacity
   */
  isFull() {
    return this.queue.length >= this.maxQueueSize;
  }

  /**
   * Get current queue size
   * @returns {number} Number of commands in queue
   */
  size() {
    return this.queue.length;
  }

  /**
   * Get maximum queue capacity
   * @returns {number} Maximum queue size
   */
  capacity() {
    return this.maxQueueSize;
  }

  /**
   * Clear all commands from the queue
   * @returns {Array} Array of cleared commands for cleanup
   */
  clear() {
    const clearedCommands = [...this.queue];
    this.queue = [];
    
    debug(`${this.name}: Cleared queue, removed ${clearedCommands.length} commands`);
    return clearedCommands;
  }

  /**
   * Get a snapshot of the current queue for monitoring
   * @returns {Array} Array of command summaries (without callbacks)
   */
  getQueueSnapshot() {
    return this.queue.map(cmd => ({
      id: cmd.id,
      command: cmd.command,
      timestamp: cmd.timestamp,
      enqueuedAt: cmd.enqueuedAt,
      timeout: cmd.timeout,
      waitTime: Date.now() - cmd.enqueuedAt
    }));
  }

  /**
   * Get queue statistics
   * @returns {object} Queue statistics
   */
  getStats() {
    const now = Date.now();
    const commands = this.queue;
    
    const stats = {
      size: commands.length,
      capacity: this.maxQueueSize,
      utilization: (commands.length / this.maxQueueSize) * 100,
      isEmpty: commands.length === 0,
      isFull: commands.length >= this.maxQueueSize
    };

    if (commands.length > 0) {
      const waitTimes = commands.map(cmd => now - cmd.enqueuedAt);
      stats.avgWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
      stats.maxWaitTime = Math.max(...waitTimes);
      stats.minWaitTime = Math.min(...waitTimes);
      stats.oldestCommand = commands[0];
    }

    return stats;
  }

  /**
   * Remove a specific command by ID
   * @param {string} commandId - ID of command to remove
   * @returns {object|null} Removed command or null if not found
   */
  removeById(commandId) {
    const index = this.queue.findIndex(cmd => cmd.id === commandId);
    
    if (index !== -1) {
      const removedCommand = this.queue.splice(index, 1)[0];
      debug(`${this.name}: Removed command by ID: ${commandId}`);
      return removedCommand;
    }
    
    return null;
  }

  /**
   * Find commands matching a predicate
   * @param {function} predicate - Function to test each command
   * @returns {Array} Array of matching commands
   */
  findCommands(predicate) {
    return this.queue.filter(predicate);
  }

  /**
   * Get commands older than specified age
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Array} Array of commands older than maxAge
   */
  getOldCommands(maxAge) {
    const cutoff = Date.now() - maxAge;
    return this.queue.filter(cmd => cmd.enqueuedAt < cutoff);
  }

  /**
   * Remove commands older than specified age
   * @param {number} maxAge - Maximum age in milliseconds
   * @returns {Array} Array of removed commands
   */
  removeOldCommands(maxAge) {
    const cutoff = Date.now() - maxAge;
    const oldCommands = [];
    
    // Remove from front of queue until we find a recent command
    while (this.queue.length > 0 && this.queue[0].enqueuedAt < cutoff) {
      oldCommands.push(this.queue.shift());
    }
    
    if (oldCommands.length > 0) {
      debug(`${this.name}: Removed ${oldCommands.length} old commands (older than ${maxAge}ms)`);
    }
    
    return oldCommands;
  }
}