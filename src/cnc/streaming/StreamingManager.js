/**
 * Streaming G-code Manager
 * 
 * Handles efficient streaming of G-code files with batch processing,
 * buffer management, and progress tracking for optimal CNC performance.
 */

import { EventEmitter } from 'events';
import { LookAheadBuffer } from './LookAheadBuffer.js';
import { ProgressTracker } from './ProgressTracker.js';
import { GcodePreprocessor } from '../files/GcodePreprocessor.js';
import { log, debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class StreamingManager extends EventEmitter {
  constructor(commandManager, config = {}) {
    super();
    
    if (!commandManager) {
      throw new Error('StreamingManager requires a command manager');
    }
    
    this.commandManager = commandManager;
    this.config = {
      batchSize: 5,                    // Commands to send in each batch
      lookAheadLines: 15,              // Lines to buffer for optimization
      maxBufferSize: 127,              // GRBL buffer size (characters)
      streamingRate: 100,              // ms between batch sends
      pauseOnError: true,              // Pause streaming on command errors
      resumeOnClear: true,             // Resume when errors are cleared
      progressUpdateInterval: 250,     // ms between progress updates
      enableOptimization: true,        // Enable look-ahead optimization
      safeHeight: 5.0,                 // Safe Z height for recovery
      ...config
    };
    
    this.lookAheadBuffer = new LookAheadBuffer(this.config);
    this.progressTracker = new ProgressTracker(this.config);
    this.preprocessor = new GcodePreprocessor(this.config);
    
    this.state = {
      isStreaming: false,
      isPaused: false,
      currentFile: null,
      currentLine: 0,
      totalLines: 0,
      bufferUtilization: 0,
      streamingRate: 0,
      errorCount: 0,
      lastCommandTime: null
    };
    
    this.streamingTimer = null;
    this.progressTimer = null;
    this.commandQueue = [];
    this.sentCommands = new Map();
    
    this.setupCommandManagerListeners();
  }

  /**
   * Start streaming a G-code file
   */
  async startStreaming(filePath, options = {}) {
    try {
      if (this.state.isStreaming) {
        throw new Error('Already streaming a file. Stop current stream first.');
      }

      info(`Starting G-code streaming: ${filePath}`);
      
      // Preprocess the file
      const preprocessResult = await this.preprocessor.processFile(filePath, options);
      
      if (!preprocessResult.success) {
        throw new Error(`File preprocessing failed: ${preprocessResult.error}`);
      }

      // Initialize streaming state
      this.state = {
        ...this.state,
        isStreaming: true,
        isPaused: false,
        currentFile: filePath,
        currentLine: 0,
        totalLines: preprocessResult.lines.length,
        errorCount: 0,
        startTime: Date.now()
      };

      // Load commands into queue
      this.commandQueue = preprocessResult.lines.map((line, index) => ({
        id: `stream_${index}`,
        line: index + 1,
        command: line.command,
        original: line.original,
        metadata: line.metadata || {}
      }));

      // Initialize components
      this.lookAheadBuffer.initialize(this.commandQueue);
      this.progressTracker.initialize(this.state.totalLines, filePath);

      // Start streaming process
      this.startStreamingLoop();
      this.startProgressTracking();

      this.emit('streamingStarted', {
        file: filePath,
        totalLines: this.state.totalLines,
        estimatedTime: preprocessResult.estimatedTime,
        metadata: preprocessResult.metadata
      });

      debug('G-code streaming started successfully', {
        file: filePath,
        lines: this.state.totalLines,
        batchSize: this.config.batchSize
      });

    } catch (err) {
      error('Failed to start streaming', { error: err.message, file: filePath });
      this.emit('streamingError', { error: err, phase: 'startup' });
      throw err;
    }
  }

  /**
   * Stop streaming
   */
  async stopStreaming(reason = 'user_request') {
    if (!this.state.isStreaming) {
      return;
    }

    info(`Stopping G-code streaming: ${reason}`);
    
    this.state.isStreaming = false;
    this.state.isPaused = false;
    
    // Clear timers
    if (this.streamingTimer) {
      clearInterval(this.streamingTimer);
      this.streamingTimer = null;
    }
    
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }

    // Wait for pending commands to complete
    await this.waitForPendingCommands();

    // Clean up
    this.commandQueue = [];
    this.sentCommands.clear();
    this.lookAheadBuffer.clear();
    
    const stats = this.getStreamingStats();
    
    this.emit('streamingStopped', {
      reason,
      stats,
      completed: this.state.currentLine >= this.state.totalLines
    });

    debug('G-code streaming stopped', { reason, stats });
  }

  /**
   * Pause streaming
   */
  pauseStreaming(reason = 'user_request') {
    if (!this.state.isStreaming || this.state.isPaused) {
      return false;
    }

    this.state.isPaused = true;
    
    if (this.streamingTimer) {
      clearInterval(this.streamingTimer);
      this.streamingTimer = null;
    }

    info(`G-code streaming paused: ${reason}`);
    this.emit('streamingPaused', { reason });
    
    return true;
  }

  /**
   * Resume streaming
   */
  resumeStreaming() {
    if (!this.state.isStreaming || !this.state.isPaused) {
      return false;
    }

    this.state.isPaused = false;
    this.startStreamingLoop();

    info('G-code streaming resumed');
    this.emit('streamingResumed', {});
    
    return true;
  }

  /**
   * Main streaming loop
   */
  startStreamingLoop() {
    this.streamingTimer = setInterval(() => {
      if (!this.state.isStreaming || this.state.isPaused) {
        return;
      }

      this.processBatch();
    }, this.config.streamingRate);
  }

  /**
   * Process a batch of commands
   */
  async processBatch() {
    try {
      // Check if we can send more commands
      const pendingCount = this.commandManager.getStatus().pending.count;
      const maxPending = this.config.batchSize * 2; // Allow some buffering
      
      if (pendingCount >= maxPending) {
        debug('Batch processing delayed - pending commands limit reached', {
          pending: pendingCount,
          max: maxPending
        });
        return;
      }

      // Get next batch of commands
      const batch = this.getNextBatch();
      
      if (batch.length === 0) {
        // Check if streaming is complete
        if (this.state.currentLine >= this.state.totalLines && this.sentCommands.size === 0) {
          await this.stopStreaming('completed');
        }
        return;
      }

      // Send batch
      await this.sendBatch(batch);
      
      // Update buffer utilization
      this.updateBufferUtilization();
      
    } catch (err) {
      error('Error in batch processing', { error: err.message });
      this.handleStreamingError(err);
    }
  }

  /**
   * Get next batch of commands to send
   */
  getNextBatch() {
    const batch = [];
    const batchSize = this.config.batchSize;
    
    while (batch.length < batchSize && this.state.currentLine < this.state.totalLines) {
      const commandIndex = this.state.currentLine;
      const commandData = this.commandQueue[commandIndex];
      
      if (!commandData) {
        break;
      }

      // Apply look-ahead optimization if enabled
      if (this.config.enableOptimization) {
        const optimizedCommand = this.lookAheadBuffer.getOptimizedCommand(commandIndex);
        if (optimizedCommand) {
          commandData.command = optimizedCommand.command;
          commandData.metadata = { ...commandData.metadata, ...optimizedCommand.metadata };
        }
      }

      batch.push(commandData);
      this.state.currentLine++;
    }

    return batch;
  }

  /**
   * Send a batch of commands
   */
  async sendBatch(batch) {
    const batchPromises = batch.map(async (commandData) => {
      try {
        const startTime = Date.now();
        
        // Send command
        const response = await this.commandManager.sendCommand(commandData.command, {
          timeout: this.config.commandTimeout,
          metadata: {
            streamId: commandData.id,
            line: commandData.line,
            original: commandData.original,
            ...commandData.metadata
          }
        });

        const responseTime = Date.now() - startTime;
        
        // Track sent command
        this.sentCommands.set(commandData.id, {
          ...commandData,
          sentAt: startTime,
          responseTime,
          response
        });

        // Remove from tracking after response
        setTimeout(() => {
          this.sentCommands.delete(commandData.id);
        }, 1000);
        
        this.emit('commandCompleted', {
          id: commandData.id,
          line: commandData.line,
          command: commandData.command,
          response,
          responseTime
        });

        return { success: true, commandData, response };
        
      } catch (err) {
        this.state.errorCount++;
        
        this.emit('commandError', {
          id: commandData.id,
          line: commandData.line,
          command: commandData.command,
          error: err
        });

        if (this.config.pauseOnError) {
          this.pauseStreaming('command_error');
        }

        return { success: false, commandData, error: err };
      }
    });

    const results = await Promise.allSettled(batchPromises);
    
    // Update streaming rate
    this.updateStreamingRate(batch.length);
    
    debug('Batch processed', {
      size: batch.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      errors: results.filter(r => r.status === 'rejected' || !r.value?.success).length
    });
  }

  /**
   * Setup command manager event listeners
   */
  setupCommandManagerListeners() {
    this.commandManager.on('commandResponse', (event) => {
      if (event.metadata?.streamId) {
        this.progressTracker.updateProgress(event.metadata.line, event.response);
      }
    });

    this.commandManager.on('commandError', (event) => {
      if (event.metadata?.streamId) {
        this.handleCommandError(event);
      }
    });

    this.commandManager.on('serialError', (event) => {
      if (this.state.isStreaming) {
        this.handleStreamingError(event.error);
      }
    });
  }

  /**
   * Handle command errors during streaming
   */
  handleCommandError(event) {
    this.state.errorCount++;
    
    warn('Command error during streaming', {
      line: event.metadata?.line,
      command: event.command,
      error: event.error?.message
    });

    if (this.config.pauseOnError) {
      this.pauseStreaming('command_error');
    }
  }

  /**
   * Handle streaming errors
   */
  handleStreamingError(error) {
    error('Streaming error occurred', { error: error.message });
    
    this.emit('streamingError', {
      error,
      phase: 'streaming',
      line: this.state.currentLine
    });

    if (this.state.isStreaming) {
      this.stopStreaming('error');
    }
  }

  /**
   * Start progress tracking
   */
  startProgressTracking() {
    this.progressTimer = setInterval(() => {
      if (this.state.isStreaming) {
        const progress = this.progressTracker.getProgress();
        this.emit('progress', progress);
      }
    }, this.config.progressUpdateInterval);
  }

  /**
   * Update buffer utilization metrics
   */
  updateBufferUtilization() {
    const pendingCommands = this.commandManager.getStatus().pending.count;
    const maxPending = this.config.batchSize * 2;
    this.state.bufferUtilization = (pendingCommands / maxPending) * 100;
  }

  /**
   * Update streaming rate metrics
   */
  updateStreamingRate(batchSize) {
    const now = Date.now();
    if (this.state.lastCommandTime) {
      const timeDiff = (now - this.state.lastCommandTime) / 1000; // seconds
      this.state.streamingRate = batchSize / timeDiff; // commands per second
    }
    this.state.lastCommandTime = now;
  }

  /**
   * Wait for all pending commands to complete
   */
  async waitForPendingCommands(timeout = 30000) {
    const startTime = Date.now();
    
    while (this.sentCommands.size > 0) {
      if (Date.now() - startTime > timeout) {
        warn('Timeout waiting for pending commands', {
          remaining: this.sentCommands.size
        });
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Get current streaming statistics
   */
  getStreamingStats() {
    const elapsed = this.state.startTime ? Date.now() - this.state.startTime : 0;
    
    return {
      file: this.state.currentFile,
      currentLine: this.state.currentLine,
      totalLines: this.state.totalLines,
      completionPercent: (this.state.currentLine / this.state.totalLines) * 100,
      elapsedTime: elapsed,
      estimatedRemaining: this.progressTracker.getEstimatedTimeRemaining(),
      averageRate: this.state.streamingRate,
      bufferUtilization: this.state.bufferUtilization,
      errorCount: this.state.errorCount,
      isStreaming: this.state.isStreaming,
      isPaused: this.state.isPaused
    };
  }

  /**
   * Get detailed streaming status
   */
  getDetailedStatus() {
    return {
      ...this.getStreamingStats(),
      bufferStatus: this.lookAheadBuffer.getStatus(),
      progressDetails: this.progressTracker.getDetailedProgress(),
      pendingCommands: Array.from(this.sentCommands.entries()).map(([id, cmd]) => ({
        id,
        line: cmd.line,
        command: cmd.command,
        waitTime: Date.now() - cmd.sentAt
      }))
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    if (this.state.isStreaming) {
      this.stopStreaming('cleanup');
    }
    
    this.lookAheadBuffer.cleanup();
    this.progressTracker.cleanup();
    this.removeAllListeners();
  }
}