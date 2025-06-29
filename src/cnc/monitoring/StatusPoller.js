/**
 * Live Status Polling System
 * 
 * Continuously polls machine status for real-time monitoring,
 * state change detection, and automatic status updates.
 */

import { EventEmitter } from 'events';
import { debug, warn, error } from '../../lib/logger/LoggerService.js';

export class StatusPoller extends EventEmitter {
  constructor(commandManager, config = {}) {
    super();
    
    if (!commandManager) {
      throw new Error('StatusPoller requires a command manager');
    }
    
    this.commandManager = commandManager;
    this.config = {
      pollInterval: 250,                // Status poll interval (ms)
      fastPollInterval: 100,            // Fast poll when active (ms)
      slowPollInterval: 1000,           // Slow poll when idle (ms)
      enableAdaptivePolling: true,      // Adjust poll rate based on activity
      maxMissedPolls: 5,                // Max missed polls before error
      pollTimeout: 2000,                // Timeout for status queries
      enableStateChangeDetection: true, // Detect and emit state changes
      enablePositionTracking: true,     // Track position changes
      enablePerformanceMetrics: true,   // Track polling performance
      stateChangeThreshold: 0.01,       // Minimum change to trigger event (mm)
      bufferLowThreshold: 25,           // Buffer low warning threshold (%)
      bufferHighThreshold: 75,          // Buffer high threshold (%)
      ...config
    };
    
    this.isPolling = false;
    this.pollTimer = null;
    this.lastStatus = null;
    this.lastPollTime = null;
    this.missedPolls = 0;
    this.pollCount = 0;
    
    this.currentPollInterval = this.config.pollInterval;
    this.lastActivity = Date.now();
    
    this.statusHistory = [];
    this.stateChangeHistory = [];
    
    this.metrics = {
      totalPolls: 0,
      successfulPolls: 0,
      failedPolls: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      lastPollTime: null,
      pollsPerSecond: 0
    };
    
    this.machineStates = {
      'Idle': { active: false, priority: 1 },
      'Run': { active: true, priority: 3 },
      'Hold': { active: true, priority: 2 },
      'Jog': { active: true, priority: 3 },
      'Alarm': { active: false, priority: 4 },
      'Door': { active: false, priority: 2 },
      'Check': { active: false, priority: 1 },
      'Home': { active: true, priority: 3 },
      'Sleep': { active: false, priority: 0 }
    };
  }

  /**
   * Start status polling
   */
  start() {
    if (this.isPolling) {
      warn('Status polling already active');
      return;
    }
    
    this.isPolling = true;
    this.lastActivity = Date.now();
    this.missedPolls = 0;
    
    debug('Starting status polling', {
      interval: this.config.pollInterval,
      adaptivePolling: this.config.enableAdaptivePolling
    });
    
    this.emit('pollingStarted', {
      interval: this.currentPollInterval,
      adaptivePolling: this.config.enableAdaptivePolling
    });
    
    this.schedulePoll();
  }

  /**
   * Stop status polling
   */
  stop() {
    if (!this.isPolling) {
      return;
    }
    
    this.isPolling = false;
    
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    
    debug('Status polling stopped', {
      totalPolls: this.metrics.totalPolls,
      successRate: this.getSuccessRate()
    });
    
    this.emit('pollingStopped', {
      totalPolls: this.metrics.totalPolls,
      successRate: this.getSuccessRate(),
      finalStatus: this.lastStatus
    });
  }

  /**
   * Schedule next poll
   */
  schedulePoll() {
    if (!this.isPolling) return;
    
    // Update poll interval based on activity
    if (this.config.enableAdaptivePolling) {
      this.updatePollInterval();
    }
    
    this.pollTimer = setTimeout(() => {
      this.executePoll();
    }, this.currentPollInterval);
  }

  /**
   * Execute status poll
   */
  async executePoll() {
    if (!this.isPolling) return;
    
    const pollStartTime = Date.now();
    
    try {
      this.metrics.totalPolls++;
      
      // Send status query with timeout
      const statusPromise = this.commandManager.sendCommand('?', {
        timeout: this.config.pollTimeout,
        priority: 'high' // High priority for status queries
      });
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Status poll timeout')), this.config.pollTimeout)
      );
      
      const response = await Promise.race([statusPromise, timeoutPromise]);
      
      // Calculate response time
      const responseTime = Date.now() - pollStartTime;
      this.updateMetrics(responseTime, true);
      
      // Process status response
      const status = this.parseStatusResponse(response);
      if (status) {
        await this.processStatus(status, responseTime);
        this.missedPolls = 0;
      } else {
        throw new Error('Invalid status response');
      }
      
    } catch (err) {
      this.handlePollError(err, pollStartTime);
    }
    
    // Schedule next poll
    this.schedulePoll();
  }

  /**
   * Parse GRBL status response
   */
  parseStatusResponse(response) {
    if (!response || !response.raw) {
      return null;
    }
    
    const statusText = response.raw;
    
    // Parse main status: <State|MPos:x,y,z|FS:feed,spindle>
    const statusMatch = statusText.match(/<([^|]+)\|([^>]+)>/);
    if (!statusMatch) {
      return null;
    }
    
    const state = statusMatch[1];
    const statusData = statusMatch[2];
    
    const status = {
      timestamp: Date.now(),
      raw: statusText,
      state: state,
      subState: null
    };
    
    // Parse state with possible sub-state (e.g., "Hold:0")
    const stateMatch = state.match(/([^:]+):?(\d+)?/);
    if (stateMatch) {
      status.state = stateMatch[1];
      if (stateMatch[2] !== undefined) {
        status.subState = parseInt(stateMatch[2]);
      }
    }
    
    // Parse position data
    const posMatch = statusData.match(/MPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (posMatch) {
      status.machinePosition = {
        x: parseFloat(posMatch[1]),
        y: parseFloat(posMatch[2]),
        z: parseFloat(posMatch[3])
      };
    }
    
    // Parse work position if present
    const wposMatch = statusData.match(/WPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (wposMatch) {
      status.workPosition = {
        x: parseFloat(wposMatch[1]),
        y: parseFloat(wposMatch[2]),
        z: parseFloat(wposMatch[3])
      };
    }
    
    // Parse feed and spindle
    const feedSpindleMatch = statusData.match(/FS:(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (feedSpindleMatch) {
      status.feedRate = parseFloat(feedSpindleMatch[1]);
      status.spindleSpeed = parseFloat(feedSpindleMatch[2]);
    }
    
    // Parse buffer info if present
    const bufferMatch = statusData.match(/Bf:(\d+),(\d+)/);
    if (bufferMatch) {
      status.buffer = {
        available: parseInt(bufferMatch[1]),
        used: parseInt(bufferMatch[2])
      };
      status.bufferUtilization = status.buffer.used / (status.buffer.available + status.buffer.used) * 100;
    }
    
    // Parse line number if present
    const lineMatch = statusData.match(/Ln:(\d+)/);
    if (lineMatch) {
      status.lineNumber = parseInt(lineMatch[1]);
    }
    
    // Parse pin states if present
    const pinMatch = statusData.match(/Pn:([XYZPRDHSCL]*)/);
    if (pinMatch) {
      status.pins = {
        limitX: pinMatch[1].includes('X'),
        limitY: pinMatch[1].includes('Y'),
        limitZ: pinMatch[1].includes('Z'),
        probe: pinMatch[1].includes('P'),
        door: pinMatch[1].includes('D'),
        hold: pinMatch[1].includes('H'),
        softReset: pinMatch[1].includes('R'),
        cycleStart: pinMatch[1].includes('S'),
        coolant: pinMatch[1].includes('C'),
        spindle: pinMatch[1].includes('L')
      };
    }
    
    // Parse work coordinate offset
    const wcoMatch = statusData.match(/WCO:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (wcoMatch) {
      status.workCoordinateOffset = {
        x: parseFloat(wcoMatch[1]),
        y: parseFloat(wcoMatch[2]),
        z: parseFloat(wcoMatch[3])
      };
      
      // Calculate work position if not directly provided
      if (!status.workPosition && status.machinePosition) {
        status.workPosition = {
          x: status.machinePosition.x - status.workCoordinateOffset.x,
          y: status.machinePosition.y - status.workCoordinateOffset.y,
          z: status.machinePosition.z - status.workCoordinateOffset.z
        };
      }
    }
    
    return status;
  }

  /**
   * Process parsed status
   */
  async processStatus(status, responseTime) {
    // Store in history
    this.addToHistory(status);
    
    // Detect state changes
    if (this.config.enableStateChangeDetection && this.lastStatus) {
      this.detectStateChanges(status, this.lastStatus);
    }
    
    // Detect position changes
    if (this.config.enablePositionTracking && this.lastStatus) {
      this.detectPositionChanges(status, this.lastStatus);
    }
    
    // Check for alerts
    this.checkForAlerts(status);
    
    // Update activity tracking
    this.updateActivityTracking(status);
    
    // Emit status update
    this.emit('statusUpdate', {
      status,
      previousStatus: this.lastStatus,
      responseTime,
      pollCount: this.metrics.totalPolls
    });
    
    this.lastStatus = status;
    this.lastPollTime = Date.now();
  }

  /**
   * Detect state changes
   */
  detectStateChanges(currentStatus, previousStatus) {
    if (currentStatus.state !== previousStatus.state) {
      const stateChange = {
        timestamp: Date.now(),
        from: previousStatus.state,
        to: currentStatus.state,
        fromSubState: previousStatus.subState,
        toSubState: currentStatus.subState
      };
      
      this.stateChangeHistory.push(stateChange);
      
      // Limit history size
      if (this.stateChangeHistory.length > 100) {
        this.stateChangeHistory = this.stateChangeHistory.slice(-50);
      }
      
      debug('Machine state changed', stateChange);
      
      this.emit('stateChange', stateChange);
      
      // Emit specific state events
      this.emit(`stateChanged:${currentStatus.state}`, {
        status: currentStatus,
        previousState: previousStatus.state,
        stateChange
      });
    }
  }

  /**
   * Detect position changes
   */
  detectPositionChanges(currentStatus, previousStatus) {
    if (!currentStatus.machinePosition || !previousStatus.machinePosition) {
      return;
    }
    
    const current = currentStatus.machinePosition;
    const previous = previousStatus.machinePosition;
    
    const distance = Math.sqrt(
      Math.pow(current.x - previous.x, 2) +
      Math.pow(current.y - previous.y, 2) +
      Math.pow(current.z - previous.z, 2)
    );
    
    if (distance >= this.config.stateChangeThreshold) {
      const positionChange = {
        timestamp: Date.now(),
        from: previous,
        to: current,
        distance,
        velocity: this.calculateVelocity(current, previous, currentStatus.timestamp - previousStatus.timestamp)
      };
      
      this.emit('positionChange', positionChange);
    }
  }

  /**
   * Check for alerts and warnings
   */
  checkForAlerts(status) {
    // Buffer utilization alerts
    if (status.bufferUtilization !== undefined) {
      if (status.bufferUtilization <= this.config.bufferLowThreshold) {
        this.emit('bufferLow', {
          utilization: status.bufferUtilization,
          threshold: this.config.bufferLowThreshold,
          status
        });
      } else if (status.bufferUtilization >= this.config.bufferHighThreshold) {
        this.emit('bufferHigh', {
          utilization: status.bufferUtilization,
          threshold: this.config.bufferHighThreshold,
          status
        });
      }
    }
    
    // Alarm state alert
    if (status.state === 'Alarm') {
      this.emit('alarmDetected', { status });
    }
    
    // Door open alert
    if (status.state === 'Door') {
      this.emit('doorOpen', { status });
    }
    
    // Limit switch alerts
    if (status.pins) {
      const activeLimit = ['limitX', 'limitY', 'limitZ'].find(limit => status.pins[limit]);
      if (activeLimit) {
        this.emit('limitSwitchActive', {
          switch: activeLimit,
          pins: status.pins,
          status
        });
      }
    }
  }

  /**
   * Update activity tracking for adaptive polling
   */
  updateActivityTracking(status) {
    const machineState = this.machineStates[status.state];
    
    if (machineState && machineState.active) {
      this.lastActivity = Date.now();
    }
  }

  /**
   * Update poll interval based on activity
   */
  updatePollInterval() {
    const timeSinceActivity = Date.now() - this.lastActivity;
    const isActive = timeSinceActivity < 5000; // 5 seconds
    
    let newInterval;
    
    if (isActive) {
      newInterval = this.config.fastPollInterval;
    } else if (timeSinceActivity > 30000) { // 30 seconds
      newInterval = this.config.slowPollInterval;
    } else {
      newInterval = this.config.pollInterval;
    }
    
    if (newInterval !== this.currentPollInterval) {
      debug('Poll interval changed', {
        from: this.currentPollInterval,
        to: newInterval,
        timeSinceActivity,
        isActive
      });
      
      this.currentPollInterval = newInterval;
      
      this.emit('pollIntervalChanged', {
        interval: newInterval,
        reason: isActive ? 'active' : 'idle',
        timeSinceActivity
      });
    }
  }

  /**
   * Handle poll error
   */
  handlePollError(error, pollStartTime) {
    this.missedPolls++;
    this.metrics.failedPolls++;
    
    const responseTime = Date.now() - pollStartTime;
    this.updateMetrics(responseTime, false);
    
    warn('Status poll failed', {
      error: error.message,
      missedPolls: this.missedPolls,
      responseTime
    });
    
    this.emit('pollError', {
      error,
      missedPolls: this.missedPolls,
      responseTime
    });
    
    // Check if we've missed too many polls
    if (this.missedPolls >= this.config.maxMissedPolls) {
      error('Too many missed polls, stopping polling', {
        missedPolls: this.missedPolls,
        maxMissedPolls: this.config.maxMissedPolls
      });
      
      this.emit('pollFailure', {
        missedPolls: this.missedPolls,
        maxMissedPolls: this.config.maxMissedPolls,
        lastError: error
      });
      
      this.stop();
    }
  }

  /**
   * Update polling metrics
   */
  updateMetrics(responseTime, success) {
    if (success) {
      this.metrics.successfulPolls++;
    }
    
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalPolls;
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.lastPollTime = Date.now();
    
    // Calculate polls per second
    if (this.metrics.totalPolls > 1) {
      const timeSpan = this.metrics.lastPollTime - (this.metrics.lastPollTime - (this.metrics.totalPolls * this.currentPollInterval));
      this.metrics.pollsPerSecond = this.metrics.totalPolls / (timeSpan / 1000);
    }
  }

  /**
   * Calculate velocity
   */
  calculateVelocity(currentPos, previousPos, timeDelta) {
    if (timeDelta <= 0) return 0;
    
    const distance = Math.sqrt(
      Math.pow(currentPos.x - previousPos.x, 2) +
      Math.pow(currentPos.y - previousPos.y, 2) +
      Math.pow(currentPos.z - previousPos.z, 2)
    );
    
    return (distance / timeDelta) * 1000; // mm/s
  }

  /**
   * Add status to history
   */
  addToHistory(status) {
    this.statusHistory.push(status);
    
    // Limit history size
    if (this.statusHistory.length > 1000) {
      this.statusHistory = this.statusHistory.slice(-500);
    }
  }

  /**
   * Get success rate
   */
  getSuccessRate() {
    return this.metrics.totalPolls > 0 ? 
      (this.metrics.successfulPolls / this.metrics.totalPolls) * 100 : 0;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.getSuccessRate(),
      currentInterval: this.currentPollInterval,
      isPolling: this.isPolling,
      missedPolls: this.missedPolls,
      timeSinceLastPoll: this.lastPollTime ? Date.now() - this.lastPollTime : null
    };
  }

  /**
   * Get status history
   */
  getStatusHistory(limit = 100) {
    return this.statusHistory.slice(-limit);
  }

  /**
   * Get state change history
   */
  getStateChangeHistory(limit = 50) {
    return this.stateChangeHistory.slice(-limit);
  }

  /**
   * Get current status
   */
  getCurrentStatus() {
    return this.lastStatus;
  }

  /**
   * Force immediate poll
   */
  async pollNow() {
    if (this.isPolling) {
      await this.executePoll();
    } else {
      throw new Error('Polling is not active');
    }
  }

  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    this.statusHistory = [];
    this.stateChangeHistory = [];
    this.removeAllListeners();
  }
}