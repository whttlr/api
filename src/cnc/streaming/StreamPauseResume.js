/**
 * Stream Pause/Resume Manager
 * 
 * Handles pause and resume functionality for streaming operations
 * with state preservation and recovery mechanisms.
 */

import { EventEmitter } from 'events';
import { debug, info, warn } from '../../lib/logger/LoggerService.js';

export class StreamPauseResume extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enablePauseResume: true,          // Enable pause/resume functionality
      pauseTimeout: 5000,               // Timeout for pause operation (ms)
      resumeTimeout: 5000,              // Timeout for resume operation (ms)
      saveStateOnPause: true,           // Save state when pausing
      validateStateOnResume: true,      // Validate state when resuming
      maxPauseDuration: 300000,         // Maximum pause duration (5 minutes)
      enableGracefulPause: true,        // Complete current operation before pausing
      trackPauseMetrics: true,          // Track pause/resume metrics
      ...config
    };
    
    this.pauseState = {
      isPaused: false,
      isResuming: false,
      pauseTime: null,
      resumeTime: null,
      pauseDuration: 0,
      totalPauseDuration: 0,
      pauseReason: null,
      savedState: null
    };
    
    this.pauseMetrics = {
      totalPauses: 0,
      totalResumes: 0,
      averagePauseDuration: 0,
      longestPause: 0,
      shortestPause: Infinity,
      failedPauses: 0,
      failedResumes: 0
    };
    
    this.pauseQueue = [];
    this.resumeCallbacks = [];
  }
  
  /**
   * Request stream pause
   */
  async requestPause(reason = 'user_request', options = {}) {
    try {
      if (this.pauseState.isPaused) {
        warn('Stream already paused');
        return { success: false, reason: 'already_paused' };
      }
      
      if (!this.config.enablePauseResume) {
        warn('Pause/resume functionality disabled');
        return { success: false, reason: 'disabled' };
      }
      
      debug('Requesting stream pause', { reason });
      
      const pauseStartTime = Date.now();
      
      // Handle graceful pause if enabled
      if (this.config.enableGracefulPause && options.graceful !== false) {
        await this.performGracefulPause(reason, options);
      } else {
        await this.performImmediatePause(reason, options);
      }
      
      // Update pause state
      this.pauseState = {
        isPaused: true,
        isResuming: false,
        pauseTime: Date.now(),
        resumeTime: null,
        pauseDuration: 0,
        pauseReason: reason,
        savedState: options.preserveState ? this.captureCurrentState() : null
      };
      
      // Update metrics
      this.updatePauseMetrics(true, Date.now() - pauseStartTime);
      
      info('Stream paused successfully', { reason, graceful: options.graceful });
      
      this.emit('streamPaused', {
        reason,
        pauseTime: this.pauseState.pauseTime,
        graceful: this.config.enableGracefulPause && options.graceful !== false
      });
      
      // Set up pause timeout if configured
      if (this.config.maxPauseDuration > 0) {
        this.setupPauseTimeout();
      }
      
      return { success: true, pauseTime: this.pauseState.pauseTime };
      
    } catch (err) {
      this.pauseMetrics.failedPauses++;
      warn('Failed to pause stream', { reason, error: err.message });
      
      this.emit('pauseFailed', {
        reason,
        error: err.message
      });
      
      return { success: false, reason: 'pause_failed', error: err.message };
    }
  }
  
  /**
   * Request stream resume
   */
  async requestResume(options = {}) {
    try {
      if (!this.pauseState.isPaused) {
        warn('Stream not paused');
        return { success: false, reason: 'not_paused' };
      }
      
      if (this.pauseState.isResuming) {
        warn('Resume already in progress');
        return { success: false, reason: 'resume_in_progress' };
      }
      
      debug('Requesting stream resume');
      
      this.pauseState.isResuming = true;
      const resumeStartTime = Date.now();
      
      // Calculate pause duration
      this.pauseState.pauseDuration = resumeStartTime - this.pauseState.pauseTime;
      this.pauseState.totalPauseDuration += this.pauseState.pauseDuration;
      
      // Validate state if enabled
      if (this.config.validateStateOnResume && this.pauseState.savedState) {
        await this.validateResumeState(this.pauseState.savedState, options);
      }
      
      // Perform resume operation
      await this.performResume(options);
      
      // Update pause state
      const resumeTime = Date.now();
      this.pauseState = {
        ...this.pauseState,
        isPaused: false,
        isResuming: false,
        resumeTime,
        savedState: null
      };
      
      // Update metrics
      this.updateResumeMetrics(true, resumeTime - resumeStartTime, this.pauseState.pauseDuration);
      
      info('Stream resumed successfully', { 
        pauseDuration: `${this.pauseState.pauseDuration}ms`,
        resumeTime: this.pauseState.resumeTime
      });
      
      this.emit('streamResumed', {
        pauseDuration: this.pauseState.pauseDuration,
        resumeTime: this.pauseState.resumeTime,
        pauseReason: this.pauseState.pauseReason
      });
      
      // Execute resume callbacks
      this.executeResumeCallbacks();
      
      return { 
        success: true, 
        resumeTime: this.pauseState.resumeTime,
        pauseDuration: this.pauseState.pauseDuration
      };
      
    } catch (err) {
      this.pauseMetrics.failedResumes++;
      this.pauseState.isResuming = false;
      
      warn('Failed to resume stream', { error: err.message });
      
      this.emit('resumeFailed', {
        error: err.message,
        pauseDuration: Date.now() - this.pauseState.pauseTime
      });
      
      return { success: false, reason: 'resume_failed', error: err.message };
    }
  }
  
  /**
   * Perform graceful pause
   */
  async performGracefulPause(reason, options) {
    debug('Performing graceful pause');
    
    // Emit pause request to allow components to finish current operations
    this.emit('pauseRequested', {
      reason,
      graceful: true,
      timeout: this.config.pauseTimeout
    });
    
    // Wait for components to acknowledge pause readiness
    await this.waitForPauseReadiness();
    
    // Perform the actual pause
    this.emit('pauseExecute', { reason, graceful: true });
  }
  
  /**
   * Perform immediate pause
   */
  async performImmediatePause(reason, options) {
    debug('Performing immediate pause');
    
    // Emit immediate pause to all components
    this.emit('pauseExecute', { reason, graceful: false, immediate: true });
  }
  
  /**
   * Perform resume operation
   */
  async performResume(options) {
    debug('Performing resume operation');
    
    // Pre-resume validation
    this.emit('resumeValidate', { 
      savedState: this.pauseState.savedState,
      pauseDuration: this.pauseState.pauseDuration
    });
    
    // Execute resume
    this.emit('resumeExecute', {
      pauseDuration: this.pauseState.pauseDuration,
      pauseReason: this.pauseState.pauseReason,
      savedState: this.pauseState.savedState
    });
  }
  
  /**
   * Wait for pause readiness from components
   */
  async waitForPauseReadiness() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Pause readiness timeout after ${this.config.pauseTimeout}ms`));
      }, this.config.pauseTimeout);
      
      const checkReadiness = () => {
        // In a real implementation, you'd check if all components are ready
        // For now, we'll simulate with a short delay
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 100);
      };
      
      checkReadiness();
    });
  }
  
  /**
   * Capture current state for preservation
   */
  captureCurrentState() {
    const state = {
      timestamp: Date.now(),
      pauseReason: this.pauseState.pauseReason,
      // Add more state information as needed
      streamPosition: null, // Would be populated by streaming manager
      bufferState: null,    // Would be populated by buffer manager
      connectionState: null // Would be populated by connection manager
    };
    
    debug('State captured for pause preservation');
    return state;
  }
  
  /**
   * Validate state before resuming
   */
  async validateResumeState(savedState, options) {
    debug('Validating state before resume');
    
    // Check if saved state is still valid
    if (!savedState || !savedState.timestamp) {
      throw new Error('Invalid saved state');
    }
    
    // Check if pause duration is within acceptable limits
    const pauseDuration = Date.now() - this.pauseState.pauseTime;
    if (pauseDuration > this.config.maxPauseDuration) {
      warn('Pause duration exceeded maximum limit', {
        duration: pauseDuration,
        limit: this.config.maxPauseDuration
      });
    }
    
    // Emit validation request to components
    this.emit('validateResumeState', {
      savedState,
      pauseDuration,
      options
    });
  }
  
  /**
   * Set up pause timeout
   */
  setupPauseTimeout() {
    setTimeout(() => {
      if (this.pauseState.isPaused) {
        warn('Pause duration exceeded maximum limit, forcing resume');
        
        this.emit('pauseTimeoutExceeded', {
          pauseDuration: Date.now() - this.pauseState.pauseTime,
          maxDuration: this.config.maxPauseDuration
        });
        
        // Force resume
        this.requestResume({ forced: true });
      }
    }, this.config.maxPauseDuration);
  }
  
  /**
   * Add resume callback
   */
  addResumeCallback(callback) {
    if (typeof callback === 'function') {
      this.resumeCallbacks.push(callback);
    }
  }
  
  /**
   * Execute resume callbacks
   */
  executeResumeCallbacks() {
    this.resumeCallbacks.forEach(callback => {
      try {
        callback({
          pauseDuration: this.pauseState.pauseDuration,
          resumeTime: this.pauseState.resumeTime
        });
      } catch (err) {
        warn('Resume callback failed', { error: err.message });
      }
    });
    
    // Clear callbacks after execution
    this.resumeCallbacks = [];
  }
  
  /**
   * Update pause metrics
   */
  updatePauseMetrics(success, operationTime) {
    if (success) {
      this.pauseMetrics.totalPauses++;
    } else {
      this.pauseMetrics.failedPauses++;
    }
  }
  
  /**
   * Update resume metrics
   */
  updateResumeMetrics(success, operationTime, pauseDuration) {
    if (success) {
      this.pauseMetrics.totalResumes++;
      
      // Update pause duration statistics
      this.pauseMetrics.longestPause = Math.max(this.pauseMetrics.longestPause, pauseDuration);
      this.pauseMetrics.shortestPause = Math.min(this.pauseMetrics.shortestPause, pauseDuration);
      
      if (this.pauseMetrics.totalPauses > 0) {
        this.pauseMetrics.averagePauseDuration = 
          this.pauseState.totalPauseDuration / this.pauseMetrics.totalPauses;
      }
    } else {
      this.pauseMetrics.failedResumes++;
    }
  }
  
  /**
   * Get pause state
   */
  getPauseState() {
    return {
      ...this.pauseState,
      currentPauseDuration: this.pauseState.isPaused ? 
        Date.now() - this.pauseState.pauseTime : 0
    };
  }
  
  /**
   * Get pause metrics
   */
  getPauseMetrics() {
    return {
      ...this.pauseMetrics,
      pauseSuccessRate: this.pauseMetrics.totalPauses > 0 ? 
        ((this.pauseMetrics.totalPauses - this.pauseMetrics.failedPauses) / this.pauseMetrics.totalPauses) * 100 : 0,
      resumeSuccessRate: this.pauseMetrics.totalResumes > 0 ? 
        ((this.pauseMetrics.totalResumes - this.pauseMetrics.failedResumes) / this.pauseMetrics.totalResumes) * 100 : 0
    };
  }
  
  /**
   * Check if stream can be paused
   */
  canPause() {
    return this.config.enablePauseResume && 
           !this.pauseState.isPaused && 
           !this.pauseState.isResuming;
  }
  
  /**
   * Check if stream can be resumed
   */
  canResume() {
    return this.config.enablePauseResume && 
           this.pauseState.isPaused && 
           !this.pauseState.isResuming;
  }
  
  /**
   * Get pause/resume capabilities
   */
  getCapabilities() {
    return {
      canPause: this.canPause(),
      canResume: this.canResume(),
      enablePauseResume: this.config.enablePauseResume,
      enableGracefulPause: this.config.enableGracefulPause,
      maxPauseDuration: this.config.maxPauseDuration,
      currentState: this.pauseState.isPaused ? 'paused' : 'running'
    };
  }
  
  /**
   * Export pause/resume data
   */
  exportData() {
    return {
      state: this.getPauseState(),
      metrics: this.getPauseMetrics(),
      capabilities: this.getCapabilities(),
      config: { ...this.config }
    };
  }
  
  /**
   * Reset pause/resume statistics
   */
  resetStatistics() {
    this.pauseMetrics = {
      totalPauses: 0,
      totalResumes: 0,
      averagePauseDuration: 0,
      longestPause: 0,
      shortestPause: Infinity,
      failedPauses: 0,
      failedResumes: 0
    };
    
    this.pauseState.totalPauseDuration = 0;
    
    debug('Pause/resume statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    debug('Pause/resume configuration updated');
    this.emit('configurationUpdated', { config: this.config });
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    // Clear any pending callbacks
    this.resumeCallbacks = [];
    this.pauseQueue = [];
    
    // Reset state
    if (this.pauseState.isPaused) {
      this.pauseState.isPaused = false;
      this.pauseState.isResuming = false;
    }
    
    this.removeAllListeners();
    
    debug('Pause/resume manager cleaned up');
  }
}