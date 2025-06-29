/**
 * Retry Manager with Exponential Backoff
 * 
 * Handles automatic retry logic for failed commands with intelligent
 * retry strategies, exponential backoff, and recovery sequences.
 */

import { EventEmitter } from 'events';
import { debug, warn, error } from '../../lib/logger/LoggerService.js';

export class RetryManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxRetries: 3,                    // Maximum retry attempts per command
      initialDelay: 500,                // Initial retry delay (ms)
      maxDelay: 10000,                  // Maximum retry delay (ms)
      backoffMultiplier: 2,             // Exponential backoff multiplier
      jitterMax: 100,                   // Maximum random jitter (ms)
      retryableErrors: [                // Error types that can be retried
        'timeout',
        'connection_lost',
        'buffer_overflow',
        'communication_error',
        'temporary_error'
      ],
      fatalErrors: [                    // Error types that should not be retried
        'syntax_error',
        'hard_limit',
        'soft_limit',
        'invalid_command',
        'machine_alarm'
      ],
      retryStrategies: {                // Different strategies for different command types
        movement: { maxRetries: 2, initialDelay: 1000 },
        homing: { maxRetries: 1, initialDelay: 2000 },
        probe: { maxRetries: 0 },       // Never retry probe commands
        spindle: { maxRetries: 3, initialDelay: 300 },
        coolant: { maxRetries: 3, initialDelay: 300 }
      },
      enableCircuitBreaker: true,       // Enable circuit breaker pattern
      circuitBreakerThreshold: 5,       // Failures before opening circuit
      circuitBreakerTimeout: 30000,     // Circuit breaker reset timeout
      ...config
    };
    
    this.retryHistory = new Map();      // Track retry attempts per command
    this.failureStats = {
      totalRetries: 0,
      successfulRetries: 0,
      failedRetries: 0,
      circuitBreakerTrips: 0
    };
    
    this.circuitBreaker = {
      state: 'closed',                  // closed, open, half-open
      failureCount: 0,
      lastFailureTime: null,
      nextAttemptTime: null
    };
  }

  /**
   * Attempt to execute a command with retry logic
   */
  async executeWithRetry(commandFunction, command, options = {}) {
    const commandId = options.commandId || this.generateCommandId();
    const commandType = this.classifyCommand(command);
    const strategy = this.getRetryStrategy(commandType);
    
    debug('Starting command execution with retry', {
      commandId,
      command,
      commandType,
      strategy
    });
    
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new Error('Circuit breaker is open - too many recent failures');
    }
    
    let lastError = null;
    let retryCount = 0;
    
    while (retryCount <= strategy.maxRetries) {
      try {
        // Execute the command
        const result = await commandFunction(command, options);
        
        // Success - reset failure count and record success
        this.recordSuccess(commandId, retryCount);
        
        if (retryCount > 0) {
          this.failureStats.successfulRetries++;
          this.emit('retrySuccess', {
            commandId,
            command,
            retryCount,
            totalTime: Date.now() - this.retryHistory.get(commandId)?.startTime
          });
        }
        
        return result;
        
      } catch (err) {
        lastError = err;
        
        // Classify the error
        const errorType = this.classifyError(err);
        
        // Check if error is retryable
        if (!this.isRetryableError(errorType) || retryCount >= strategy.maxRetries) {
          this.recordFailure(commandId, err, retryCount);
          break;
        }
        
        retryCount++;
        this.failureStats.totalRetries++;
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(retryCount, strategy);
        
        warn('Command failed, retrying', {
          commandId,
          command,
          error: err.message,
          errorType,
          retryCount,
          maxRetries: strategy.maxRetries,
          delay
        });
        
        this.emit('retryAttempt', {
          commandId,
          command,
          error: err,
          errorType,
          retryCount,
          delay
        });
        
        // Record retry attempt
        this.recordRetryAttempt(commandId, command, err, retryCount);
        
        // Wait before retry
        await this.delay(delay);
        
        // Execute recovery sequence if needed
        if (this.needsRecovery(errorType)) {
          await this.executeRecoverySequence(errorType, command);
        }
      }
    }
    
    // All retries exhausted
    this.recordFailure(commandId, lastError, retryCount);
    this.failureStats.failedRetries++;
    
    this.emit('retryExhausted', {
      commandId,
      command,
      error: lastError,
      retryCount
    });
    
    throw new Error(`Command failed after ${retryCount} retries: ${lastError.message}`);
  }

  /**
   * Classify command type for retry strategy selection
   */
  classifyCommand(command) {
    const upperCommand = command.toString().toUpperCase();
    
    if (upperCommand.includes('G0') || upperCommand.includes('G1') || 
        upperCommand.includes('G2') || upperCommand.includes('G3')) {
      return 'movement';
    }
    if (upperCommand.includes('$H') || upperCommand.includes('G28')) {
      return 'homing';
    }
    if (upperCommand.includes('G38')) {
      return 'probe';
    }
    if (upperCommand.includes('M3') || upperCommand.includes('M4') || upperCommand.includes('M5')) {
      return 'spindle';
    }
    if (upperCommand.includes('M7') || upperCommand.includes('M8') || upperCommand.includes('M9')) {
      return 'coolant';
    }
    
    return 'general';
  }

  /**
   * Classify error type for retry decision
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (message.includes('connection') || message.includes('serial')) {
      return 'connection_lost';
    }
    if (message.includes('buffer') || message.includes('overflow')) {
      return 'buffer_overflow';
    }
    if (message.includes('alarm')) {
      return 'machine_alarm';
    }
    if (message.includes('limit')) {
      return message.includes('hard') ? 'hard_limit' : 'soft_limit';
    }
    if (message.includes('syntax') || message.includes('invalid')) {
      return 'syntax_error';
    }
    if (message.includes('grbl') || message.includes('protocol')) {
      return 'communication_error';
    }
    
    return 'unknown_error';
  }

  /**
   * Check if error type is retryable
   */
  isRetryableError(errorType) {
    return this.config.retryableErrors.includes(errorType) && 
           !this.config.fatalErrors.includes(errorType);
  }

  /**
   * Get retry strategy for command type
   */
  getRetryStrategy(commandType) {
    const strategy = this.config.retryStrategies[commandType];
    
    return {
      maxRetries: strategy?.maxRetries ?? this.config.maxRetries,
      initialDelay: strategy?.initialDelay ?? this.config.initialDelay
    };
  }

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateRetryDelay(retryCount, strategy) {
    // Exponential backoff
    let delay = strategy.initialDelay * Math.pow(this.config.backoffMultiplier, retryCount - 1);
    
    // Cap at maximum delay
    delay = Math.min(delay, this.config.maxDelay);
    
    // Add random jitter to prevent thundering herd
    const jitter = Math.random() * this.config.jitterMax;
    delay += jitter;
    
    return Math.floor(delay);
  }

  /**
   * Check if recovery sequence is needed
   */
  needsRecovery(errorType) {
    return ['connection_lost', 'machine_alarm', 'buffer_overflow'].includes(errorType);
  }

  /**
   * Execute recovery sequence for error type
   */
  async executeRecoverySequence(errorType, failedCommand) {
    debug('Executing recovery sequence', { errorType, failedCommand });
    
    try {
      switch (errorType) {
        case 'connection_lost':
          await this.recoverConnection();
          break;
          
        case 'machine_alarm':
          await this.recoverFromAlarm();
          break;
          
        case 'buffer_overflow':
          await this.recoverFromBufferOverflow();
          break;
          
        default:
          // Generic recovery - just wait
          await this.delay(1000);
      }
      
      this.emit('recoveryCompleted', { errorType, failedCommand });
      
    } catch (recoveryError) {
      warn('Recovery sequence failed', {
        errorType,
        recoveryError: recoveryError.message
      });
      
      this.emit('recoveryFailed', { errorType, recoveryError });
      throw recoveryError;
    }
  }

  /**
   * Recover from connection loss
   */
  async recoverConnection() {
    // This would typically involve reconnecting to the serial port
    // For now, just wait for connection to stabilize
    debug('Attempting connection recovery');
    await this.delay(2000);
  }

  /**
   * Recover from machine alarm
   */
  async recoverFromAlarm() {
    // This would typically involve clearing alarms and checking machine state
    debug('Attempting alarm recovery');
    await this.delay(1000);
    
    // Could send alarm clear command here
    // await commandManager.sendCommand('$X');
  }

  /**
   * Recover from buffer overflow
   */
  async recoverFromBufferOverflow() {
    // Wait for buffer to drain
    debug('Waiting for buffer recovery');
    await this.delay(500);
  }

  /**
   * Record retry attempt
   */
  recordRetryAttempt(commandId, command, error, retryCount) {
    if (!this.retryHistory.has(commandId)) {
      this.retryHistory.set(commandId, {
        command,
        startTime: Date.now(),
        attempts: []
      });
    }
    
    this.retryHistory.get(commandId).attempts.push({
      retryCount,
      error: error.message,
      timestamp: Date.now()
    });
  }

  /**
   * Record successful command execution
   */
  recordSuccess(commandId, retryCount) {
    if (retryCount > 0) {
      debug('Command succeeded after retries', { commandId, retryCount });
    }
    
    // Reset circuit breaker failure count on success
    this.circuitBreaker.failureCount = 0;
    
    // Clean up retry history
    this.retryHistory.delete(commandId);
  }

  /**
   * Record command failure
   */
  recordFailure(commandId, error, retryCount) {
    error('Command failed permanently', {
      commandId,
      error: error.message,
      retryCount
    });
    
    // Update circuit breaker
    this.updateCircuitBreaker();
    
    // Keep failure in history for analysis
    if (this.retryHistory.has(commandId)) {
      this.retryHistory.get(commandId).finalError = error.message;
      this.retryHistory.get(commandId).finalRetryCount = retryCount;
    }
  }

  /**
   * Update circuit breaker state
   */
  updateCircuitBreaker() {
    if (!this.config.enableCircuitBreaker) return;
    
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
      this.circuitBreaker.state = 'open';
      this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreakerTimeout;
      this.failureStats.circuitBreakerTrips++;
      
      warn('Circuit breaker opened due to repeated failures', {
        failureCount: this.circuitBreaker.failureCount,
        nextAttemptTime: new Date(this.circuitBreaker.nextAttemptTime)
      });
      
      this.emit('circuitBreakerOpened', {
        failureCount: this.circuitBreaker.failureCount,
        timeout: this.config.circuitBreakerTimeout
      });
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitOpen() {
    if (!this.config.enableCircuitBreaker || this.circuitBreaker.state === 'closed') {
      return false;
    }
    
    const now = Date.now();
    
    if (this.circuitBreaker.state === 'open') {
      if (now >= this.circuitBreaker.nextAttemptTime) {
        // Transition to half-open state
        this.circuitBreaker.state = 'half-open';
        debug('Circuit breaker transitioning to half-open state');
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Generate unique command ID
   */
  generateCommandId() {
    return `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Promise-based delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get retry statistics
   */
  getStatistics() {
    const activeRetries = this.retryHistory.size;
    const avgRetryCount = this.failureStats.totalRetries > 0 ? 
      this.failureStats.totalRetries / (this.failureStats.successfulRetries + this.failureStats.failedRetries) : 0;
    
    return {
      ...this.failureStats,
      activeRetries,
      avgRetryCount,
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failureCount: this.circuitBreaker.failureCount,
        isOpen: this.isCircuitOpen(),
        nextAttemptTime: this.circuitBreaker.nextAttemptTime
      },
      config: {
        maxRetries: this.config.maxRetries,
        enableCircuitBreaker: this.config.enableCircuitBreaker,
        circuitBreakerThreshold: this.config.circuitBreakerThreshold
      }
    };
  }

  /**
   * Get detailed retry history
   */
  getRetryHistory() {
    return Array.from(this.retryHistory.entries()).map(([commandId, history]) => ({
      commandId,
      command: history.command,
      startTime: history.startTime,
      duration: Date.now() - history.startTime,
      attempts: history.attempts,
      finalError: history.finalError,
      finalRetryCount: history.finalRetryCount
    }));
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker() {
    this.circuitBreaker.state = 'closed';
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;
    this.circuitBreaker.nextAttemptTime = null;
    
    debug('Circuit breaker manually reset');
    this.emit('circuitBreakerReset');
  }

  /**
   * Clear retry history
   */
  clearHistory() {
    this.retryHistory.clear();
    debug('Retry history cleared');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    debug('Retry manager configuration updated', newConfig);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.retryHistory.clear();
    this.removeAllListeners();
  }
}