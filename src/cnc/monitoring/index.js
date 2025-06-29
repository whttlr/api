/**
 * CNC Monitoring Module
 * 
 * Provides comprehensive real-time monitoring capabilities for CNC machine operations
 * including status polling, performance tracking, and connection health monitoring.
 */

import { StatusPoller } from './StatusPoller.js';
import { PerformanceTracker } from './PerformanceTracker.js';
import { ConnectionHealthMonitor } from './ConnectionHealthMonitor.js';

// Main monitoring components
export { StatusPoller };
export { PerformanceTracker };
export { ConnectionHealthMonitor };

// Convenience factory functions
export function createStatusPoller(commandManager, config = {}) {
  return new StatusPoller(commandManager, config);
}

export function createPerformanceTracker(commandManager, config = {}) {
  return new PerformanceTracker(commandManager, config);
}

export function createConnectionHealthMonitor(connectionManager, config = {}) {
  return new ConnectionHealthMonitor(connectionManager, config);
}

/**
 * Create a complete monitoring suite with all components
 */
export function createMonitoringSuite(commandManager, connectionManager, config = {}) {
  const suite = {
    statusPoller: createStatusPoller(commandManager, config.statusPoller),
    performanceTracker: createPerformanceTracker(commandManager, config.performanceTracker),
    connectionHealthMonitor: createConnectionHealthMonitor(connectionManager, config.connectionHealth)
  };

  // Cross-component event forwarding
  suite.statusPoller.on('pollError', (error) => {
    suite.connectionHealthMonitor.recordConnectionIssue(error);
  });

  suite.performanceTracker.on('slowCommand', (event) => {
    suite.statusPoller.adjustPollingRate('slow_command', event.executionTime);
  });

  suite.connectionHealthMonitor.on('connectionLost', () => {
    suite.statusPoller.pausePolling('connection_lost');
    suite.performanceTracker.pauseTracking('connection_lost');
  });

  suite.connectionHealthMonitor.on('connectionRestored', () => {
    suite.statusPoller.resumePolling('connection_restored');
    suite.performanceTracker.resumeTracking('connection_restored');
  });

  // Unified control methods
  suite.startAll = function() {
    this.statusPoller.startPolling();
    this.performanceTracker.startTracking();
    this.connectionHealthMonitor.startMonitoring();
  };

  suite.stopAll = function() {
    this.statusPoller.stopPolling();
    this.performanceTracker.stopTracking();
    this.connectionHealthMonitor.stopMonitoring();
  };

  suite.exportAllData = function() {
    return {
      statusMetrics: this.statusPoller.exportData(),
      performanceMetrics: this.performanceTracker.exportData(),
      healthMetrics: this.connectionHealthMonitor.exportData(),
      timestamp: Date.now()
    };
  };

  suite.cleanup = function() {
    this.statusPoller.cleanup();
    this.performanceTracker.cleanup();
    this.connectionHealthMonitor.cleanup();
  };

  return suite;
}

// Default export is the StatusPoller as it's the most commonly used
export default StatusPoller;