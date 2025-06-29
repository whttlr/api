/**
 * Progress Tracker for G-code Streaming
 * 
 * Tracks execution progress, estimates completion times,
 * and provides detailed progress reporting for G-code streaming.
 */

import { EventEmitter } from 'events';
import { debug } from '../../lib/logger/LoggerService.js';

export class ProgressTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      updateInterval: 250,             // Progress update interval (ms)
      smoothingWindow: 10,             // Commands to average for rate calculation
      estimationWindow: 50,            // Commands to use for time estimation
      trackDistances: true,            // Track movement distances
      trackOperations: true,           // Track operation types
      ...config
    };
    
    this.state = {
      totalLines: 0,
      currentLine: 0,
      startTime: null,
      lastUpdateTime: null,
      completedCommands: 0,
      totalDistance: 0,
      completedDistance: 0,
      currentOperation: 'initializing'
    };
    
    this.progressHistory = [];
    this.operationStats = {
      rapid: { count: 0, distance: 0, time: 0 },
      linear: { count: 0, distance: 0, time: 0 },
      arc: { count: 0, distance: 0, time: 0 },
      dwell: { count: 0, time: 0 },
      spindle: { count: 0 },
      other: { count: 0 }
    };
    
    this.recentCompletions = [];
    this.currentPosition = { x: 0, y: 0, z: 0 };
  }

  /**
   * Initialize progress tracking
   */
  initialize(totalLines, fileName = null) {
    this.state = {
      totalLines,
      currentLine: 0,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      completedCommands: 0,
      totalDistance: 0,
      completedDistance: 0,
      currentOperation: 'streaming',
      fileName
    };
    
    this.progressHistory = [];
    this.recentCompletions = [];
    this.operationStats = {
      rapid: { count: 0, distance: 0, time: 0 },
      linear: { count: 0, distance: 0, time: 0 },
      arc: { count: 0, distance: 0, time: 0 },
      dwell: { count: 0, time: 0 },
      spindle: { count: 0 },
      other: { count: 0 }
    };
    
    debug('Progress tracker initialized', {
      totalLines,
      fileName,
      trackDistances: this.config.trackDistances
    });
  }

  /**
   * Update progress with completed command
   */
  updateProgress(lineNumber, response, metadata = {}) {
    const now = Date.now();
    
    this.state.currentLine = Math.max(this.state.currentLine, lineNumber);
    this.state.completedCommands++;
    this.state.lastUpdateTime = now;
    
    // Track command completion
    const completion = {
      line: lineNumber,
      timestamp: now,
      responseTime: metadata.responseTime || 0,
      commandType: this.classifyCommand(metadata.command),
      distance: 0
    };
    
    // Calculate distance if movement command
    if (this.config.trackDistances && metadata.command) {
      const distance = this.calculateCommandDistance(metadata.command, metadata);
      completion.distance = distance;
      this.state.completedDistance += distance;
    }
    
    // Update operation statistics
    if (this.config.trackOperations) {
      this.updateOperationStats(completion);
    }
    
    // Track recent completions for rate calculation
    this.recentCompletions.push(completion);
    if (this.recentCompletions.length > this.config.smoothingWindow) {
      this.recentCompletions.shift();
    }
    
    // Add to progress history
    if (this.progressHistory.length === 0 || 
        now - this.progressHistory[this.progressHistory.length - 1].timestamp > this.config.updateInterval) {
      
      this.progressHistory.push({
        timestamp: now,
        line: lineNumber,
        completedCommands: this.state.completedCommands,
        completedDistance: this.state.completedDistance,
        completionRate: this.getCurrentCompletionRate(),
        estimatedRemaining: this.getEstimatedTimeRemaining()
      });
      
      // Limit history size
      if (this.progressHistory.length > 1000) {
        this.progressHistory = this.progressHistory.slice(-500);
      }
    }
  }

  /**
   * Classify command type for statistics
   */
  classifyCommand(command) {
    if (!command) return 'other';
    
    const cleanCommand = command.trim().toUpperCase();
    
    if (cleanCommand.includes('G0')) return 'rapid';
    if (cleanCommand.includes('G1')) return 'linear';
    if (cleanCommand.includes('G2') || cleanCommand.includes('G3')) return 'arc';
    if (cleanCommand.includes('G4')) return 'dwell';
    if (cleanCommand.includes('M3') || cleanCommand.includes('M4') || cleanCommand.includes('M5')) return 'spindle';
    
    return 'other';
  }

  /**
   * Calculate distance for movement command
   */
  calculateCommandDistance(command, metadata = {}) {
    if (!command) return 0;
    
    const params = this.parseCommandParameters(command);
    const newPosition = { ...this.currentPosition };
    
    // Update position based on command parameters
    if (params.X !== undefined) newPosition.x = params.X;
    if (params.Y !== undefined) newPosition.y = params.Y;
    if (params.Z !== undefined) newPosition.z = params.Z;
    
    // Calculate distance
    const distance = this.calculateDistance(this.currentPosition, newPosition);
    
    // Update current position
    this.currentPosition = newPosition;
    
    return distance;
  }

  /**
   * Parse command parameters
   */
  parseCommandParameters(command) {
    const params = {};
    const paramRegex = /([XYZ])(-?\d*\.?\d+)/g;
    let match;
    
    while ((match = paramRegex.exec(command)) !== null) {
      params[match[1]] = parseFloat(match[2]);
    }
    
    return params;
  }

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1, point2) {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    const dz = point2.z - point1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Update operation statistics
   */
  updateOperationStats(completion) {
    const type = completion.commandType;
    const stats = this.operationStats[type];
    
    if (stats) {
      stats.count++;
      if (completion.distance) {
        stats.distance = (stats.distance || 0) + completion.distance;
      }
      if (completion.responseTime) {
        stats.time = (stats.time || 0) + completion.responseTime;
      }
    }
  }

  /**
   * Get current completion rate (commands per second)
   */
  getCurrentCompletionRate() {
    if (this.recentCompletions.length < 2) {
      return 0;
    }
    
    const recent = this.recentCompletions.slice(-this.config.smoothingWindow);
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    
    if (timeSpan === 0) return 0;
    
    return (recent.length - 1) / (timeSpan / 1000); // commands per second
  }

  /**
   * Get estimated time remaining
   */
  getEstimatedTimeRemaining() {
    const remainingLines = this.state.totalLines - this.state.currentLine;
    
    if (remainingLines <= 0) {
      return 0;
    }
    
    const completionRate = this.getCurrentCompletionRate();
    
    if (completionRate === 0) {
      // Fallback to overall average if no recent data
      const elapsed = Date.now() - this.state.startTime;
      const overallRate = this.state.completedCommands / (elapsed / 1000);
      return overallRate > 0 ? remainingLines / overallRate * 1000 : null;
    }
    
    return (remainingLines / completionRate) * 1000; // milliseconds
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage() {
    if (this.state.totalLines === 0) return 0;
    return Math.min(100, (this.state.currentLine / this.state.totalLines) * 100);
  }

  /**
   * Get elapsed time
   */
  getElapsedTime() {
    return this.state.startTime ? Date.now() - this.state.startTime : 0;
  }

  /**
   * Get basic progress information
   */
  getProgress() {
    const elapsed = this.getElapsedTime();
    const remaining = this.getEstimatedTimeRemaining();
    
    return {
      currentLine: this.state.currentLine,
      totalLines: this.state.totalLines,
      completionPercentage: this.getCompletionPercentage(),
      elapsedTime: elapsed,
      estimatedRemaining: remaining,
      estimatedTotal: remaining ? elapsed + remaining : null,
      completionRate: this.getCurrentCompletionRate(),
      completedCommands: this.state.completedCommands,
      currentOperation: this.state.currentOperation
    };
  }

  /**
   * Get detailed progress information
   */
  getDetailedProgress() {
    const basic = this.getProgress();
    
    return {
      ...basic,
      fileName: this.state.fileName,
      distances: {
        total: this.state.totalDistance,
        completed: this.state.completedDistance,
        remaining: this.state.totalDistance - this.state.completedDistance,
        completionPercentage: this.state.totalDistance > 0 ? 
          (this.state.completedDistance / this.state.totalDistance) * 100 : 0
      },
      operationStats: { ...this.operationStats },
      currentPosition: { ...this.currentPosition },
      recentActivity: {
        averageResponseTime: this.getAverageResponseTime(),
        commandsInLastMinute: this.getCommandsInTimeWindow(60000),
        distanceInLastMinute: this.getDistanceInTimeWindow(60000)
      },
      progressHistory: this.progressHistory.slice(-10) // Last 10 progress points
    };
  }

  /**
   * Get average response time for recent commands
   */
  getAverageResponseTime() {
    if (this.recentCompletions.length === 0) return 0;
    
    const total = this.recentCompletions.reduce((sum, completion) => 
      sum + (completion.responseTime || 0), 0);
    
    return total / this.recentCompletions.length;
  }

  /**
   * Get commands completed in time window
   */
  getCommandsInTimeWindow(windowMs) {
    const cutoff = Date.now() - windowMs;
    return this.recentCompletions.filter(completion => 
      completion.timestamp > cutoff).length;
  }

  /**
   * Get distance covered in time window
   */
  getDistanceInTimeWindow(windowMs) {
    const cutoff = Date.now() - windowMs;
    return this.recentCompletions
      .filter(completion => completion.timestamp > cutoff)
      .reduce((sum, completion) => sum + completion.distance, 0);
  }

  /**
   * Set total distance for progress calculation
   */
  setTotalDistance(distance) {
    this.state.totalDistance = distance;
  }

  /**
   * Update current operation
   */
  setCurrentOperation(operation) {
    this.state.currentOperation = operation;
  }

  /**
   * Get progress trend (improving/degrading performance)
   */
  getProgressTrend() {
    if (this.progressHistory.length < 5) {
      return { trend: 'unknown', confidence: 0 };
    }
    
    const recent = this.progressHistory.slice(-5);
    const rates = recent.map(p => p.completionRate).filter(r => r > 0);
    
    if (rates.length < 3) {
      return { trend: 'unknown', confidence: 0 };
    }
    
    const firstHalf = rates.slice(0, Math.floor(rates.length / 2));
    const secondHalf = rates.slice(Math.floor(rates.length / 2));
    
    const avgFirst = firstHalf.reduce((sum, rate) => sum + rate, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, rate) => sum + rate, 0) / secondHalf.length;
    
    const change = (avgSecond - avgFirst) / avgFirst;
    
    let trend = 'stable';
    if (change > 0.1) trend = 'improving';
    else if (change < -0.1) trend = 'degrading';
    
    return {
      trend,
      confidence: Math.min(1, rates.length / 10),
      changePercent: change * 100
    };
  }

  /**
   * Reset progress tracking
   */
  reset() {
    this.state = {
      totalLines: 0,
      currentLine: 0,
      startTime: null,
      lastUpdateTime: null,
      completedCommands: 0,
      totalDistance: 0,
      completedDistance: 0,
      currentOperation: 'initializing'
    };
    
    this.progressHistory = [];
    this.recentCompletions = [];
    this.currentPosition = { x: 0, y: 0, z: 0 };
    this.operationStats = {
      rapid: { count: 0, distance: 0, time: 0 },
      linear: { count: 0, distance: 0, time: 0 },
      arc: { count: 0, distance: 0, time: 0 },
      dwell: { count: 0, time: 0 },
      spindle: { count: 0 },
      other: { count: 0 }
    };
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.reset();
    this.removeAllListeners();
  }
}