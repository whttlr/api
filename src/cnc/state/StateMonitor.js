/**
 * State Monitor
 * 
 * Handles continuous monitoring of machine state synchronization
 * with configurable intervals and monitoring strategies.
 */

import { EventEmitter } from 'events';
import { debug, info, warn } from '../../lib/logger/LoggerService.js';

export class StateMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      syncInterval: 1000,               // Regular sync interval (ms)
      deepSyncInterval: 30000,          // Deep sync interval (ms)
      enableDeepSync: true,             // Enable comprehensive state queries
      maxConcurrentSyncs: 1,            // Maximum concurrent sync operations
      ...config
    };
    
    this.monitorState = {
      isMonitoring: false,
      isSyncing: false,
      lastSync: null,
      lastDeepSync: null,
      activeOperations: 0
    };
    
    this.syncTimer = null;
    this.deepSyncTimer = null;
  }
  
  /**
   * Start state monitoring
   */
  start() {
    if (this.monitorState.isMonitoring) {
      warn('State monitoring already active');
      return false;
    }
    
    this.monitorState.isMonitoring = true;
    this.monitorState.lastSync = Date.now();
    
    // Start regular sync monitoring
    this.syncTimer = setInterval(() => {
      this.triggerSync();
    }, this.config.syncInterval);
    
    // Start deep sync monitoring
    if (this.config.enableDeepSync) {
      this.deepSyncTimer = setInterval(() => {
        this.triggerDeepSync();
      }, this.config.deepSyncInterval);
    }
    
    debug('State monitoring started', {
      syncInterval: this.config.syncInterval,
      deepSyncInterval: this.config.deepSyncInterval
    });
    
    this.emit('monitoringStarted', {
      syncInterval: this.config.syncInterval,
      deepSyncInterval: this.config.deepSyncInterval
    });
    
    return true;
  }
  
  /**
   * Stop state monitoring
   */
  stop() {
    if (!this.monitorState.isMonitoring) {
      return false;
    }
    
    this.monitorState.isMonitoring = false;
    
    // Clear timers
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    if (this.deepSyncTimer) {
      clearInterval(this.deepSyncTimer);
      this.deepSyncTimer = null;
    }
    
    debug('State monitoring stopped');
    this.emit('monitoringStopped', this.getMonitoringReport());
    
    return true;
  }
  
  /**
   * Trigger regular synchronization
   */
  triggerSync() {
    if (this.monitorState.isSyncing) {
      debug('Sync already in progress, skipping regular sync');
      return;
    }
    
    if (this.monitorState.activeOperations >= this.config.maxConcurrentSyncs) {
      debug('Maximum concurrent sync operations reached, skipping');
      return;
    }
    
    this.emit('syncRequested', { type: 'regular' });
  }
  
  /**
   * Trigger deep synchronization
   */
  triggerDeepSync() {
    if (this.monitorState.isSyncing) {
      debug('Sync in progress, deferring deep sync');
      // Schedule deep sync for next interval
      return;
    }
    
    this.monitorState.lastDeepSync = Date.now();
    this.emit('deepSyncRequested', { type: 'deep' });
  }
  
  /**
   * Set sync operation status
   */
  setSyncStatus(isSyncing) {
    const wasMonitoring = this.monitorState.isSyncing;
    this.monitorState.isSyncing = isSyncing;
    
    if (isSyncing) {
      this.monitorState.activeOperations++;
      this.monitorState.lastSync = Date.now();
    } else {
      this.monitorState.activeOperations = Math.max(0, this.monitorState.activeOperations - 1);
    }
    
    if (wasMonitoring !== isSyncing) {
      this.emit('syncStatusChanged', { 
        isSyncing, 
        activeOperations: this.monitorState.activeOperations 
      });
    }
  }
  
  /**
   * Request immediate sync
   */
  requestImmediateSync() {
    if (!this.monitorState.isMonitoring) {
      warn('Cannot request immediate sync - monitoring not active');
      return false;
    }
    
    debug('Immediate sync requested');
    this.emit('syncRequested', { type: 'immediate' });
    return true;
  }
  
  /**
   * Request immediate deep sync
   */
  requestImmediateDeepSync() {
    if (!this.monitorState.isMonitoring) {
      warn('Cannot request immediate deep sync - monitoring not active');
      return false;
    }
    
    debug('Immediate deep sync requested');
    this.emit('deepSyncRequested', { type: 'immediate' });
    return true;
  }
  
  /**
   * Update monitoring configuration
   */
  updateConfig(newConfig) {
    const restartRequired = 
      newConfig.syncInterval !== this.config.syncInterval ||
      newConfig.deepSyncInterval !== this.config.deepSyncInterval ||
      newConfig.enableDeepSync !== this.config.enableDeepSync;
    
    this.config = { ...this.config, ...newConfig };
    
    if (restartRequired && this.monitorState.isMonitoring) {
      debug('Restarting monitoring with new configuration');
      this.stop();
      this.start();
    }
    
    this.emit('configurationUpdated', { 
      config: this.config, 
      restartRequired 
    });
  }
  
  /**
   * Get monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.monitorState.isMonitoring,
      isSyncing: this.monitorState.isSyncing,
      activeOperations: this.monitorState.activeOperations,
      lastSync: this.monitorState.lastSync,
      lastDeepSync: this.monitorState.lastDeepSync,
      nextRegularSync: this.monitorState.lastSync ? 
        this.monitorState.lastSync + this.config.syncInterval : null,
      nextDeepSync: this.monitorState.lastDeepSync ? 
        this.monitorState.lastDeepSync + this.config.deepSyncInterval : null
    };
  }
  
  /**
   * Get monitoring report
   */
  getMonitoringReport() {
    const uptime = this.monitorState.lastSync ? 
      Date.now() - this.monitorState.lastSync : 0;
    
    return {
      status: this.getStatus(),
      uptime,
      config: { ...this.config },
      performance: {
        averageInterval: this.config.syncInterval,
        missedSyncs: this.calculateMissedSyncs(),
        efficiency: this.calculateEfficiency()
      }
    };
  }
  
  /**
   * Calculate missed syncs (estimated)
   */
  calculateMissedSyncs() {
    if (!this.monitorState.lastSync) {
      return 0;
    }
    
    const uptime = Date.now() - this.monitorState.lastSync;
    const expectedSyncs = Math.floor(uptime / this.config.syncInterval);
    // This is a simplified calculation - in a real implementation,
    // you'd track actual sync counts
    return Math.max(0, expectedSyncs - this.monitorState.activeOperations);
  }
  
  /**
   * Calculate monitoring efficiency
   */
  calculateEfficiency() {
    // Simplified efficiency calculation
    // In real implementation, track successful vs attempted syncs
    return this.monitorState.isMonitoring ? 0.95 : 0;
  }
  
  /**
   * Reset monitoring statistics
   */
  resetStatistics() {
    this.monitorState.lastSync = null;
    this.monitorState.lastDeepSync = null;
    this.monitorState.activeOperations = 0;
    
    debug('Monitoring statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Check if monitoring is healthy
   */
  isHealthy() {
    if (!this.monitorState.isMonitoring) {
      return false;
    }
    
    // Check if sync operations are stuck
    const timeSinceLastSync = Date.now() - (this.monitorState.lastSync || 0);
    const maxExpectedInterval = this.config.syncInterval * 2;
    
    return timeSinceLastSync < maxExpectedInterval;
  }
  
  /**
   * Get health status
   */
  getHealthStatus() {
    return {
      isHealthy: this.isHealthy(),
      isMonitoring: this.monitorState.isMonitoring,
      timeSinceLastSync: this.monitorState.lastSync ? 
        Date.now() - this.monitorState.lastSync : null,
      activeOperations: this.monitorState.activeOperations,
      recommendations: this.getHealthRecommendations()
    };
  }
  
  /**
   * Get health recommendations
   */
  getHealthRecommendations() {
    const recommendations = [];
    
    if (!this.monitorState.isMonitoring) {
      recommendations.push('Start state monitoring to ensure synchronization');
    }
    
    if (this.monitorState.activeOperations > this.config.maxConcurrentSyncs) {
      recommendations.push('Consider increasing maxConcurrentSyncs or check for sync bottlenecks');
    }
    
    const timeSinceLastSync = Date.now() - (this.monitorState.lastSync || 0);
    if (timeSinceLastSync > this.config.syncInterval * 3) {
      recommendations.push('Long delay since last sync - check connection and hardware status');
    }
    
    return recommendations;
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    this.removeAllListeners();
  }
}