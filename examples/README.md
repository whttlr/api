# Advanced CNC Features Integration Guide

This guide demonstrates how to use the Phase 1.5 advanced CNC control features together for enterprise-grade machine control.

## Overview

The advanced features provide comprehensive CNC control with:

- **Connection Health Monitoring** - Real-time connection monitoring with automatic recovery
- **Machine State Management** - Complete state tracking with persistence and history
- **State Synchronization** - Hardware-software state synchronization with automatic correction
- **Chunked File Streaming** - Large file processing with pause/resume and memory management
- **Configuration Management** - Backup/restore with hardware synchronization

## Quick Start

```javascript
import { AdvancedCNCSystem } from './advanced-features-integration.js';

// Initialize with your existing interfaces
const cncSystem = new AdvancedCNCSystem(
  serialInterface,    // Your serial connection
  commandManager,     // Your command manager
  streamingManager    // Your streaming manager
);

// Start the system
await cncSystem.start();

// Execute a large G-code file with monitoring
await cncSystem.executeGcodeFile('large-project.gcode', {
  resume: true  // Resume from checkpoint if available
});

// Get real-time system status
const status = cncSystem.getSystemStatus();
console.log('System Health:', status.overall.systemHealthy);
```

## Features Overview

### 1. Connection Health Monitoring

Monitors serial connection health and provides automatic recovery:

```javascript
const healthMonitor = new ConnectionHealthMonitor(serialInterface, {
  healthCheckInterval: 3000,
  enableAutoRecovery: true,
  enableLatencyTracking: true,
  maxConsecutiveFailures: 3
});

healthMonitor.start();

// Listen for health events
healthMonitor.on('healthDegraded', (event) => {
  console.log('Connection issues detected:', event);
});

healthMonitor.on('healthRestored', (event) => {
  console.log('Connection restored:', event);
});
```

**Key Features:**
- Real-time ping tests with latency tracking
- Automatic connection recovery with circuit breaker pattern
- Connection stability scoring
- Comprehensive health metrics

### 2. Machine State Management

Comprehensive state tracking with persistence:

```javascript
const stateManager = new MachineStateManager({
  persistState: true,
  stateFile: './machine-state.json',
  autoSave: true,
  trackHistory: true
});

// Update machine position
stateManager.updatePosition({ x: 10.5, y: 20.0, z: 5.0 });

// Update machine status
stateManager.updateStatus('Run');

// Set work coordinate system
stateManager.setWorkCoordinateSystem('G54', { x: 0, y: 0, z: 0 });

// Get complete state
const state = stateManager.getState();
```

**Key Features:**
- Position and work coordinate tracking
- Modal G-code group management
- Tool and program state tracking
- Automatic state persistence
- Change history with timestamps

### 3. State Synchronization

Ensures software state matches hardware state:

```javascript
const stateSynchronizer = new StateSynchronizer(stateManager, commandManager, {
  syncInterval: 2000,
  enableAutoSync: true,
  enableCorrection: true,
  positionTolerance: 0.01
});

stateSynchronizer.start();

// Listen for discrepancies
stateSynchronizer.on('discrepancyDetected', (discrepancy) => {
  console.log('State corrected:', discrepancy);
});

// Force immediate sync
await stateSynchronizer.syncNow();
```

**Key Features:**
- Continuous hardware state monitoring
- Automatic discrepancy detection and correction
- Position, modal group, and coordinate system validation
- Configurable sync intervals and tolerances

### 4. Chunked File Streaming

Process large G-code files efficiently:

```javascript
const chunkedStreamer = new ChunkedFileStreamer(streamingManager, {
  chunkSize: 1000,
  enablePauseResume: true,
  enableCheckpointing: true,
  maxMemoryUsage: 100 * 1024 * 1024
});

// Stream large file
await chunkedStreamer.startChunkedStreaming('huge-file.gcode', {
  resumeFromCheckpoint: true
});

// Monitor progress
chunkedStreamer.on('chunkCompleted', (event) => {
  console.log(`Progress: ${event.totalProgress * 100}%`);
});

// Pause/resume
chunkedStreamer.pauseStreaming();
chunkedStreamer.resumeStreaming();
```

**Key Features:**
- Memory-efficient large file processing
- Automatic checkpointing and resume
- Pause/resume functionality
- Chunk-level retry logic
- Real-time progress tracking

### 5. Configuration Management

Complete configuration backup and hardware synchronization:

```javascript
const configManager = new ConfigurationManager(commandManager, {
  configDirectory: './configs',
  backupDirectory: './backups',
  enableAutoBackup: true,
  enableSync: true
});

// Create backup
await configManager.createBackup('Manual backup');

// Sync configuration to hardware
await configManager.syncToHardware();

// Sync configuration from hardware
await configManager.syncFromHardware();

// Export configuration
await configManager.exportConfiguration('./config-export.json');
```

**Key Features:**
- Automatic configuration backups
- Hardware synchronization (to/from)
- Configuration versioning and validation
- Import/export functionality
- Preset management

## Integration Examples

### Complete System Setup

The `AdvancedCNCSystem` class provides a complete integration:

```javascript
const system = new AdvancedCNCSystem(serialInterface, commandManager, streamingManager);

// Start all components
await system.start();

// System provides automatic:
// - Health monitoring with recovery
// - State synchronization
// - Configuration backup
// - Event coordination between components
```

### Real-time Monitoring

The `MonitoringDataCollector` provides comprehensive real-time data:

```javascript
const collector = new MonitoringDataCollector(cncSystem);

collector.startMonitoring(1000); // Collect every second

// Get real-time data
collector.on('monitoringData', (data) => {
  console.log('Health:', data.health.isHealthy);
  console.log('Position:', data.position.machine);
  console.log('Progress:', data.streaming?.progress);
});
```

### Emergency Operations

```javascript
// Emergency stop with state preservation
await system.emergencyStop();

// System maintenance
await system.performMaintenance();

// Graceful shutdown
await system.shutdown();
```

## Event-Driven Architecture

All components use EventEmitter for real-time updates:

```javascript
// Health monitoring events
healthMonitor.on('healthDegraded', handleHealthIssue);
healthMonitor.on('latencyWarning', handleSlowConnection);

// State management events
stateManager.on('positionChanged', updateDisplay);
stateManager.on('statusChanged', handleStatusChange);

// Synchronization events
stateSynchronizer.on('discrepancyDetected', logDiscrepancy);

// Streaming events
chunkedStreamer.on('chunkCompleted', updateProgress);
chunkedStreamer.on('streamingCompleted', handleCompletion);

// Configuration events
configManager.on('backupCreated', logBackup);
configManager.on('configurationUpdated', syncToHardware);
```

## Best Practices

### 1. Initialize in Order
```javascript
// Proper initialization sequence
await configManager.initialize();
await stateManager.initialize();
healthMonitor.start();
stateSynchronizer.start();
```

### 2. Handle Events Properly
```javascript
// Always handle errors and degraded states
healthMonitor.on('healthDegraded', async (event) => {
  // Pause operations
  if (chunkedStreamer.state.isStreaming) {
    chunkedStreamer.pauseStreaming();
  }
  
  // Create emergency backup
  await configManager.createBackup('Emergency backup');
});
```

### 3. Use Checkpoints for Long Operations
```javascript
// Enable checkpointing for resumable operations
const chunkedStreamer = new ChunkedFileStreamer(streamingManager, {
  enableCheckpointing: true,
  checkpointInterval: 5000 // Every 5000 lines
});
```

### 4. Monitor System Health
```javascript
// Regular system health checks
setInterval(async () => {
  const status = system.getSystemStatus();
  
  if (!status.overall.systemHealthy) {
    console.warn('System health degraded:', status);
    // Take corrective action
  }
}, 10000);
```

### 5. Graceful Shutdown
```javascript
// Always shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await system.shutdown();
  process.exit(0);
});
```

## Configuration Options

### Health Monitor Configuration
```javascript
{
  healthCheckInterval: 5000,        // Health check interval (ms)
  pingCommand: '?',                 // Command to test connection
  pingTimeout: 2000,                // Ping timeout (ms)
  maxConsecutiveFailures: 3,        // Max failures before unhealthy
  recoveryAttempts: 3,              // Max recovery attempts
  enableAutoRecovery: true,         // Enable automatic recovery
  enableLatencyTracking: true,      // Track connection latency
  warningLatencyThreshold: 1000,    // Latency warning threshold (ms)
  criticalLatencyThreshold: 3000    // Critical latency threshold (ms)
}
```

### State Manager Configuration
```javascript
{
  persistState: true,               // Save state to disk
  stateFile: 'machine-state.json',  // State file path
  autoSave: true,                   // Auto-save on changes
  saveInterval: 5000,               // Auto-save interval (ms)
  validateState: true,              // Validate state changes
  trackHistory: true,               // Keep state change history
  historyLimit: 1000               // Max history entries
}
```

### State Synchronizer Configuration
```javascript
{
  syncInterval: 1000,               // Sync check interval (ms)
  enableAutoSync: true,             // Enable automatic synchronization
  enableValidation: true,           // Enable state validation
  enableCorrection: true,           // Enable automatic correction
  positionTolerance: 0.01,          // Position sync tolerance (mm)
  maxSyncAttempts: 3,               // Max sync attempts before error
  deepSyncInterval: 30000,          // Deep sync interval (ms)
  prioritizeHardware: true          // Hardware state takes precedence
}
```

### Chunked Streamer Configuration
```javascript
{
  chunkSize: 1000,                  // Lines per chunk
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB memory limit
  enablePauseResume: true,          // Enable pause/resume functionality
  enableCheckpointing: true,        // Save progress checkpoints
  checkpointInterval: 5000,         // Checkpoint interval (lines)
  maxConcurrentChunks: 3,           // Max chunks in memory
  retryFailedChunks: true,          // Retry failed chunks
  maxChunkRetries: 3                // Max retries per chunk
}
```

### Configuration Manager Configuration
```javascript
{
  configDirectory: './configs',     // Configuration storage directory
  backupDirectory: './backups',     // Backup storage directory
  enableAutoBackup: true,           // Auto-backup on changes
  backupInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxBackups: 10,                   // Maximum backup files to keep
  enableValidation: true,           // Validate configurations
  enableSync: true,                 // Sync with hardware
  enableVersioning: true            // Version configuration changes
}
```

## Error Handling

The system provides comprehensive error handling:

```javascript
try {
  await system.executeGcodeFile('file.gcode');
} catch (error) {
  if (error.message.includes('connection is unhealthy')) {
    // Handle connection issues
    await system.healthMonitor.checkHealthNow();
  } else if (error.message.includes('Chunk execution failed')) {
    // Handle streaming issues
    console.log('Streaming failed, attempting recovery...');
  }
}
```

## Performance Considerations

- **Memory Usage**: Chunked streaming limits memory usage for large files
- **CPU Usage**: Configurable sync intervals balance responsiveness vs CPU load
- **Storage**: Automatic cleanup of old backups and history entries
- **Network**: Health monitoring adjusts based on connection quality

## Troubleshooting

### Common Issues

1. **High Memory Usage**: Reduce chunk size or max concurrent chunks
2. **Slow Performance**: Increase sync intervals or disable unnecessary features
3. **Connection Issues**: Check health monitor settings and recovery configuration
4. **State Sync Problems**: Verify hardware query commands and tolerances

### Debug Logging

Enable debug logging for detailed diagnostics:

```javascript
import { LoggerService } from '../src/lib/logger/LoggerService.js';

// Set log level to debug
LoggerService.setLevel('debug');
```

## License

This integration follows the same license as the main CNC project.