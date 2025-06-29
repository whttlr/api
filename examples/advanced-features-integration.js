/**
 * Advanced CNC Features Integration Examples
 * 
 * Demonstrates how to use the Phase 1.5 advanced features together
 * for comprehensive CNC control, monitoring, and state management.
 */

import { ConnectionHealthMonitor } from '../src/cnc/monitoring/ConnectionHealthMonitor.js';
import { MachineStateManager } from '../src/cnc/state/MachineStateManager.js';
import { StateSynchronizer } from '../src/cnc/state/StateSynchronizer.js';
import { ChunkedFileStreamer } from '../src/cnc/streaming/ChunkedFileStreamer.js';
import { ConfigurationManager } from '../src/cnc/config/ConfigurationManager.js';
import { debug, info, warn, error } from '../src/lib/logger/LoggerService.js';

/**
 * Example 1: Complete CNC System Setup
 * Shows how to initialize and configure all advanced features together
 */
export class AdvancedCNCSystem {
  constructor(serialInterface, commandManager, streamingManager) {
    this.serialInterface = serialInterface;
    this.commandManager = commandManager;
    this.streamingManager = streamingManager;
    
    // Initialize core components
    this.stateManager = new MachineStateManager({
      persistState: true,
      stateFile: './machine-state.json',
      autoSave: true,
      trackHistory: true
    });
    
    this.configManager = new ConfigurationManager(commandManager, {
      configDirectory: './configs',
      backupDirectory: './backups',
      enableAutoBackup: true,
      enableSync: true
    });
    
    this.healthMonitor = new ConnectionHealthMonitor(serialInterface, {
      healthCheckInterval: 3000,
      enableAutoRecovery: true,
      enableLatencyTracking: true,
      maxConsecutiveFailures: 3
    });
    
    this.stateSynchronizer = new StateSynchronizer(this.stateManager, commandManager, {
      syncInterval: 2000,
      enableAutoSync: true,
      enableCorrection: true,
      positionTolerance: 0.01
    });
    
    this.chunkedStreamer = new ChunkedFileStreamer(streamingManager, {
      chunkSize: 500,
      enablePauseResume: true,
      enableCheckpointing: true,
      maxMemoryUsage: 100 * 1024 * 1024 // 100MB
    });
    
    this.setupEventHandlers();
  }
  
  /**
   * Start the complete CNC system
   */
  async start() {
    try {
      info('Starting advanced CNC system...');
      
      // 1. Initialize configuration manager
      await this.configManager.initialize();
      
      // 2. Initialize state manager
      await this.stateManager.initialize();
      
      // 3. Start health monitoring
      this.healthMonitor.start();
      
      // 4. Start state synchronization
      this.stateSynchronizer.start();
      
      // 5. Create initial backup
      await this.configManager.createBackup('System startup backup');
      
      info('Advanced CNC system started successfully');
      
      return {
        success: true,
        components: {
          stateManager: this.stateManager.getState(),
          healthStatus: this.healthMonitor.getHealthStatus(),
          syncStatus: this.stateSynchronizer.getSyncReport(),
          configuration: this.configManager.getConfiguration()
        }
      };
      
    } catch (err) {
      error('Failed to start CNC system', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Setup comprehensive event handling
   */
  setupEventHandlers() {
    // Health monitoring events
    this.healthMonitor.on('healthDegraded', (event) => {
      warn('Connection health degraded', event);
      this.handleHealthDegradation(event);
    });
    
    this.healthMonitor.on('healthRestored', (event) => {
      info('Connection health restored', event);
      this.handleHealthRestoration(event);
    });
    
    // State synchronization events
    this.stateSynchronizer.on('discrepancyDetected', (discrepancy) => {
      warn('State discrepancy detected', discrepancy);
      this.handleStateDiscrepancy(discrepancy);
    });
    
    // State management events
    this.stateManager.on('statusChanged', (event) => {
      debug('Machine status changed', event);
      this.handleStatusChange(event);
    });
    
    this.stateManager.on('positionChanged', (event) => {
      debug('Position updated', event);
      this.handlePositionChange(event);
    });
    
    // Configuration events
    this.configManager.on('configurationUpdated', (event) => {
      info('Configuration updated', event);
      this.handleConfigurationChange(event);
    });
    
    // Chunked streaming events
    this.chunkedStreamer.on('chunkCompleted', (event) => {
      debug('Chunk completed', event);
      this.handleChunkProgress(event);
    });
  }
  
  /**
   * Handle health degradation with automatic response
   */
  async handleHealthDegradation(event) {
    try {
      // Pause any active streaming
      if (this.chunkedStreamer.state.isStreaming) {
        this.chunkedStreamer.pauseStreaming();
        info('Streaming paused due to health issues');
      }
      
      // Create emergency backup
      await this.configManager.createBackup('Emergency backup - health degraded');
      
      // Trigger immediate state sync after recovery
      this.healthMonitor.once('healthRestored', async () => {
        await this.stateSynchronizer.syncNow();
      });
      
    } catch (err) {
      error('Failed to handle health degradation', { error: err.message });
    }
  }
  
  /**
   * Handle health restoration
   */
  async handleHealthRestoration(event) {
    try {
      // Resume streaming if it was paused
      if (this.chunkedStreamer.state.isPaused) {
        this.chunkedStreamer.resumeStreaming();
        info('Streaming resumed after health restoration');
      }
      
      // Perform comprehensive state sync
      await this.stateSynchronizer.syncNow();
      
    } catch (err) {
      error('Failed to handle health restoration', { error: err.message });
    }
  }
  
  /**
   * Handle state discrepancies
   */
  handleStateDiscrepancy(discrepancy) {
    // Log the discrepancy for analysis
    warn('State synchronization corrected discrepancy', {
      type: discrepancy.type,
      field: discrepancy.field,
      corrected: discrepancy.corrected
    });
    
    // If position discrepancy is large, create a checkpoint
    if (discrepancy.type === 'position' && discrepancy.difference > 1.0) {
      this.chunkedStreamer.createCheckpoint().catch(err => {
        debug('Failed to create checkpoint', { error: err.message });
      });
    }
  }
  
  /**
   * Handle machine status changes
   */
  handleStatusChange(event) {
    // Update configuration manager with current status
    if (event.to === 'Alarm') {
      this.configManager.createBackup('Pre-alarm backup').catch(err => {
        debug('Failed to create alarm backup', { error: err.message });
      });
    }
  }
  
  /**
   * Handle position changes for progress tracking
   */
  handlePositionChange(event) {
    // Track movement for wear analysis
    const distance = event.distance;
    if (distance > 0.1) { // Only track significant movements
      debug('Significant movement detected', { distance: distance.toFixed(3) });
    }
  }
  
  /**
   * Handle configuration changes
   */
  handleConfigurationChange(event) {
    // Automatically sync configuration changes to hardware
    this.configManager.syncToHardware().catch(err => {
      warn('Failed to sync configuration to hardware', { error: err.message });
    });
  }
  
  /**
   * Handle chunk streaming progress
   */
  handleChunkProgress(event) {
    const progress = event.totalProgress * 100;
    
    // Create checkpoint every 25% progress
    if (progress % 25 < 1) {
      this.chunkedStreamer.createCheckpoint().catch(err => {
        debug('Failed to create progress checkpoint', { error: err.message });
      });
    }
  }
  
  /**
   * Execute large G-code file with full monitoring
   */
  async executeGcodeFile(filePath, options = {}) {
    try {
      info(`Starting execution of large G-code file: ${filePath}`);
      
      // 1. Pre-execution checks
      const healthStatus = this.healthMonitor.getHealthStatus();
      if (!healthStatus.isHealthy) {
        throw new Error('Cannot execute file - connection is unhealthy');
      }
      
      // 2. Create pre-execution backup
      await this.configManager.createBackup('Pre-execution backup');
      
      // 3. Sync state before execution
      await this.stateSynchronizer.syncNow();
      
      // 4. Start chunked streaming
      const streamingResult = await this.chunkedStreamer.startChunkedStreaming(filePath, {
        resumeFromCheckpoint: options.resume || false,
        ...options
      });
      
      // 5. Monitor execution
      return new Promise((resolve, reject) => {
        this.chunkedStreamer.once('chunkedStreamingCompleted', (result) => {
          info('G-code file execution completed', result);
          
          // Create post-execution backup
          this.configManager.createBackup('Post-execution backup').then(() => {
            resolve(result);
          }).catch(reject);
        });
        
        this.chunkedStreamer.once('chunkedStreamingStopped', (result) => {
          if (result.completed) {
            resolve(result);
          } else {
            reject(new Error(`Execution stopped: ${result.reason}`));
          }
        });
        
        // Handle errors
        this.chunkedStreamer.once('chunkPermanentlyFailed', (error) => {
          reject(new Error(`Chunk execution failed: ${error.finalError}`));
        });
      });
      
    } catch (err) {
      error('Failed to execute G-code file', { error: err.message, file: filePath });
      throw err;
    }
  }
  
  /**
   * Get comprehensive system status
   */
  getSystemStatus() {
    return {
      timestamp: Date.now(),
      health: this.healthMonitor.getHealthStatus(),
      state: this.stateManager.getState(),
      sync: this.stateSynchronizer.getSyncReport(),
      configuration: this.configManager.getConfiguration(),
      streaming: this.chunkedStreamer.getStreamingStats(),
      overall: {
        systemHealthy: this.healthMonitor.getHealthStatus().isHealthy &&
                      this.stateSynchronizer.getSyncReport().status.syncSuccessRate > 90,
        activeOperations: {
          streaming: this.chunkedStreamer.state.isStreaming,
          syncing: this.stateSynchronizer.syncState.isSyncing,
          monitoring: this.healthMonitor.state.isMonitoring
        }
      }
    };
  }
  
  /**
   * Perform system maintenance
   */
  async performMaintenance() {
    try {
      info('Starting system maintenance...');
      
      // 1. Create maintenance backup
      await this.configManager.createBackup('Maintenance backup');
      
      // 2. Sync from hardware to get latest state
      await this.configManager.syncFromHardware();
      
      // 3. Force state synchronization
      await this.stateSynchronizer.syncNow();
      
      // 4. Reset health metrics
      this.healthMonitor.resetMetrics();
      
      // 5. Reset sync metrics
      this.stateSynchronizer.resetMetrics();
      
      // 6. Clean up old backups
      await this.configManager.cleanupOldBackups();
      
      info('System maintenance completed successfully');
      
      return {
        success: true,
        timestamp: Date.now(),
        status: this.getSystemStatus()
      };
      
    } catch (err) {
      error('System maintenance failed', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Emergency stop with state preservation
   */
  async emergencyStop() {
    try {
      warn('Emergency stop initiated');
      
      // 1. Stop all streaming immediately
      if (this.chunkedStreamer.state.isStreaming) {
        await this.chunkedStreamer.stopStreaming('emergency_stop');
      }
      
      // 2. Create emergency backup
      await this.configManager.createBackup('Emergency stop backup');
      
      // 3. Send emergency stop command
      await this.commandManager.sendCommand('!'); // GRBL feed hold
      await this.commandManager.sendCommand('~'); // GRBL cycle start to clear
      
      // 4. Force state sync
      await this.stateSynchronizer.syncNow();
      
      info('Emergency stop completed');
      
      return {
        success: true,
        timestamp: Date.now(),
        finalState: this.stateManager.getState()
      };
      
    } catch (err) {
      error('Emergency stop failed', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Shutdown system gracefully
   */
  async shutdown() {
    try {
      info('Shutting down CNC system...');
      
      // 1. Stop streaming
      if (this.chunkedStreamer.state.isStreaming) {
        await this.chunkedStreamer.stopStreaming('shutdown');
      }
      
      // 2. Create final backup
      await this.configManager.createBackup('System shutdown backup');
      
      // 3. Stop monitoring and sync
      this.stateSynchronizer.stop();
      this.healthMonitor.stop();
      
      // 4. Save final state
      await this.stateManager.saveState();
      
      // 5. Cleanup all components
      this.chunkedStreamer.cleanup();
      this.configManager.cleanup();
      this.stateSynchronizer.cleanup();
      this.healthMonitor.cleanup();
      this.stateManager.cleanup();
      
      info('CNC system shutdown completed');
      
    } catch (err) {
      error('System shutdown failed', { error: err.message });
      throw err;
    }
  }
}

/**
 * Example 2: Real-time Monitoring Dashboard Data
 * Shows how to collect comprehensive real-time data for monitoring
 */
export class MonitoringDataCollector {
  constructor(cncSystem) {
    this.cncSystem = cncSystem;
    this.dataHistory = [];
    this.monitoringInterval = null;
  }
  
  /**
   * Start collecting monitoring data
   */
  startMonitoring(intervalMs = 1000) {
    this.monitoringInterval = setInterval(() => {
      const data = this.collectMonitoringData();
      this.dataHistory.push(data);
      
      // Limit history size
      if (this.dataHistory.length > 1000) {
        this.dataHistory = this.dataHistory.slice(-500);
      }
      
      // Emit for real-time dashboards
      this.cncSystem.emit('monitoringData', data);
      
    }, intervalMs);
  }
  
  /**
   * Collect comprehensive monitoring data
   */
  collectMonitoringData() {
    const timestamp = Date.now();
    const healthStatus = this.cncSystem.healthMonitor.getHealthStatus();
    const machineState = this.cncSystem.stateManager.getState();
    const syncReport = this.cncSystem.stateSynchronizer.getSyncReport();
    const streamingStats = this.cncSystem.chunkedStreamer.getStreamingStats();
    
    return {
      timestamp,
      health: {
        isHealthy: healthStatus.isHealthy,
        latency: healthStatus.latency,
        stabilityScore: healthStatus.stabilityScore,
        successRate: healthStatus.successRate,
        uptime: healthStatus.uptime
      },
      position: {
        machine: machineState.position.machine,
        work: machineState.position.work
      },
      status: {
        state: machineState.status.state,
        isHomed: machineState.status.isHomed,
        hasAlarm: machineState.status.hasAlarm
      },
      motion: {
        feedRate: machineState.motion.feedRate,
        spindleSpeed: machineState.motion.spindleSpeed,
        spindleDirection: machineState.motion.spindleDirection
      },
      sync: {
        successRate: syncReport.status.syncSuccessRate,
        corrections: syncReport.metrics.positionCorrections + 
                    syncReport.metrics.modalCorrections +
                    syncReport.metrics.statusCorrections,
        timeSinceLastSync: syncReport.status.timeSinceLastSync
      },
      streaming: streamingStats.progress ? {
        isStreaming: streamingStats.isStreaming,
        progress: streamingStats.progress.chunkProgress,
        currentChunk: streamingStats.currentChunk,
        totalChunks: streamingStats.totalChunks,
        estimatedRemaining: streamingStats.estimatedRemaining
      } : null,
      performance: {
        memoryUsage: process.memoryUsage().heapUsed,
        cpuTime: process.cpuUsage()
      }
    };
  }
  
  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  /**
   * Get monitoring history
   */
  getHistory(minutes = 10) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.dataHistory.filter(data => data.timestamp >= cutoff);
  }
}

// Export for use in other modules
export default {
  AdvancedCNCSystem,
  MonitoringDataCollector
};