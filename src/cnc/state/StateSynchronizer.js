/**
 * State Synchronization Manager (Refactored)
 * 
 * Orchestrates state synchronization between software and hardware using
 * component-based architecture for monitoring, querying, comparing, and resolving conflicts.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';
import { StateMonitor } from './StateMonitor.js';
import { StateQueryManager } from './StateQueryManager.js';
import { StateComparator } from './StateComparator.js';
import { ConflictResolver } from './ConflictResolver.js';

export class StateSynchronizer extends EventEmitter {
  constructor(machineStateManager, commandManager, config = {}) {
    super();
    
    if (!machineStateManager) {
      throw new Error('StateSynchronizer requires a MachineStateManager');
    }
    
    if (!commandManager) {
      throw new Error('StateSynchronizer requires a CommandManager');
    }
    
    this.stateManager = machineStateManager;
    this.commandManager = commandManager;
    
    this.config = {
      syncInterval: 1000,               // Sync check interval (ms)
      enableAutoSync: true,             // Enable automatic synchronization
      enableValidation: true,           // Enable state validation
      enableCorrection: true,           // Enable automatic correction
      positionTolerance: 0.01,          // Position sync tolerance (mm)
      maxSyncAttempts: 3,               // Max sync attempts before error
      syncTimeout: 5000,                // Sync operation timeout (ms)
      enableDeepSync: true,             // Enable comprehensive state queries
      deepSyncInterval: 30000,          // Deep sync interval (ms)
      enableConflictResolution: true,   // Enable conflict resolution
      prioritizeHardware: true,         // Hardware state takes precedence
      ...config
    };
    
    // Initialize component managers
    this.monitor = new StateMonitor(this.config);
    this.queryManager = new StateQueryManager(commandManager, this.config);
    this.comparator = new StateComparator(this.config);
    this.resolver = new ConflictResolver(machineStateManager, commandManager, this.config);
    
    // Synchronization state
    this.syncState = {
      isActive: false,
      lastSync: null,
      lastValidation: null,
      syncErrors: 0,
      validationErrors: 0,
      corrections: 0
    };
    
    // Set up component event forwarding
    this.setupComponentEvents();
  }
  
  /**
   * Set up component event forwarding
   */
  setupComponentEvents() {
    // Monitor events
    this.monitor.on('syncRequested', async (data) => {
      await this.performSync(data.type);
    });
    
    this.monitor.on('deepSyncRequested', async (data) => {
      await this.performDeepSync(data.type);
    });
    
    this.monitor.on('monitoringStarted', (data) => {
      this.emit('syncStarted', data);
    });
    
    this.monitor.on('monitoringStopped', (data) => {
      this.emit('syncStopped', data);
    });
    
    // Query manager events
    this.queryManager.on('hardwareStateQueried', (data) => {
      this.emit('hardwareStateQueried', data);
    });
    
    // Comparator events
    this.comparator.on('statesCompared', (data) => {
      this.emit('statesCompared', data);
    });
    
    // Resolver events
    this.resolver.on('discrepanciesResolved', (data) => {
      this.emit('discrepanciesResolved', data);
    });
  }
  
  /**
   * Start state synchronization
   */
  start() {
    if (this.syncState.isActive) {
      warn('State synchronization already active');
      return false;
    }
    
    this.syncState.isActive = true;
    this.syncState.lastSync = Date.now();
    
    // Start monitoring
    this.monitor.start();
    
    debug('State synchronization started');
    return true;
  }
  
  /**
   * Stop state synchronization
   */
  stop() {
    if (!this.syncState.isActive) {
      return false;
    }
    
    this.syncState.isActive = false;
    
    // Stop monitoring
    this.monitor.stop();
    
    debug('State synchronization stopped');
    return true;
  }
  
  /**
   * Perform regular synchronization check
   */
  async performSync(type = 'regular') {
    if (!this.config.enableAutoSync) {
      debug('Auto-sync disabled, skipping sync');
      return;
    }
    
    this.monitor.setSyncStatus(true);
    const syncStartTime = Date.now();
    
    try {
      debug('Performing synchronization check', { type });
      
      // Get current hardware state
      const hardwareState = await this.queryManager.queryHardwareState();
      
      // Get current software state
      const softwareState = this.stateManager.getState();
      
      // Compare states and identify discrepancies
      const comparison = this.comparator.compareStates(softwareState, hardwareState);
      
      // Handle discrepancies if any found
      if (comparison.discrepancies.length > 0) {
        await this.handleDiscrepancies(comparison.discrepancies);
      }
      
      // Update sync state
      this.syncState.lastSync = Date.now();
      const syncTime = this.syncState.lastSync - syncStartTime;
      
      debug('Synchronization completed', { 
        type,
        discrepancies: comparison.discrepancies.length,
        syncTime: `${syncTime}ms`
      });
      
      this.emit('syncCompleted', {
        type,
        syncTime,
        comparison,
        success: true
      });
      
    } catch (err) {
      this.syncState.syncErrors++;
      error('Synchronization failed', { type, error: err.message });
      
      this.emit('syncError', {
        type,
        error: err.message,
        attempt: this.syncState.syncErrors
      });
      
    } finally {
      this.monitor.setSyncStatus(false);
    }
  }
  
  /**
   * Perform deep synchronization
   */
  async performDeepSync(type = 'scheduled') {
    debug('Performing deep synchronization', { type });
    
    try {
      // Query comprehensive hardware state
      const hardwareState = await this.queryManager.queryHardwareState();
      
      // Perform validation checks
      if (this.config.enableValidation) {
        await this.performValidation(hardwareState);
      }
      
      // Force a regular sync with the comprehensive data
      await this.performSync('deep');
      
      info('Deep synchronization completed', { type });
      
      this.emit('deepSyncCompleted', {
        type,
        timestamp: Date.now()
      });
      
    } catch (err) {
      error('Deep synchronization failed', { type, error: err.message });
      
      this.emit('deepSyncError', {
        type,
        error: err.message
      });
    }
  }
  
  /**
   * Handle identified discrepancies
   */
  async handleDiscrepancies(discrepancies) {
    if (!this.config.enableConflictResolution) {
      warn('Conflict resolution disabled, discrepancies not resolved', {
        count: discrepancies.length
      });
      return;
    }
    
    try {
      const resolutionResult = await this.resolver.resolveDiscrepancies(discrepancies);
      
      if (resolutionResult.resolvedCount > 0) {
        this.syncState.corrections += resolutionResult.resolvedCount;
        info('Discrepancies resolved', {
          resolved: resolutionResult.resolvedCount,
          failed: resolutionResult.failedCount
        });
      }
      
      return resolutionResult;
      
    } catch (err) {
      error('Failed to resolve discrepancies', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Perform state validation
   */
  async performValidation(hardwareState) {
    try {
      this.syncState.lastValidation = Date.now();
      
      // Validate hardware state consistency
      if (this.validateHardwareStateConsistency(hardwareState)) {
        debug('Hardware state validation passed');
      } else {
        this.syncState.validationErrors++;
        warn('Hardware state validation failed');
      }
      
    } catch (err) {
      this.syncState.validationErrors++;
      error('State validation failed', { error: err.message });
    }
  }
  
  /**
   * Validate hardware state consistency
   */
  validateHardwareStateConsistency(hardwareState) {
    // Basic consistency checks
    if (!hardwareState) {
      return false;
    }
    
    // Check if all required components are present
    const requiredComponents = ['status', 'position'];
    for (const component of requiredComponents) {
      if (!hardwareState[component]) {
        warn(`Missing hardware state component: ${component}`);
        return false;
      }
    }
    
    // Check position validity
    if (hardwareState.position) {
      const pos = hardwareState.position;
      if (pos.machine) {
        const coords = ['x', 'y', 'z'];
        for (const coord of coords) {
          if (typeof pos.machine[coord] !== 'number' || isNaN(pos.machine[coord])) {
            warn(`Invalid machine position coordinate: ${coord}`);
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  /**
   * Request immediate synchronization
   */
  async requestSync() {
    if (!this.syncState.isActive) {
      throw new Error('Synchronization not active');
    }
    
    return this.monitor.requestImmediateSync();
  }
  
  /**
   * Request immediate deep synchronization
   */
  async requestDeepSync() {
    if (!this.syncState.isActive) {
      throw new Error('Synchronization not active');
    }
    
    return this.monitor.requestImmediateDeepSync();
  }
  
  /**
   * Get synchronization status
   */
  getStatus() {
    return {
      isActive: this.syncState.isActive,
      monitorStatus: this.monitor.getStatus(),
      lastSync: this.syncState.lastSync,
      lastValidation: this.syncState.lastValidation,
      syncErrors: this.syncState.syncErrors,
      validationErrors: this.syncState.validationErrors,
      corrections: this.syncState.corrections
    };
  }
  
  /**
   * Get comprehensive synchronization report
   */
  getSyncReport() {
    return {
      status: this.getStatus(),
      monitor: this.monitor.getMonitoringReport(),
      queries: this.queryManager.getQueryStatistics(),
      comparisons: this.comparator.getComparisonStatistics(),
      resolutions: this.resolver.getResolutionStatistics(),
      health: this.getHealthStatus()
    };
  }
  
  /**
   * Get health status
   */
  getHealthStatus() {
    const monitorHealth = this.monitor.getHealthStatus();
    const queryStats = this.queryManager.getQueryStatistics();
    
    const isHealthy = 
      monitorHealth.isHealthy &&
      this.syncState.syncErrors < 5 &&
      queryStats.successRate > 80;
    
    return {
      isHealthy,
      monitorHealth,
      syncErrorRate: this.syncState.syncErrors / Math.max(1, this.syncState.lastSync ? 1 : 0),
      querySuccessRate: queryStats.successRate,
      recommendations: this.getHealthRecommendations(monitorHealth, queryStats)
    };
  }
  
  /**
   * Get health recommendations
   */
  getHealthRecommendations(monitorHealth, queryStats) {
    const recommendations = [];
    
    if (!monitorHealth.isHealthy) {
      recommendations.push('Check monitoring health - sync intervals may be too short');
    }
    
    if (queryStats.successRate < 80) {
      recommendations.push('Poor query success rate - check hardware connection');
    }
    
    if (this.syncState.syncErrors > 5) {
      recommendations.push('High sync error rate - investigate hardware connectivity');
    }
    
    if (this.syncState.validationErrors > 3) {
      recommendations.push('Validation errors detected - review hardware state consistency');
    }
    
    return recommendations;
  }
  
  /**
   * Export synchronization data
   */
  exportData() {
    return {
      state: { ...this.syncState },
      monitor: this.monitor.exportData ? this.monitor.exportData() : {},
      queries: this.queryManager.exportData(),
      comparisons: this.comparator.exportData(),
      resolutions: this.resolver.exportData(),
      config: { ...this.config }
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    this.monitor.updateConfig(newConfig);
    
    debug('Synchronization configuration updated');
    this.emit('configurationUpdated', { config: this.config });
  }
  
  /**
   * Reset synchronization statistics
   */
  resetStatistics() {
    this.syncState.syncErrors = 0;
    this.syncState.validationErrors = 0;
    this.syncState.corrections = 0;
    
    // Reset component statistics
    this.comparator.resetStatistics();
    this.resolver.resetStatistics();
    
    debug('Synchronization statistics reset');
    this.emit('statisticsReset');
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.stop();
    
    // Clean up components
    this.monitor.cleanup();
    this.queryManager.cleanup();
    this.comparator.cleanup();
    this.resolver.cleanup();
    
    this.removeAllListeners();
    
    debug('State synchronizer cleaned up');
  }
}