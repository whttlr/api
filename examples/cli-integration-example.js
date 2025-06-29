/**
 * CLI Integration Example
 * 
 * Shows how to integrate advanced features into your existing CLI commands
 * with backward compatibility and enhanced functionality.
 */

import { ConnectionManager } from '../src/cnc/connection/ConnectionManager.js';
import { GcodeSender } from '../src/cnc/GcodeSender.js';
import { StreamingManager } from '../src/cnc/streaming/StreamingManager.js';
import { RetryManager } from '../src/cnc/recovery/RetryManager.js';
import { StatusPoller } from '../src/cnc/monitoring/StatusPoller.js';
import { PerformanceTracker } from '../src/cnc/monitoring/PerformanceTracker.js';
import { AlarmRecoveryManager } from '../src/cnc/recovery/AlarmRecoveryManager.js';
import { info, warn, error } from '../src/lib/logger/LoggerService.js';

/**
 * Enhanced CLI Class with Advanced Features
 * Maintains backward compatibility while adding new capabilities
 */
export class EnhancedCLI {
  constructor(config = {}) {
    this.config = {
      enableAdvancedFeatures: true,
      enableStreaming: true,
      enableAutoRecovery: true,
      enableMonitoring: true,
      enableRetry: true,
      ...config
    };
    
    // Core components (existing)
    this.connectionManager = null;
    this.gcodeSender = null;
    
    // Advanced components (new)
    this.streamingManager = null;
    this.retryManager = null;
    this.statusPoller = null;
    this.performanceTracker = null;
    this.alarmRecovery = null;
    
    this.isConnected = false;
    this.isStreaming = false;
  }

  /**
   * Enhanced connection with monitoring
   */
  async connect(portPath, options = {}) {
    try {
      info(`Connecting to ${portPath}...`);
      
      // Initialize connection manager with new serial interface
      this.connectionManager = new ConnectionManager();
      await this.connectionManager.connect(portPath, options);
      
      // Initialize G-code sender
      this.gcodeSender = new GcodeSender(this.connectionManager);
      
      // Initialize advanced features if enabled
      if (this.config.enableAdvancedFeatures) {
        await this.initializeAdvancedFeatures();
      }
      
      this.isConnected = true;
      info(`✅ Connected to ${portPath}`);
      
      return { success: true, port: portPath };
      
    } catch (err) {
      error('Connection failed', { error: err.message, port: portPath });
      return { success: false, error: err.message };
    }
  }

  /**
   * Initialize advanced features
   */
  async initializeAdvancedFeatures() {
    const commandManager = this.connectionManager.commandManager;
    
    // Initialize retry manager
    if (this.config.enableRetry) {
      this.retryManager = new RetryManager({
        maxRetries: 3,
        enableCircuitBreaker: true
      });
      info('✓ Retry manager initialized');
    }
    
    // Initialize alarm recovery
    if (this.config.enableAutoRecovery) {
      this.alarmRecovery = new AlarmRecoveryManager(commandManager, {
        enableAutoRecovery: true,
        safeHeight: 5.0
      });
      info('✓ Alarm recovery initialized');
    }
    
    // Initialize monitoring
    if (this.config.enableMonitoring) {
      this.statusPoller = new StatusPoller(commandManager, {
        pollInterval: 250,
        enableAdaptivePolling: true
      });
      
      this.performanceTracker = new PerformanceTracker({
        enableRealTimeMetrics: true,
        enableAlerting: true
      });
      
      // Start monitoring
      this.performanceTracker.start();
      this.statusPoller.start();
      
      info('✓ Monitoring started');
    }
    
    // Initialize streaming
    if (this.config.enableStreaming) {
      this.streamingManager = new StreamingManager(commandManager, {
        batchSize: 5,
        lookAheadLines: 15,
        enableOptimization: true
      });
      info('✓ Streaming manager initialized');
    }
    
    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Enhanced disconnect with cleanup
   */
  async disconnect() {
    try {
      info('Disconnecting...');
      
      // Stop streaming if active
      if (this.isStreaming && this.streamingManager) {
        await this.streamingManager.stopStreaming('disconnect');
      }
      
      // Stop monitoring
      if (this.statusPoller) {
        this.statusPoller.stop();
      }
      
      if (this.performanceTracker) {
        this.performanceTracker.stop();
      }
      
      // Disconnect
      if (this.connectionManager) {
        await this.connectionManager.disconnect();
      }
      
      this.isConnected = false;
      info('✅ Disconnected');
      
      return { success: true };
      
    } catch (err) {
      error('Disconnect failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Enhanced command sending with retry logic
   */
  async sendCommand(command, options = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to machine');
    }
    
    try {
      let result;
      
      // Use retry manager if available
      if (this.retryManager && options.retry !== false) {
        result = await this.retryManager.executeWithRetry(
          async (cmd) => await this.gcodeSender.sendGcode(cmd),
          command,
          { commandId: options.commandId || `cmd_${Date.now()}` }
        );
      } else {
        // Fallback to direct sending
        result = await this.gcodeSender.sendGcode(command);
      }
      
      return { success: true, response: result };
      
    } catch (err) {
      error('Command failed', { command, error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Enhanced file streaming
   */
  async streamFile(filePath, options = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to machine');
    }
    
    if (!this.streamingManager) {
      throw new Error('Streaming not available - advanced features disabled');
    }
    
    try {
      info(`Starting to stream file: ${filePath}`);
      this.isStreaming = true;
      
      // Set up progress reporting
      if (options.showProgress !== false) {
        this.setupProgressReporting();
      }
      
      // Start streaming
      await this.streamingManager.startStreaming(filePath, options);
      
      // Wait for completion
      return new Promise((resolve, reject) => {
        this.streamingManager.once('streamingStopped', (event) => {
          this.isStreaming = false;
          
          if (event.completed) {
            info('✅ File streaming completed successfully');
            resolve({
              success: true,
              stats: event.stats
            });
          } else {
            warn(`Streaming stopped: ${event.reason}`);
            resolve({
              success: false,
              reason: event.reason,
              stats: event.stats
            });
          }
        });
        
        this.streamingManager.once('streamingError', (event) => {
          this.isStreaming = false;
          error('Streaming failed', { error: event.error.message });
          reject(event.error);
        });
      });
      
    } catch (err) {
      this.isStreaming = false;
      error('Failed to start streaming', { error: err.message });
      throw err;
    }
  }

  /**
   * Get machine status with enhanced information
   */
  async getStatus() {
    if (!this.isConnected) {
      throw new Error('Not connected to machine');
    }
    
    try {
      // Get basic status
      const basicStatus = await this.gcodeSender.sendGcode('?');
      
      // Enhanced status if monitoring is available
      let enhancedStatus = { basic: basicStatus };
      
      if (this.statusPoller) {
        enhancedStatus.current = this.statusPoller.getCurrentStatus();
        enhancedStatus.polling = this.statusPoller.getMetrics();
      }
      
      if (this.performanceTracker) {
        enhancedStatus.performance = this.performanceTracker.getCurrentMetrics();
      }
      
      if (this.streamingManager && this.isStreaming) {
        enhancedStatus.streaming = this.streamingManager.getStreamingStats();
      }
      
      return enhancedStatus;
      
    } catch (err) {
      error('Failed to get status', { error: err.message });
      throw err;
    }
  }

  /**
   * Home machine with enhanced error handling
   */
  async homeMachine(options = {}) {
    if (!this.isConnected) {
      throw new Error('Not connected to machine');
    }
    
    try {
      info('Starting homing sequence...');
      
      const homingSequence = [
        { command: '$X', description: 'Unlocking machine' },
        { command: '?', description: 'Checking status' },
        { command: '$H', description: 'Homing machine', timeout: 60000 },
        { command: '?', description: 'Verifying home position' }
      ];
      
      const results = [];
      
      for (const step of homingSequence) {
        info(step.description);
        
        try {
          const result = await this.sendCommand(step.command, {
            timeout: step.timeout || 5000,
            retry: true
          });
          
          results.push({ ...step, success: true, result });
          
          if (step.command === '?') {
            // Parse and display status
            const status = this.parseStatusResponse(result.response);
            if (status) {
              info(`Machine state: ${status.state}, Position: [${status.position?.x || 0}, ${status.position?.y || 0}, ${status.position?.z || 0}]`);
            }
          }
          
        } catch (err) {
          results.push({ ...step, success: false, error: err.message });
          
          if (step.command === '$H') {
            error('Homing failed - this may require manual intervention');
            throw new Error(`Homing failed: ${err.message}`);
          } else {
            warn(`Step failed but continuing: ${err.message}`);
          }
        }
        
        // Brief pause between commands
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      info('✅ Homing sequence completed');
      return { success: true, results };
      
    } catch (err) {
      error('Homing sequence failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Emergency stop with immediate response
   */
  async emergencyStop() {
    try {
      info('🚨 EMERGENCY STOP');
      
      // Stop streaming immediately
      if (this.isStreaming && this.streamingManager) {
        await this.streamingManager.stopStreaming('emergency_stop');
      }
      
      // Send immediate stop commands
      if (this.connectionManager) {
        // Send soft reset (Ctrl+X)
        await this.connectionManager.sendRawData('\x18');
        
        // Wait briefly then check status
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const status = await this.sendCommand('?');
        info('Emergency stop executed', status);
      }
      
      return { success: true };
      
    } catch (err) {
      error('Emergency stop failed', { error: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Get comprehensive diagnostics
   */
  getDiagnostics() {
    const diagnostics = {
      connection: {
        isConnected: this.isConnected,
        port: this.connectionManager?.currentPort || null
      },
      features: {
        advancedFeatures: this.config.enableAdvancedFeatures,
        streaming: !!this.streamingManager,
        monitoring: !!this.statusPoller,
        autoRecovery: !!this.alarmRecovery,
        retry: !!this.retryManager
      }
    };
    
    // Add monitoring data if available
    if (this.performanceTracker) {
      diagnostics.performance = this.performanceTracker.getCurrentMetrics();
    }
    
    if (this.statusPoller) {
      diagnostics.polling = this.statusPoller.getMetrics();
    }
    
    if (this.retryManager) {
      diagnostics.retry = this.retryManager.getStatistics();
    }
    
    if (this.alarmRecovery) {
      diagnostics.recovery = this.alarmRecovery.getStatistics();
    }
    
    return diagnostics;
  }

  /**
   * Setup event listeners for advanced features
   */
  setupEventListeners() {
    // Alarm recovery events
    if (this.alarmRecovery) {
      this.alarmRecovery.on('recoveryStarted', (event) => {
        warn(`🔧 Auto-recovery started for alarm ${event.alarmCode}: ${event.alarmInfo.name}`);
      });
      
      this.alarmRecovery.on('recoveryCompleted', (event) => {
        info(`✅ Auto-recovery completed for alarm ${event.alarmCode} in ${event.duration}ms`);
      });
      
      this.alarmRecovery.on('recoveryFailed', (event) => {
        error(`❌ Auto-recovery failed for alarm ${event.alarmCode}: ${event.reason}`);
      });
    }
    
    // Performance alerts
    if (this.performanceTracker) {
      this.performanceTracker.on('performanceAlert', (alert) => {
        warn(`⚠️  Performance alert: ${alert.type}`, alert.data);
      });
    }
    
    // Status monitoring
    if (this.statusPoller) {
      this.statusPoller.on('stateChange', (change) => {
        info(`🔄 Machine state: ${change.from} → ${change.to}`);
      });
      
      this.statusPoller.on('alarmDetected', (event) => {
        error(`🚨 ALARM DETECTED: ${event.status.state}`);
      });
    }
  }

  /**
   * Setup progress reporting for file streaming
   */
  setupProgressReporting() {
    if (!this.streamingManager) return;
    
    let lastProgressUpdate = 0;
    
    this.streamingManager.on('progress', (progress) => {
      const now = Date.now();
      
      // Throttle progress updates to every 2 seconds
      if (now - lastProgressUpdate >= 2000) {
        const percent = progress.completionPercentage.toFixed(1);
        const eta = progress.estimatedRemaining ? 
          Math.round(progress.estimatedRemaining / 1000) : '?';
        
        info(`📈 Progress: ${percent}% (${progress.currentLine}/${progress.totalLines}) ETA: ${eta}s`);
        lastProgressUpdate = now;
      }
    });
    
    this.streamingManager.on('commandError', (event) => {
      warn(`⚠️  Command error at line ${event.line}: ${event.error.message}`);
    });
  }

  /**
   * Parse status response (simple parser)
   */
  parseStatusResponse(response) {
    if (!response || !response.raw) return null;
    
    const match = response.raw.match(/<([^|]+)\|MPos:(-?\d+\.?\d*),(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      return {
        state: match[1],
        position: {
          x: parseFloat(match[2]),
          y: parseFloat(match[3]),
          z: parseFloat(match[4])
        }
      };
    }
    
    return null;
  }
}

/**
 * CLI Command Implementations
 * Enhanced versions of existing CLI commands
 */

export async function enhancedConnectCommand(portPath, options = {}) {
  const cli = new EnhancedCLI({
    enableAdvancedFeatures: options.advanced !== false,
    enableStreaming: options.streaming !== false,
    enableMonitoring: options.monitoring !== false,
    enableAutoRecovery: options.autoRecovery !== false
  });
  
  const result = await cli.connect(portPath, options);
  
  if (result.success) {
    // Store CLI instance globally for other commands
    global.cncCLI = cli;
    console.log(`✅ Connected to ${portPath}`);
    
    if (options.advanced !== false) {
      console.log('🚀 Advanced features enabled');
      
      // Show initial status
      const status = await cli.getStatus();
      if (status.current) {
        console.log(`📊 Status: ${status.current.state} at [${status.current.machinePosition?.x || 0}, ${status.current.machinePosition?.y || 0}, ${status.current.machinePosition?.z || 0}]`);
      }
    }
  } else {
    console.error(`❌ Connection failed: ${result.error}`);
    process.exit(1);
  }
  
  return cli;
}

export async function enhancedSendCommand(command, options = {}) {
  const cli = global.cncCLI;
  if (!cli) {
    console.error('❌ Not connected. Use connect command first.');
    process.exit(1);
  }
  
  try {
    const result = await cli.sendCommand(command, options);
    
    if (result.success) {
      console.log(`✅ ${command}`);
      if (result.response && result.response.raw) {
        console.log(`   Response: ${result.response.raw}`);
      }
    } else {
      console.error(`❌ ${command} failed: ${result.error}`);
    }
    
    return result;
    
  } catch (err) {
    console.error(`❌ Command failed: ${err.message}`);
    process.exit(1);
  }
}

export async function enhancedStreamCommand(filePath, options = {}) {
  const cli = global.cncCLI;
  if (!cli) {
    console.error('❌ Not connected. Use connect command first.');
    process.exit(1);
  }
  
  try {
    console.log(`🚀 Streaming file: ${filePath}`);
    
    const result = await cli.streamFile(filePath, {
      showProgress: options.progress !== false,
      validateSyntax: options.validate !== false,
      ...options
    });
    
    if (result.success) {
      console.log('✅ File streaming completed successfully');
      console.log(`📊 Stats: ${result.stats.currentLine} lines, ${Math.round(result.stats.elapsedTime / 1000)}s, ${result.stats.errorCount} errors`);
    } else {
      console.log(`⚠️  Streaming stopped: ${result.reason}`);
    }
    
    return result;
    
  } catch (err) {
    console.error(`❌ Streaming failed: ${err.message}`);
    process.exit(1);
  }
}

export async function enhancedStatusCommand(options = {}) {
  const cli = global.cncCLI;
  if (!cli) {
    console.error('❌ Not connected. Use connect command first.');
    process.exit(1);
  }
  
  try {
    const status = await cli.getStatus();
    
    console.log('\n📊 Machine Status:');
    
    if (status.current) {
      const pos = status.current.machinePosition || {};
      console.log(`   State: ${status.current.state}`);
      console.log(`   Position: [${pos.x || 0}, ${pos.y || 0}, ${pos.z || 0}]`);
      console.log(`   Feed Rate: ${status.current.feedRate || 0}`);
      console.log(`   Spindle: ${status.current.spindleSpeed || 0}`);
    }
    
    if (status.performance && options.detailed) {
      console.log('\n📈 Performance:');
      console.log(`   Commands: ${status.performance.commands.total} (${status.performance.successRate.toFixed(1)}% success)`);
      console.log(`   Avg Response: ${status.performance.commands.averageResponseTime.toFixed(0)}ms`);
      console.log(`   Throughput: ${status.performance.throughput.commandsPerSecond} cmd/s`);
      console.log(`   Errors: ${status.performance.errors.total}`);
    }
    
    if (status.streaming) {
      console.log('\n🎬 Streaming:');
      console.log(`   Progress: ${status.streaming.completionPercent.toFixed(1)}%`);
      console.log(`   Line: ${status.streaming.currentLine}/${status.streaming.totalLines}`);
      console.log(`   Buffer: ${status.streaming.bufferUtilization.toFixed(1)}%`);
    }
    
    return status;
    
  } catch (err) {
    console.error(`❌ Status failed: ${err.message}`);
    process.exit(1);
  }
}

export async function enhancedDisconnectCommand() {
  const cli = global.cncCLI;
  if (!cli) {
    console.log('Not connected.');
    return;
  }
  
  try {
    const result = await cli.disconnect();
    
    if (result.success) {
      console.log('✅ Disconnected');
      global.cncCLI = null;
    } else {
      console.error(`❌ Disconnect failed: ${result.error}`);
    }
    
    return result;
    
  } catch (err) {
    console.error(`❌ Disconnect failed: ${err.message}`);
  }
}

/**
 * Example usage in your existing CLI structure
 */
export function integrateCLICommands(program) {
  // Enhanced connect command
  program
    .command('connect <port>')
    .description('Connect to CNC machine with advanced features')
    .option('--no-advanced', 'Disable advanced features')
    .option('--no-streaming', 'Disable streaming')
    .option('--no-monitoring', 'Disable monitoring')
    .option('--no-auto-recovery', 'Disable auto recovery')
    .option('--baud-rate <rate>', 'Baud rate', '115200')
    .action(async (port, options) => {
      await enhancedConnectCommand(port, {
        baudRate: parseInt(options.baudRate),
        advanced: options.advanced,
        streaming: options.streaming,
        monitoring: options.monitoring,
        autoRecovery: options.autoRecovery
      });
    });
  
  // Enhanced send command
  program
    .command('send <command>')
    .description('Send G-code command with retry logic')
    .option('--no-retry', 'Disable retry logic')
    .option('--timeout <ms>', 'Command timeout', '5000')
    .action(async (command, options) => {
      await enhancedSendCommand(command, {
        retry: options.retry,
        timeout: parseInt(options.timeout)
      });
    });
  
  // Enhanced stream command
  program
    .command('stream <file>')
    .description('Stream G-code file with optimization')
    .option('--no-progress', 'Disable progress reporting')
    .option('--no-validate', 'Disable syntax validation')
    .option('--batch-size <size>', 'Batch size', '5')
    .action(async (file, options) => {
      await enhancedStreamCommand(file, {
        progress: options.progress,
        validate: options.validate,
        batchSize: parseInt(options.batchSize)
      });
    });
  
  // Enhanced status command
  program
    .command('status')
    .description('Get machine status with performance metrics')
    .option('--detailed', 'Show detailed performance metrics')
    .action(async (options) => {
      await enhancedStatusCommand(options);
    });
  
  // Home command
  program
    .command('home')
    .description('Home machine with enhanced error handling')
    .action(async () => {
      const cli = global.cncCLI;
      if (!cli) {
        console.error('❌ Not connected. Use connect command first.');
        process.exit(1);
      }
      
      const result = await cli.homeMachine();
      if (!result.success) {
        console.error(`❌ Homing failed: ${result.error}`);
        process.exit(1);
      }
    });
  
  // Emergency stop command
  program
    .command('stop')
    .description('Emergency stop')
    .action(async () => {
      const cli = global.cncCLI;
      if (!cli) {
        console.error('❌ Not connected.');
        process.exit(1);
      }
      
      await cli.emergencyStop();
    });
  
  // Diagnostics command
  program
    .command('diagnostics')
    .description('Show system diagnostics')
    .action(() => {
      const cli = global.cncCLI;
      if (!cli) {
        console.error('❌ Not connected.');
        process.exit(1);
      }
      
      const diagnostics = cli.getDiagnostics();
      console.log('\n🔧 System Diagnostics:');
      console.log(JSON.stringify(diagnostics, null, 2));
    });
  
  // Disconnect command
  program
    .command('disconnect')
    .description('Disconnect from machine')
    .action(enhancedDisconnectCommand);
}

// Export for use in your main CLI file
export { EnhancedCLI };