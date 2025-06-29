/**
 * Performance Metrics Tracker
 * 
 * Tracks comprehensive performance metrics for CNC operations including
 * command throughput, response times, buffer utilization, and system health.
 */

import { EventEmitter } from 'events';
import { debug, warn } from '../../lib/logger/LoggerService.js';

export class PerformanceTracker extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      metricsInterval: 1000,            // Metrics calculation interval (ms)
      historyRetention: 3600000,        // 1 hour of history retention
      alertThresholds: {
        highResponseTime: 5000,         // ms
        lowThroughput: 1.0,             // commands/sec
        highBufferUtilization: 80,      // %
        highErrorRate: 10,              // %
        connectionLag: 2000             // ms
      },
      enableRealTimeMetrics: true,      // Calculate metrics in real-time
      enableTrendAnalysis: true,        // Analyze performance trends
      enableAlerting: true,             // Send performance alerts
      ...config
    };
    
    this.metrics = {
      // Command execution metrics
      commands: {
        total: 0,
        successful: 0,
        failed: 0,
        retried: 0,
        rate: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        totalResponseTime: 0
      },
      
      // Throughput metrics
      throughput: {
        commandsPerSecond: 0,
        averageCommandsPerSecond: 0,
        peakCommandsPerSecond: 0,
        commandsLastMinute: 0,
        bytesPerSecond: 0,
        linesPerSecond: 0
      },
      
      // Buffer metrics
      buffer: {
        averageUtilization: 0,
        peakUtilization: 0,
        lowWaterMark: 100,
        utilizationHistory: []
      },
      
      // Error metrics
      errors: {
        total: 0,
        rate: 0,
        timeouts: 0,
        connectionErrors: 0,
        grblErrors: 0,
        recoveryAttempts: 0,
        successfulRecoveries: 0
      },
      
      // Connection metrics
      connection: {
        uptime: 0,
        disconnections: 0,
        reconnections: 0,
        averageLag: 0,
        maxLag: 0,
        stability: 100
      },
      
      // System metrics
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        eventLoopLag: 0,
        gcPauses: 0
      }
    };
    
    this.dataPoints = [];
    this.alertHistory = [];
    this.metricsTimer = null;
    this.startTime = Date.now();
    this.lastMetricsCalculation = Date.now();
    
    // Circular buffers for efficiency
    this.responseTimeBuffer = [];
    this.throughputBuffer = [];
    this.bufferUtilizationBuffer = [];
    this.errorBuffer = [];
    
    this.bufferSize = 1000; // Keep last 1000 data points
  }

  /**
   * Start performance tracking
   */
  start() {
    if (this.metricsTimer) {
      warn('Performance tracking already started');
      return;
    }
    
    this.startTime = Date.now();
    this.lastMetricsCalculation = Date.now();
    
    if (this.config.enableRealTimeMetrics) {
      this.metricsTimer = setInterval(() => {
        this.calculateMetrics();
      }, this.config.metricsInterval);
    }
    
    debug('Performance tracking started');
    this.emit('trackingStarted', { startTime: this.startTime });
  }

  /**
   * Stop performance tracking
   */
  stop() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    debug('Performance tracking stopped', { 
      duration: Date.now() - this.startTime,
      totalCommands: this.metrics.commands.total
    });
    
    this.emit('trackingStopped', this.getMetricsSummary());
  }

  /**
   * Record command execution
   */
  recordCommand(commandData) {
    const now = Date.now();
    
    // Update command metrics
    this.metrics.commands.total++;
    
    if (commandData.success) {
      this.metrics.commands.successful++;
    } else {
      this.metrics.commands.failed++;
      this.recordError(commandData.error, commandData);
    }
    
    if (commandData.retryCount > 0) {
      this.metrics.commands.retried++;
    }
    
    // Record response time
    if (commandData.responseTime) {
      this.recordResponseTime(commandData.responseTime);
    }
    
    // Record throughput data
    this.recordThroughput(commandData, now);
    
    // Emit real-time update if enabled
    if (this.config.enableRealTimeMetrics) {
      this.emit('commandMetrics', {
        totalCommands: this.metrics.commands.total,
        successRate: this.getSuccessRate(),
        averageResponseTime: this.metrics.commands.averageResponseTime
      });
    }
  }

  /**
   * Record response time
   */
  recordResponseTime(responseTime) {
    this.responseTimeBuffer.push({
      time: responseTime,
      timestamp: Date.now()
    });
    
    // Maintain buffer size
    if (this.responseTimeBuffer.length > this.bufferSize) {
      this.responseTimeBuffer.shift();
    }
    
    // Update response time metrics
    this.metrics.commands.totalResponseTime += responseTime;
    this.metrics.commands.averageResponseTime = 
      this.metrics.commands.totalResponseTime / this.metrics.commands.total;
    this.metrics.commands.minResponseTime = 
      Math.min(this.metrics.commands.minResponseTime, responseTime);
    this.metrics.commands.maxResponseTime = 
      Math.max(this.metrics.commands.maxResponseTime, responseTime);
    
    // Check for high response time alert
    if (this.config.enableAlerting && 
        responseTime > this.config.alertThresholds.highResponseTime) {
      this.triggerAlert('high_response_time', {
        responseTime,
        threshold: this.config.alertThresholds.highResponseTime
      });
    }
  }

  /**
   * Record throughput data
   */
  recordThroughput(commandData, timestamp) {
    this.throughputBuffer.push({
      command: commandData.command,
      bytes: commandData.command ? commandData.command.length : 0,
      timestamp: timestamp || Date.now()
    });
    
    // Maintain buffer size
    if (this.throughputBuffer.length > this.bufferSize) {
      this.throughputBuffer.shift();
    }
  }

  /**
   * Record buffer utilization
   */
  recordBufferUtilization(utilization) {
    const now = Date.now();
    
    this.bufferUtilizationBuffer.push({
      utilization,
      timestamp: now
    });
    
    // Maintain buffer size
    if (this.bufferUtilizationBuffer.length > this.bufferSize) {
      this.bufferUtilizationBuffer.shift();
    }
    
    // Update buffer metrics
    this.metrics.buffer.peakUtilization = 
      Math.max(this.metrics.buffer.peakUtilization, utilization);
    this.metrics.buffer.lowWaterMark = 
      Math.min(this.metrics.buffer.lowWaterMark, utilization);
    
    // Check for high buffer utilization alert
    if (this.config.enableAlerting && 
        utilization > this.config.alertThresholds.highBufferUtilization) {
      this.triggerAlert('high_buffer_utilization', {
        utilization,
        threshold: this.config.alertThresholds.highBufferUtilization
      });
    }
  }

  /**
   * Record error
   */
  recordError(error, context = {}) {
    const now = Date.now();
    
    this.errorBuffer.push({
      error: error.message || error.toString(),
      type: this.classifyError(error),
      timestamp: now,
      context
    });
    
    // Maintain buffer size
    if (this.errorBuffer.length > this.bufferSize) {
      this.errorBuffer.shift();
    }
    
    // Update error metrics
    this.metrics.errors.total++;
    
    const errorType = this.classifyError(error);
    switch (errorType) {
      case 'timeout':
        this.metrics.errors.timeouts++;
        break;
      case 'connection':
        this.metrics.errors.connectionErrors++;
        break;
      case 'grbl':
        this.metrics.errors.grblErrors++;
        break;
    }
  }

  /**
   * Record recovery attempt
   */
  recordRecovery(successful = false) {
    this.metrics.errors.recoveryAttempts++;
    if (successful) {
      this.metrics.errors.successfulRecoveries++;
    }
  }

  /**
   * Record connection event
   */
  recordConnectionEvent(eventType, data = {}) {
    const now = Date.now();
    
    switch (eventType) {
      case 'disconnect':
        this.metrics.connection.disconnections++;
        break;
      case 'reconnect':
        this.metrics.connection.reconnections++;
        break;
      case 'lag':
        if (data.lag) {
          this.metrics.connection.maxLag = 
            Math.max(this.metrics.connection.maxLag, data.lag);
          
          // Update average lag (simple moving average)
          this.metrics.connection.averageLag = 
            (this.metrics.connection.averageLag * 0.9) + (data.lag * 0.1);
        }
        break;
    }
    
    // Calculate connection stability
    this.calculateConnectionStability();
  }

  /**
   * Calculate real-time metrics
   */
  calculateMetrics() {
    const now = Date.now();
    const timeDelta = now - this.lastMetricsCalculation;
    
    // Calculate throughput metrics
    this.calculateThroughputMetrics(timeDelta);
    
    // Calculate buffer metrics
    this.calculateBufferMetrics();
    
    // Calculate error rate
    this.calculateErrorRate();
    
    // Update connection uptime
    this.metrics.connection.uptime = now - this.startTime;
    
    // Perform trend analysis
    if (this.config.enableTrendAnalysis) {
      this.performTrendAnalysis();
    }
    
    // Store data point
    this.storeDataPoint(now);
    
    // Emit metrics update
    this.emit('metricsUpdated', this.getCurrentMetrics());
    
    this.lastMetricsCalculation = now;
  }

  /**
   * Calculate throughput metrics
   */
  calculateThroughputMetrics(timeDelta) {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;
    
    // Commands in last second
    const recentCommands = this.throughputBuffer.filter(
      cmd => cmd.timestamp > oneSecondAgo
    );
    this.metrics.throughput.commandsPerSecond = recentCommands.length;
    
    // Commands in last minute
    const lastMinuteCommands = this.throughputBuffer.filter(
      cmd => cmd.timestamp > oneMinuteAgo
    );
    this.metrics.throughput.commandsLastMinute = lastMinuteCommands.length;
    
    // Average commands per second
    if (this.metrics.commands.total > 0 && this.metrics.connection.uptime > 0) {
      this.metrics.throughput.averageCommandsPerSecond = 
        this.metrics.commands.total / (this.metrics.connection.uptime / 1000);
    }
    
    // Peak commands per second
    this.metrics.throughput.peakCommandsPerSecond = 
      Math.max(this.metrics.throughput.peakCommandsPerSecond, 
               this.metrics.throughput.commandsPerSecond);
    
    // Bytes per second
    const recentBytes = recentCommands.reduce((sum, cmd) => sum + cmd.bytes, 0);
    this.metrics.throughput.bytesPerSecond = recentBytes;
    
    // Lines per second (approximate)
    this.metrics.throughput.linesPerSecond = this.metrics.throughput.commandsPerSecond;
    
    // Check for low throughput alert
    if (this.config.enableAlerting && 
        this.metrics.throughput.commandsPerSecond < this.config.alertThresholds.lowThroughput &&
        this.metrics.commands.total > 10) {
      this.triggerAlert('low_throughput', {
        current: this.metrics.throughput.commandsPerSecond,
        threshold: this.config.alertThresholds.lowThroughput
      });
    }
  }

  /**
   * Calculate buffer metrics
   */
  calculateBufferMetrics() {
    if (this.bufferUtilizationBuffer.length === 0) return;
    
    const totalUtilization = this.bufferUtilizationBuffer.reduce(
      (sum, point) => sum + point.utilization, 0
    );
    
    this.metrics.buffer.averageUtilization = 
      totalUtilization / this.bufferUtilizationBuffer.length;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    if (this.metrics.commands.total === 0) {
      this.metrics.errors.rate = 0;
      return;
    }
    
    this.metrics.errors.rate = 
      (this.metrics.commands.failed / this.metrics.commands.total) * 100;
    
    // Check for high error rate alert
    if (this.config.enableAlerting && 
        this.metrics.errors.rate > this.config.alertThresholds.highErrorRate &&
        this.metrics.commands.total > 10) {
      this.triggerAlert('high_error_rate', {
        rate: this.metrics.errors.rate,
        threshold: this.config.alertThresholds.highErrorRate
      });
    }
  }

  /**
   * Calculate connection stability
   */
  calculateConnectionStability() {
    const uptime = this.metrics.connection.uptime;
    const disconnections = this.metrics.connection.disconnections;
    
    if (uptime === 0) {
      this.metrics.connection.stability = 100;
      return;
    }
    
    // Stability decreases with more disconnections
    const stabilityPenalty = Math.min(disconnections * 10, 90);
    this.metrics.connection.stability = Math.max(100 - stabilityPenalty, 0);
  }

  /**
   * Perform trend analysis
   */
  performTrendAnalysis() {
    if (this.dataPoints.length < 10) return;
    
    const recent = this.dataPoints.slice(-10);
    const trends = {
      responseTime: this.calculateTrend(recent.map(p => p.averageResponseTime)),
      throughput: this.calculateTrend(recent.map(p => p.commandsPerSecond)),
      errorRate: this.calculateTrend(recent.map(p => p.errorRate)),
      bufferUtilization: this.calculateTrend(recent.map(p => p.bufferUtilization))
    };
    
    this.emit('trendsUpdated', trends);
  }

  /**
   * Calculate trend (simple linear regression slope)
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = n * (n - 1) / 2; // 0 + 1 + 2 + ... + (n-1)
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return slope;
  }

  /**
   * Store data point for history
   */
  storeDataPoint(timestamp) {
    const dataPoint = {
      timestamp,
      totalCommands: this.metrics.commands.total,
      successRate: this.getSuccessRate(),
      averageResponseTime: this.metrics.commands.averageResponseTime,
      commandsPerSecond: this.metrics.throughput.commandsPerSecond,
      errorRate: this.metrics.errors.rate,
      bufferUtilization: this.metrics.buffer.averageUtilization,
      connectionStability: this.metrics.connection.stability
    };
    
    this.dataPoints.push(dataPoint);
    
    // Maintain history retention
    const cutoff = timestamp - this.config.historyRetention;
    this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoff);
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(type, data) {
    const alert = {
      type,
      timestamp: Date.now(),
      data,
      severity: this.getAlertSeverity(type)
    };
    
    this.alertHistory.push(alert);
    
    // Limit alert history
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-50);
    }
    
    warn(`Performance alert: ${type}`, data);
    this.emit('performanceAlert', alert);
  }

  /**
   * Get alert severity
   */
  getAlertSeverity(type) {
    const severityMap = {
      high_response_time: 'medium',
      low_throughput: 'medium',
      high_buffer_utilization: 'high',
      high_error_rate: 'high',
      connection_lag: 'medium'
    };
    
    return severityMap[type] || 'low';
  }

  /**
   * Classify error type
   */
  classifyError(error) {
    const message = error.message || error.toString();
    
    if (message.includes('timeout')) return 'timeout';
    if (message.includes('connection') || message.includes('serial')) return 'connection';
    if (message.includes('error:') || message.includes('alarm:')) return 'grbl';
    
    return 'other';
  }

  /**
   * Get success rate
   */
  getSuccessRate() {
    return this.metrics.commands.total > 0 ? 
      (this.metrics.commands.successful / this.metrics.commands.total) * 100 : 0;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics() {
    return {
      ...this.metrics,
      successRate: this.getSuccessRate(),
      uptime: Date.now() - this.startTime,
      timestamp: Date.now()
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    return {
      summary: {
        totalCommands: this.metrics.commands.total,
        successRate: this.getSuccessRate(),
        averageResponseTime: this.metrics.commands.averageResponseTime,
        averageThroughput: this.metrics.throughput.averageCommandsPerSecond,
        totalErrors: this.metrics.errors.total,
        uptime: this.metrics.connection.uptime,
        stability: this.metrics.connection.stability
      },
      alerts: this.alertHistory.length,
      dataPoints: this.dataPoints.length
    };
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(duration = 3600000) { // 1 hour default
    const cutoff = Date.now() - duration;
    return this.dataPoints.filter(point => point.timestamp > cutoff);
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 50) {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      commands: {
        total: 0,
        successful: 0,
        failed: 0,
        retried: 0,
        rate: 0,
        averageResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        totalResponseTime: 0
      },
      throughput: {
        commandsPerSecond: 0,
        averageCommandsPerSecond: 0,
        peakCommandsPerSecond: 0,
        commandsLastMinute: 0,
        bytesPerSecond: 0,
        linesPerSecond: 0
      },
      buffer: {
        averageUtilization: 0,
        peakUtilization: 0,
        lowWaterMark: 100,
        utilizationHistory: []
      },
      errors: {
        total: 0,
        rate: 0,
        timeouts: 0,
        connectionErrors: 0,
        grblErrors: 0,
        recoveryAttempts: 0,
        successfulRecoveries: 0
      },
      connection: {
        uptime: 0,
        disconnections: 0,
        reconnections: 0,
        averageLag: 0,
        maxLag: 0,
        stability: 100
      },
      system: {
        memoryUsage: 0,
        cpuUsage: 0,
        eventLoopLag: 0,
        gcPauses: 0
      }
    };
    
    this.dataPoints = [];
    this.alertHistory = [];
    this.responseTimeBuffer = [];
    this.throughputBuffer = [];
    this.bufferUtilizationBuffer = [];
    this.errorBuffer = [];
    this.startTime = Date.now();
    
    debug('Performance metrics reset');
    this.emit('metricsReset');
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    this.reset();
    this.removeAllListeners();
  }
}