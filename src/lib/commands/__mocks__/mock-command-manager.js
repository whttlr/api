/**
 * Mock EventLoopCommandManager for Testing
 * 
 * Provides a mock implementation of EventLoopCommandManager
 * for testing command execution without real serial communication.
 */

import { EventEmitter } from 'events';

export class MockCommandManager extends EventEmitter {
  constructor(mockSerialInterface, config = {}) {
    super();
    this.mockSerialInterface = mockSerialInterface;
    this.config = {
      commandTimeout: 5000,
      maxQueueSize: 100,
      maxPendingCommands: 50,
      ...config
    };
    
    this.commandQueue = new MockCommandQueue();
    this.responseManager = new MockResponseManager();
    this.sentCommands = [];
    this.isProcessing = false;
    this.stats = {
      commandsSent: 0,
      commandsCompleted: 0,
      commandsTimedOut: 0,
      commandsErrored: 0,
      totalResponseTime: 0,
      startTime: Date.now()
    };
  }

  async sendCommand(command, options = {}) {
    const commandId = this.generateCommandId();
    const timeout = options.timeout || this.config.commandTimeout;
    
    this.sentCommands.push({
      id: commandId,
      command: command,
      options: options,
      timestamp: Date.now()
    });

    this.stats.commandsSent++;

    // Emit command queued event
    this.emit('commandQueued', {
      id: commandId,
      command: command,
      queueSize: this.commandQueue.size() + 1,
      timestamp: Date.now()
    });

    // Emit command sent event immediately for mock
    this.emit('commandSent', {
      id: commandId,
      command: command,
      timestamp: Date.now(),
      queueSize: this.commandQueue.size(),
      pendingCount: this.responseManager.getPendingCount()
    });

    // Simulate command execution
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      setTimeout(() => {
        const responseTime = Date.now() - startTime;
        this.stats.commandsCompleted++;
        this.stats.totalResponseTime += responseTime;

        // Generate mock response
        const response = this.generateMockResponse(command);
        
        // Emit command response event
        this.emit('commandResponse', {
          commandId: commandId,
          command: command,
          response: response,
          responseTime: responseTime,
          timestamp: Date.now()
        });

        resolve(response);
      }, options.mockDelay || 10);
    });
  }

  generateMockResponse(command) {
    const cleanCommand = command.trim().toLowerCase();
    
    if (cleanCommand === '?') {
      return { type: 'status', raw: '<Idle|MPos:0.000,0.000,0.000|FS:0,0>' };
    } else if (cleanCommand === '$h') {
      return { type: 'ok', raw: 'ok' };
    } else if (cleanCommand === '$x') {
      return { type: 'ok', raw: 'ok' };
    } else if (cleanCommand.startsWith('g0') || cleanCommand.startsWith('g1')) {
      return { type: 'ok', raw: 'ok' };
    } else if (cleanCommand.startsWith('error:')) {
      const errorCode = command.match(/error:(\d+)/)?.[1] || '1';
      return { type: 'error', code: parseInt(errorCode), raw: command };
    } else {
      return { type: 'ok', raw: 'ok' };
    }
  }

  generateCommandId() {
    return `mock_cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getStatus() {
    return {
      queue: {
        size: this.commandQueue.size(),
        capacity: this.config.maxQueueSize,
        utilization: (this.commandQueue.size() / this.config.maxQueueSize) * 100
      },
      pending: {
        count: this.responseManager.getPendingCount(),
        capacity: this.config.maxPendingCommands,
        utilization: (this.responseManager.getPendingCount() / this.config.maxPendingCommands) * 100
      },
      processing: {
        isProcessing: this.isProcessing,
        currentCommand: null,
        loopActive: true
      },
      stats: {
        ...this.stats,
        averageResponseTime: this.stats.commandsCompleted > 0 ? 
          this.stats.totalResponseTime / this.stats.commandsCompleted : 0,
        uptime: Date.now() - this.stats.startTime
      }
    };
  }

  clearAll() {
    this.commandQueue.clear();
    this.responseManager.clearAll();
    return {
      queued: 0,
      pending: 0
    };
  }

  getDetailedStatus() {
    return {
      ...this.getStatus(),
      queueSnapshot: this.commandQueue.getQueueSnapshot(),
      pendingSnapshot: this.responseManager.getPendingSnapshot()
    };
  }

  cleanup() {
    this.clearAll();
    this.removeAllListeners();
  }

  // Test utilities
  getSentCommands() {
    return [...this.sentCommands];
  }

  clearSentCommands() {
    this.sentCommands = [];
  }

  getLastSentCommand() {
    return this.sentCommands[this.sentCommands.length - 1] || null;
  }

  setMockDelay(delay) {
    this.mockDelay = delay;
  }

  simulateCommandError(errorMessage) {
    this.emit('commandError', {
      id: 'mock_error',
      command: 'mock_command',
      error: new Error(errorMessage),
      timestamp: Date.now()
    });
  }
}

class MockCommandQueue {
  constructor() {
    this.queue = [];
  }

  enqueue(command) {
    this.queue.push(command);
    return true;
  }

  dequeue() {
    return this.queue.shift();
  }

  size() {
    return this.queue.length;
  }

  clear() {
    const cleared = this.queue.length;
    this.queue = [];
    return cleared;
  }

  getQueueSnapshot() {
    return this.queue.map(cmd => ({
      id: cmd.id || 'mock_id',
      command: cmd.command || 'mock_command',
      timestamp: cmd.timestamp || Date.now(),
      enqueuedAt: cmd.enqueuedAt || Date.now(),
      timeout: cmd.timeout || 5000,
      waitTime: Date.now() - (cmd.enqueuedAt || Date.now())
    }));
  }
}

class MockResponseManager {
  constructor() {
    this.pendingCommands = new Map();
  }

  addPending(commandId, command) {
    this.pendingCommands.set(commandId, command);
    return true;
  }

  resolve(commandId, response) {
    this.pendingCommands.delete(commandId);
    return true;
  }

  reject(commandId, error) {
    this.pendingCommands.delete(commandId);
    return true;
  }

  isPending(commandId) {
    return this.pendingCommands.has(commandId);
  }

  getPendingCount() {
    return this.pendingCommands.size;
  }

  clearAll() {
    const cleared = this.pendingCommands.size;
    this.pendingCommands.clear();
    return cleared;
  }

  getPendingSnapshot() {
    return Array.from(this.pendingCommands.entries()).map(([commandId, cmd]) => ({
      commandId,
      command: cmd.command || 'mock_command',
      addedAt: cmd.addedAt || Date.now(),
      waitTime: Date.now() - (cmd.addedAt || Date.now()),
      timeout: cmd.timeout || 5000,
      hasTimeout: true
    }));
  }
}