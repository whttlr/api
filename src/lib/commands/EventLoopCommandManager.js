/**
 * Event Loop Command Manager
 * 
 * Core implementation of event-driven command execution using JavaScript event loop.
 * Based on CoastRunner CRWrite v2 insight: "JavaScript's event loop turns out to be 
 * the perfect abstraction for GRBL communication."
 * 
 * Key features:
 * - Non-blocking command execution
 * - Event-driven response handling
 * - Automatic command queuing
 * - GRBL protocol compliance
 */

import { EventEmitter } from 'events';
import { CommandQueue } from './CommandQueue.js';
import { ResponseManager } from './ResponseManager.js';
import { debug, info, warn, error } from '../logger/LoggerService.js';

export class EventLoopCommandManager extends EventEmitter {
  constructor(serialInterface, config = {}) {
    super();
    
    if (!serialInterface) {
      throw new Error('EventLoopCommandManager requires a serial interface');
    }

    this.serialInterface = serialInterface;
    this.config = {
      commandTimeout: 5000,
      queueProcessingInterval: 10,
      maxQueueSize: 100,
      maxPendingCommands: 50,
      enableRealTimeStatus: true,
      ...config
    };

    // Initialize command queue and response manager
    this.commandQueue = new CommandQueue({
      maxQueueSize: this.config.maxQueueSize,
      name: 'EventLoopCommandManager'
    });

    this.responseManager = new ResponseManager({
      maxPendingCommands: this.config.maxPendingCommands,
      defaultTimeout: this.config.commandTimeout,
      name: 'EventLoopCommandManager'
    });

    // Processing state
    this.isProcessing = false;
    this.processingLoopActive = false;
    this.currentCommand = null;

    // Statistics
    this.stats = {
      commandsSent: 0,
      commandsCompleted: 0,
      commandsTimedOut: 0,
      commandsErrored: 0,
      totalResponseTime: 0,
      startTime: Date.now()
    };

    // Set up serial data handling
    this.setupSerialHandlers();

    // Start the event loop processing
    this.startProcessingLoop();

    debug('EventLoopCommandManager: Initialized with event loop optimization');
  }

  /**
   * Set up serial interface event handlers
   */
  setupSerialHandlers() {
    this.serialInterface.onData((data) => {
      this.handleSerialData(data);
    });

    this.serialInterface.onError((err) => {
      error('EventLoopCommandManager: Serial interface error', err);
      this.emit('serialError', err);
    });

    this.serialInterface.onDisconnect(() => {
      warn('EventLoopCommandManager: Serial interface disconnected');
      this.handleDisconnect();
    });
  }

  /**
   * Send a command using event loop optimization
   * @param {string} command - G-code command to send
   * @param {object} options - Command options (timeout, priority, etc.)
   * @returns {Promise} Promise that resolves with response
   */
  async sendCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.serialInterface.isConnected) {
        reject(new Error('Serial interface not connected'));
        return;
      }

      const commandId = this.generateCommandId();
      const timeout = options.timeout || this.config.commandTimeout;
      
      const commandObj = {
        id: commandId,
        command: command.trim(),
        resolve,
        reject,
        timeout,
        timestamp: Date.now(),
        options: { ...options }
      };

      // Add to queue for processing
      const queued = this.commandQueue.enqueue(commandObj);
      
      if (!queued) {
        reject(new Error(`Command queue full: ${command}`));
        return;
      }

      debug(`EventLoopCommandManager: Queued command: ${command} (ID: ${commandId})`);

      // Emit queued event
      this.emit('commandQueued', {
        id: commandId,
        command: command,
        queueSize: this.commandQueue.size(),
        timestamp: Date.now()
      });

      // The processing loop will handle actual sending
    });
  }

  /**
   * Start the event loop processing system
   * Uses setImmediate for optimal event loop integration
   */
  startProcessingLoop() {
    if (this.processingLoopActive) {
      debug('EventLoopCommandManager: Processing loop already active');
      return;
    }

    this.processingLoopActive = true;
    debug('EventLoopCommandManager: Starting event loop processing');

    const processNextCommand = () => {
      if (!this.processingLoopActive) {
        return;
      }

      try {
        this.processCommandQueue();
      } catch (err) {
        error('EventLoopCommandManager: Error in processing loop', err);
      }

      // Use setImmediate for optimal event loop performance
      // This gives other events (like serial data) priority
      setImmediate(processNextCommand);
    };

    // Start the loop
    setImmediate(processNextCommand);
  }

  /**
   * Stop the processing loop
   */
  stopProcessingLoop() {
    this.processingLoopActive = false;
    debug('EventLoopCommandManager: Stopped processing loop');
  }

  /**
   * Process the command queue (called by event loop)
   */
  async processCommandQueue() {
    // Only process if not currently sending a command
    if (this.isProcessing) {
      return;
    }

    // Check if there are commands to process
    if (this.commandQueue.isEmpty()) {
      return;
    }

    // Check if we can send more commands (don't overwhelm GRBL buffer)
    if (this.responseManager.getPendingCount() >= this.config.maxPendingCommands) {
      return;
    }

    this.isProcessing = true;

    try {
      const command = this.commandQueue.dequeue();
      
      if (command) {
        await this.executeCommand(command);
      }
    } catch (err) {
      error('EventLoopCommandManager: Error processing command', err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a single command
   * @param {object} command - Command object from queue
   */
  async executeCommand(command) {
    try {
      this.currentCommand = command;

      // Add to pending responses before sending
      this.responseManager.addPending(command.id, command);

      // Send command via serial interface
      await this.serialInterface.write(command.command);

      // Update statistics
      this.stats.commandsSent++;

      // Emit command sent event
      this.emit('commandSent', {
        id: command.id,
        command: command.command,
        timestamp: Date.now(),
        queueSize: this.commandQueue.size(),
        pendingCount: this.responseManager.getPendingCount()
      });

      debug(`EventLoopCommandManager: Sent command: ${command.command} (ID: ${command.id})`);

    } catch (err) {
      error(`EventLoopCommandManager: Failed to send command: ${command.command}`, err);
      
      // Remove from pending and reject
      this.responseManager.reject(command.id, err);
      this.stats.commandsErrored++;
      
      this.emit('commandError', {
        id: command.id,
        command: command.command,
        error: err,
        timestamp: Date.now()
      });
    } finally {
      this.currentCommand = null;
    }
  }

  /**
   * Handle incoming serial data
   * @param {string} data - Raw data from serial interface
   */
  handleSerialData(data) {
    try {
      const response = this.parseResponse(data);
      
      // Get the oldest pending command (FIFO matching like existing system)
      const pendingCommand = this.responseManager.getOldestPending();
      
      if (pendingCommand) {
        // Calculate response time
        const responseTime = Date.now() - pendingCommand.timestamp;
        
        // Update statistics
        this.stats.commandsCompleted++;
        this.stats.totalResponseTime += responseTime;
        
        // Resolve the command
        this.responseManager.resolve(pendingCommand.commandId, response);
        
        // Emit response event
        this.emit('commandResponse', {
          commandId: pendingCommand.commandId,
          command: pendingCommand.command,
          response,
          responseTime,
          timestamp: Date.now()
        });

        debug(`EventLoopCommandManager: Response for ${pendingCommand.command}: ${response.raw} (${responseTime}ms)`);
        
      } else {
        // No pending command - could be status report or unsolicited data
        this.emit('unsolicitedData', {
          data,
          response,
          timestamp: Date.now()
        });
        
        debug(`EventLoopCommandManager: Unsolicited data: ${data}`);
      }

    } catch (err) {
      error('EventLoopCommandManager: Error handling serial data', err);
      this.emit('dataError', { data, error: err });
    }
  }

  /**
   * Parse GRBL response data
   * @param {string} data - Raw response data
   * @returns {object} Parsed response object
   */
  parseResponse(data) {
    const cleanData = data.trim();
    
    if (cleanData.startsWith('ok')) {
      return { type: 'ok', raw: cleanData };
    } else if (cleanData.startsWith('error:')) {
      const errorCode = cleanData.match(/error:(\d+)/)?.[1];
      return { 
        type: 'error', 
        code: parseInt(errorCode) || 0, 
        raw: cleanData 
      };
    } else if (cleanData.startsWith('<') && cleanData.endsWith('>')) {
      return { 
        type: 'status', 
        raw: cleanData,
        // Could add status parsing here
      };
    } else if (cleanData.startsWith('[') && cleanData.endsWith(']')) {
      return { 
        type: 'setting', 
        raw: cleanData 
      };
    } else if (cleanData.startsWith('ALARM:')) {
      const alarmCode = cleanData.match(/ALARM:(\d+)/)?.[1];
      return { 
        type: 'alarm', 
        code: parseInt(alarmCode) || 0, 
        raw: cleanData 
      };
    } else {
      return { 
        type: 'info', 
        raw: cleanData 
      };
    }
  }

  /**
   * Handle serial interface disconnect
   */
  handleDisconnect() {
    // Clear all pending commands
    const clearedCommands = this.responseManager.clearAll('Serial disconnected');
    const queuedCommands = this.commandQueue.clear();
    
    this.emit('disconnect', {
      clearedPending: clearedCommands.length,
      clearedQueue: queuedCommands.length
    });
  }

  /**
   * Generate unique command ID
   * @returns {string} Unique command identifier
   */
  generateCommandId() {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current queue status
   * @returns {object} Queue and processing status
   */
  getStatus() {
    return {
      queue: {
        size: this.commandQueue.size(),
        capacity: this.commandQueue.capacity(),
        utilization: (this.commandQueue.size() / this.commandQueue.capacity()) * 100
      },
      pending: {
        count: this.responseManager.getPendingCount(),
        capacity: this.config.maxPendingCommands,
        utilization: (this.responseManager.getPendingCount() / this.config.maxPendingCommands) * 100
      },
      processing: {
        isProcessing: this.isProcessing,
        currentCommand: this.currentCommand ? this.currentCommand.command : null,
        loopActive: this.processingLoopActive
      },
      stats: {
        ...this.stats,
        averageResponseTime: this.stats.commandsCompleted > 0 ? 
          this.stats.totalResponseTime / this.stats.commandsCompleted : 0,
        uptime: Date.now() - this.stats.startTime
      }
    };
  }

  /**
   * Clear all queued and pending commands
   * @returns {object} Summary of cleared commands
   */
  clearAll() {
    const queuedCommands = this.commandQueue.clear();
    const pendingCommands = this.responseManager.clearAll('Manual clear');
    
    info(`EventLoopCommandManager: Cleared ${queuedCommands.length} queued and ${pendingCommands.length} pending commands`);
    
    return {
      queued: queuedCommands.length,
      pending: pendingCommands.length
    };
  }

  /**
   * Get detailed queue snapshot for monitoring
   * @returns {object} Detailed queue and pending command information
   */
  getDetailedStatus() {
    return {
      ...this.getStatus(),
      queueSnapshot: this.commandQueue.getQueueSnapshot(),
      pendingSnapshot: this.responseManager.getPendingSnapshot()
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stopProcessingLoop();
    this.clearAll();
    this.removeAllListeners();
    
    if (this.serialInterface) {
      this.serialInterface.removeAllListeners();
    }
    
    debug('EventLoopCommandManager: Cleaned up resources');
  }
}