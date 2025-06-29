/**
 * Connection Health Monitor
 * 
 * Monitors serial connection health, detects issues early, and provides
 * automatic recovery capabilities for connection problems.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class ConnectionHealthMonitor extends EventEmitter {
  constructor(serialInterface, config = {}) {
    super();
    
    if (!serialInterface) {
      throw new Error('ConnectionHealthMonitor requires a serial interface');
    }
    
    this.serialInterface = serialInterface;
    this.config = {
      healthCheckInterval: 5000,        // Health check interval (ms)
      pingCommand: '?',                 // Command to test connection
      pingTimeout: 2000,                // Ping timeout (ms)
      maxConsecutiveFailures: 3,        // Max failures before unhealthy
      recoveryAttempts: 3,              // Max recovery attempts
      recoveryDelay: 1000,              // Delay between recovery attempts
      enableAutoRecovery: true,         // Enable automatic recovery
      enableLatencyTracking: true,      // Track connection latency
      enableThroughputTracking: true,   // Track data throughput
      warningLatencyThreshold: 1000,    // Latency warning threshold (ms)
      criticalLatencyThreshold: 3000,   // Critical latency threshold (ms)
      dataStaleThreshold: 10000,        // Data staleness threshold (ms)
      connectionTimeoutThreshold: 30000, // Connection timeout threshold (ms)
      ...config
    };
    
    this.state = {
      isHealthy: true,
      isMonitoring: false,
      consecutiveFailures: 0,
      lastSuccessfulPing: null,
      lastDataReceived: null,
      connectionStartTime: null,
      reconnectionCount: 0
    };
    
    this.metrics = {
      // Latency metrics
      latency: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: [],
        sampleSize: 100
      },
      
      // Throughput metrics
      throughput: {
        bytesReceived: 0,
        bytesSent: 0,
        messagesReceived: 0,
        messagesSent: 0,
        receivedPerSecond: 0,
        sentPerSecond: 0
      },
      
      // Connection stability metrics
      stability: {
        uptime: 0,
        disconnections: 0,
        reconnections: 0,
        failedPings: 0,
        successfulPings: 0,
        stabilityScore: 100
      },
      
      // Health checks
      healthChecks: {
        total: 0,
        passed: 0,
        failed: 0,
        lastCheck: null,
        successRate: 100
      }
    };
    
    this.healthCheckTimer = null;
    this.throughputTimer = null;
    this.latencySamples = [];
    this.recoveryInProgress = false;
    
    this.setupSerialListeners();
  }

  /**
   * Start connection health monitoring
   */
  start() {
    if (this.state.isMonitoring) {
      warn('Connection health monitoring already started');
      return;
    }
    
    this.state.isMonitoring = true;
    this.state.connectionStartTime = Date.now();
    this.state.lastDataReceived = Date.now();
    
    // Start health check timer
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
    
    // Start throughput tracking timer
    if (this.config.enableThroughputTracking) {
      this.throughputTimer = setInterval(() => {
        this.updateThroughputMetrics();
      }, 1000);
    }
    
    debug('Connection health monitoring started');
    this.emit('monitoringStarted', {
      healthCheckInterval: this.config.healthCheckInterval,
      autoRecovery: this.config.enableAutoRecovery
    });
  }

  /**
   * Stop connection health monitoring
   */
  stop() {
    if (!this.state.isMonitoring) {
      return;
    }
    
    this.state.isMonitoring = false;
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.throughputTimer) {
      clearInterval(this.throughputTimer);
      this.throughputTimer = null;
    }
    
    debug('Connection health monitoring stopped');
    this.emit('monitoringStopped', this.getHealthReport());
  }

  /**
   * Perform health check
   */
  async performHealthCheck() {
    if (this.recoveryInProgress) {
      debug('Skipping health check - recovery in progress');
      return;
    }
    
    try {
      this.metrics.healthChecks.total++;
      
      // Check connection status
      const connectionStatus = this.serialInterface.getConnectionStatus();
      if (!connectionStatus.connected) {
        throw new Error('Serial interface not connected');
      }
      
      // Send ping command
      const pingStartTime = Date.now();
      
      const pingPromise = this.sendPingCommand();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ping timeout')), this.config.pingTimeout)
      );
      
      await Promise.race([pingPromise, timeoutPromise]);
      
      const latency = Date.now() - pingStartTime;
      
      // Record successful ping
      this.recordSuccessfulPing(latency);
      
      // Check for latency warnings
      this.checkLatencyThresholds(latency);
      
      // Check data staleness
      this.checkDataStaleness();
      
      // Update health status
      this.updateHealthStatus(true);
      
      debug('Health check passed', { latency });
      
    } catch (err) {
      this.recordFailedPing(err);
      this.updateHealthStatus(false);
      
      warn('Health check failed', { error: err.message });
      
      // Attempt recovery if enabled
      if (this.config.enableAutoRecovery && !this.state.isHealthy) {
        await this.attemptRecovery();
      }
    }
  }

  /**
   * Send ping command to test connection
   */
  async sendPingCommand() {
    // Use the serial interface directly for ping
    await this.serialInterface.write(this.config.pingCommand + '\n');
    
    // Wait for response (this would typically be handled by the command manager)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.serialInterface.removeListener('data', onData);
        reject(new Error('Ping response timeout'));
      }, this.config.pingTimeout);
      
      const onData = (data) => {
        clearTimeout(timeout);
        this.serialInterface.removeListener('data', onData);
        resolve(data);
      };
      
      this.serialInterface.once('data', onData);
    });
  }

  /**
   * Record successful ping
   */
  recordSuccessfulPing(latency) {
    this.state.lastSuccessfulPing = Date.now();
    this.state.consecutiveFailures = 0;
    
    this.metrics.healthChecks.passed++;
    this.metrics.stability.successfulPings++;
    
    // Update latency metrics
    if (this.config.enableLatencyTracking) {
      this.updateLatencyMetrics(latency);
    }
  }

  /**
   * Record failed ping
   */
  recordFailedPing(error) {
    this.state.consecutiveFailures++;
    
    this.metrics.healthChecks.failed++;
    this.metrics.stability.failedPings++;
    
    this.emit('pingFailed', {
      error: error.message,
      consecutiveFailures: this.state.consecutiveFailures,
      timestamp: Date.now()
    });
  }

  /**
   * Update latency metrics
   */
  updateLatencyMetrics(latency) {
    const latencyMetrics = this.metrics.latency;
    
    latencyMetrics.current = latency;
    latencyMetrics.min = Math.min(latencyMetrics.min, latency);
    latencyMetrics.max = Math.max(latencyMetrics.max, latency);
    
    // Add to samples
    latencyMetrics.samples.push(latency);
    if (latencyMetrics.samples.length > latencyMetrics.sampleSize) {
      latencyMetrics.samples.shift();
    }
    
    // Calculate average
    latencyMetrics.average = latencyMetrics.samples.reduce((sum, val) => sum + val, 0) / latencyMetrics.samples.length;
  }

  /**
   * Check latency thresholds
   */
  checkLatencyThresholds(latency) {
    if (latency >= this.config.criticalLatencyThreshold) {
      this.emit('latencyCritical', {
        latency,
        threshold: this.config.criticalLatencyThreshold,
        severity: 'critical'
      });
    } else if (latency >= this.config.warningLatencyThreshold) {
      this.emit('latencyWarning', {
        latency,
        threshold: this.config.warningLatencyThreshold,
        severity: 'warning'
      });
    }
  }

  /**
   * Check data staleness
   */
  checkDataStaleness() {
    const now = Date.now();
    const timeSinceLastData = now - (this.state.lastDataReceived || now);
    
    if (timeSinceLastData > this.config.dataStaleThreshold) {
      this.emit('dataStale', {
        timeSinceLastData,
        threshold: this.config.dataStaleThreshold,
        lastDataReceived: this.state.lastDataReceived
      });
    }
  }

  /**
   * Update health status
   */
  updateHealthStatus(pingSuccessful) {
    const wasHealthy = this.state.isHealthy;
    
    if (pingSuccessful) {
      this.state.isHealthy = true;
    } else {
      // Mark as unhealthy if consecutive failures exceed threshold
      if (this.state.consecutiveFailures >= this.config.maxConsecutiveFailures) {
        this.state.isHealthy = false;
      }
    }
    
    // Update health check success rate
    this.metrics.healthChecks.successRate = this.metrics.healthChecks.total > 0 ?
      (this.metrics.healthChecks.passed / this.metrics.healthChecks.total) * 100 : 100;
    
    this.metrics.healthChecks.lastCheck = Date.now();
    
    // Emit health status change event
    if (wasHealthy !== this.state.isHealthy) {
      const event = {
        isHealthy: this.state.isHealthy,
        consecutiveFailures: this.state.consecutiveFailures,
        timestamp: Date.now()
      };
      
      if (this.state.isHealthy) {
        info('Connection health restored');
        this.emit('healthRestored', event);
      } else {
        error('Connection health degraded');
        this.emit('healthDegraded', event);
      }
    }
  }

  /**
   * Attempt connection recovery
   */
  async attemptRecovery() {
    if (this.recoveryInProgress) {
      debug('Recovery already in progress');
      return;
    }
    
    this.recoveryInProgress = true;
    
    info('Starting connection recovery');
    this.emit('recoveryStarted', {
      consecutiveFailures: this.state.consecutiveFailures,
      timestamp: Date.now()
    });
    
    try {
      for (let attempt = 1; attempt <= this.config.recoveryAttempts; attempt++) {
        debug(`Recovery attempt ${attempt}/${this.config.recoveryAttempts}`);
        
        try {
          // Check if reconnection is needed
          const connectionStatus = this.serialInterface.getConnectionStatus();
          
          if (!connectionStatus.connected) {
            // Attempt reconnection
            await this.attemptReconnection();
          } else {
            // Try to clear any stuck state
            await this.clearConnectionState();
          }
          
          // Test connection with ping
          await this.sendPingCommand();
          
          // Recovery successful
          info(`Connection recovery successful on attempt ${attempt}`);
          this.state.consecutiveFailures = 0;
          this.state.isHealthy = true;
          this.metrics.stability.reconnections++;
          
          this.emit('recoverySuccessful', {
            attempt,
            timestamp: Date.now()
          });
          
          break;
          
        } catch (err) {
          warn(`Recovery attempt ${attempt} failed`, { error: err.message });
          
          if (attempt < this.config.recoveryAttempts) {
            await this.delay(this.config.recoveryDelay);
          }
        }
      }
      
      // Check if recovery failed
      if (!this.state.isHealthy) {
        error('Connection recovery failed after all attempts');
        this.emit('recoveryFailed', {
          attempts: this.config.recoveryAttempts,
          timestamp: Date.now()
        });
      }
      
    } finally {
      this.recoveryInProgress = false;
    }
  }

  /**
   * Attempt to reconnect the serial interface
   */
  async attemptReconnection() {
    debug('Attempting serial interface reconnection');
    
    // Get last known connection info
    const lastConnectionInfo = this.serialInterface.connectionInfo;
    
    if (!lastConnectionInfo || !lastConnectionInfo.portPath) {
      throw new Error('No connection information available for reconnection');
    }
    
    try {
      // Disconnect if still connected
      if (this.serialInterface.isConnected) {
        await this.serialInterface.disconnect();
      }
      
      // Wait briefly before reconnecting
      await this.delay(500);
      
      // Reconnect
      await this.serialInterface.connect(
        lastConnectionInfo.portPath,
        lastConnectionInfo.baudRate || 115200
      );
      
      debug('Serial interface reconnected successfully');
      
    } catch (err) {
      throw new Error(`Reconnection failed: ${err.message}`);
    }
  }

  /**
   * Clear connection state
   */
  async clearConnectionState() {
    debug('Clearing connection state');
    
    try {
      // Send soft reset to clear any stuck commands
      await this.serialInterface.write('\x18'); // Ctrl+X
      
      // Wait for reset to complete
      await this.delay(100);
      
    } catch (err) {
      debug('Failed to clear connection state', { error: err.message });
    }
  }

  /**
   * Update throughput metrics
   */
  updateThroughputMetrics() {
    const now = Date.now();
    const timeDelta = 1000; // 1 second
    
    // Calculate per-second rates (would need to track actual data flow)
    // This is a simplified implementation
    this.metrics.throughput.receivedPerSecond = 0; // Would be calculated from actual data
    this.metrics.throughput.sentPerSecond = 0;
    
    // Update uptime
    if (this.state.connectionStartTime) {
      this.metrics.stability.uptime = now - this.state.connectionStartTime;
    }
    
    // Update stability score
    this.updateStabilityScore();
  }

  /**
   * Update stability score
   */
  updateStabilityScore() {
    const stability = this.metrics.stability;
    const healthChecks = this.metrics.healthChecks;
    
    let score = 100;
    
    // Deduct points for disconnections
    score -= Math.min(stability.disconnections * 10, 50);
    
    // Deduct points for failed health checks
    if (healthChecks.total > 0) {
      const failureRate = (healthChecks.failed / healthChecks.total) * 100;
      score -= failureRate;
    }
    
    // Deduct points for high latency
    if (this.metrics.latency.average > this.config.warningLatencyThreshold) {
      score -= 10;
    }
    
    if (this.metrics.latency.average > this.config.criticalLatencyThreshold) {
      score -= 20;
    }
    
    stability.stabilityScore = Math.max(score, 0);
  }

  /**
   * Setup serial interface event listeners
   */
  setupSerialListeners() {
    // Track data received
    this.serialInterface.on('data', (data) => {
      this.state.lastDataReceived = Date.now();
      
      if (this.config.enableThroughputTracking) {
        this.metrics.throughput.bytesReceived += data.length || 0;
        this.metrics.throughput.messagesReceived++;
      }
    });
    
    // Track disconnections
    this.serialInterface.on('disconnect', () => {
      this.metrics.stability.disconnections++;
      this.state.isHealthy = false;
      
      warn('Serial interface disconnected');
      this.emit('connectionLost', {
        timestamp: Date.now(),
        uptime: this.metrics.stability.uptime
      });
    });
    
    // Track reconnections
    this.serialInterface.on('connect', () => {
      this.state.reconnectionCount++;
      this.state.connectionStartTime = Date.now();
      this.state.lastDataReceived = Date.now();
      
      info('Serial interface connected');
      this.emit('connectionRestored', {
        timestamp: Date.now(),
        reconnectionCount: this.state.reconnectionCount
      });
    });
    
    // Track errors
    this.serialInterface.on('error', (error) => {
      warn('Serial interface error', { error: error.message });
      this.emit('connectionError', {
        error: error.message,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Get comprehensive health report
   */
  getHealthReport() {
    return {
      state: {
        ...this.state,
        uptime: this.metrics.stability.uptime
      },
      metrics: { ...this.metrics },
      status: {
        isHealthy: this.state.isHealthy,
        isMonitoring: this.state.isMonitoring,
        recoveryInProgress: this.recoveryInProgress,
        timeSinceLastSuccess: this.state.lastSuccessfulPing ? 
          Date.now() - this.state.lastSuccessfulPing : null,
        timeSinceLastData: this.state.lastDataReceived ? 
          Date.now() - this.state.lastDataReceived : null
      },
      thresholds: {
        maxConsecutiveFailures: this.config.maxConsecutiveFailures,
        warningLatencyThreshold: this.config.warningLatencyThreshold,
        criticalLatencyThreshold: this.config.criticalLatencyThreshold,
        dataStaleThreshold: this.config.dataStaleThreshold
      }
    };
  }

  /**
   * Get current health status
   */
  getHealthStatus() {
    return {
      isHealthy: this.state.isHealthy,
      consecutiveFailures: this.state.consecutiveFailures,
      latency: this.metrics.latency.current,
      averageLatency: this.metrics.latency.average,
      stabilityScore: this.metrics.stability.stabilityScore,
      successRate: this.metrics.healthChecks.successRate,
      uptime: this.metrics.stability.uptime,
      lastCheck: this.metrics.healthChecks.lastCheck
    };
  }

  /**
   * Force immediate health check
   */
  async checkHealthNow() {
    if (!this.state.isMonitoring) {
      throw new Error('Health monitoring is not active');
    }
    
    await this.performHealthCheck();
    return this.getHealthStatus();
  }

  /**
   * Reset health metrics
   */
  resetMetrics() {
    this.metrics = {
      latency: {
        current: 0,
        average: 0,
        min: Infinity,
        max: 0,
        samples: [],
        sampleSize: 100
      },
      throughput: {
        bytesReceived: 0,
        bytesSent: 0,
        messagesReceived: 0,
        messagesSent: 0,
        receivedPerSecond: 0,
        sentPerSecond: 0
      },
      stability: {
        uptime: 0,
        disconnections: 0,
        reconnections: 0,
        failedPings: 0,
        successfulPings: 0,
        stabilityScore: 100
      },
      healthChecks: {
        total: 0,
        passed: 0,
        failed: 0,
        lastCheck: null,
        successRate: 100
      }
    };
    
    this.state.consecutiveFailures = 0;
    this.state.isHealthy = true;
    this.state.connectionStartTime = Date.now();
    
    debug('Health metrics reset');
    this.emit('metricsReset');
  }

  /**
   * Promise-based delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    this.removeAllListeners();
  }
}