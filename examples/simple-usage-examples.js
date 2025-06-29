/**
 * Simple Usage Examples
 * 
 * Quick, focused examples for each advanced feature
 * showing the most common use cases.
 */

import { createSerialInterface } from '../src/lib/serial/index.js';
import { EventLoopCommandManager } from '../src/lib/commands/EventLoopCommandManager.js';
import { StreamingManager } from '../src/cnc/streaming/StreamingManager.js';
import { RetryManager } from '../src/cnc/recovery/RetryManager.js';
import { StatusPoller } from '../src/cnc/monitoring/StatusPoller.js';
import { PerformanceTracker } from '../src/cnc/monitoring/PerformanceTracker.js';

/**
 * Example 1: Basic Command with Retry
 * Shows the simplest way to add retry logic to any command
 */
export async function simpleRetryExample() {
  console.log('=== Simple Retry Example ===');
  
  // Setup
  const serial = createSerialInterface();
  const commandManager = new EventLoopCommandManager(serial);
  const retryManager = new RetryManager({ maxRetries: 3 });
  
  await serial.connect('/dev/ttyUSB0');
  
  try {
    // Send command with automatic retry
    const result = await retryManager.executeWithRetry(
      async (cmd) => await commandManager.sendCommand(cmd),
      'G0 X10 Y10'
    );
    
    console.log('✅ Command succeeded:', result);
    
  } catch (error) {
    console.log('❌ Command failed after retries:', error.message);
  }
  
  await serial.disconnect();
}

/**
 * Example 2: Real-time Status Monitoring
 * Shows how to get live machine status updates
 */
export async function simpleMonitoringExample() {
  console.log('=== Simple Monitoring Example ===');
  
  // Setup
  const serial = createSerialInterface();
  const commandManager = new EventLoopCommandManager(serial);
  const statusPoller = new StatusPoller(commandManager);
  
  await serial.connect('/dev/ttyUSB0');
  
  // Listen for status updates
  statusPoller.on('statusUpdate', (event) => {
    const status = event.status;
    console.log(`Status: ${status.state} at [${status.machinePosition?.x}, ${status.machinePosition?.y}, ${status.machinePosition?.z}]`);
  });
  
  // Listen for state changes
  statusPoller.on('stateChange', (change) => {
    console.log(`🔄 State changed: ${change.from} → ${change.to}`);
  });
  
  // Start monitoring
  statusPoller.start();
  
  // Run for 10 seconds then stop
  setTimeout(async () => {
    statusPoller.stop();
    await serial.disconnect();
    console.log('Monitoring stopped');
  }, 10000);
}

/**
 * Example 3: Stream a G-code File
 * Shows how to stream a file with progress tracking
 */
export async function simpleStreamingExample() {
  console.log('=== Simple Streaming Example ===');
  
  // Setup
  const serial = createSerialInterface();
  const commandManager = new EventLoopCommandManager(serial);
  const streamingManager = new StreamingManager(commandManager);
  
  await serial.connect('/dev/ttyUSB0');
  
  // Listen for progress updates
  streamingManager.on('progress', (progress) => {
    console.log(`Progress: ${progress.completionPercentage.toFixed(1)}%`);
  });
  
  // Listen for completion
  streamingManager.on('streamingStopped', (event) => {
    if (event.completed) {
      console.log('✅ File completed successfully!');
    } else {
      console.log(`⚠️ Streaming stopped: ${event.reason}`);
    }
  });
  
  try {
    // Start streaming (replace with actual file path)
    await streamingManager.startStreaming('/path/to/your/file.gcode');
    
  } catch (error) {
    console.log('❌ Streaming failed:', error.message);
  }
  
  await serial.disconnect();
}

/**
 * Example 4: Performance Tracking
 * Shows how to track command performance metrics
 */
export async function simplePerformanceExample() {
  console.log('=== Simple Performance Example ===');
  
  // Setup
  const serial = createSerialInterface();
  const commandManager = new EventLoopCommandManager(serial);
  const performanceTracker = new PerformanceTracker();
  
  await serial.connect('/dev/ttyUSB0');
  performanceTracker.start();
  
  // Send some test commands
  const commands = ['?', 'G0 X5', 'G0 Y5', 'G0 X0 Y0', '?'];
  
  for (const command of commands) {
    try {
      const startTime = Date.now();
      const result = await commandManager.sendCommand(command);
      const responseTime = Date.now() - startTime;
      
      // Record the performance data
      performanceTracker.recordCommand({
        command,
        success: true,
        responseTime
      });
      
      console.log(`✅ ${command} (${responseTime}ms)`);
      
    } catch (error) {
      performanceTracker.recordCommand({
        command,
        success: false,
        error
      });
      
      console.log(`❌ ${command} failed`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Show performance summary
  const metrics = performanceTracker.getCurrentMetrics();
  console.log('\n📊 Performance Summary:');
  console.log(`Commands: ${metrics.commands.total}`);
  console.log(`Success Rate: ${metrics.successRate.toFixed(1)}%`);
  console.log(`Average Response Time: ${metrics.commands.averageResponseTime.toFixed(0)}ms`);
  
  performanceTracker.stop();
  await serial.disconnect();
}

/**
 * Example 5: Error Classification
 * Shows how errors are automatically classified
 */
export async function simpleErrorClassificationExample() {
  console.log('=== Simple Error Classification Example ===');
  
  const { ErrorClassifier } = await import('../src/cnc/recovery/ErrorClassifier.js');
  const errorClassifier = new ErrorClassifier();
  
  // Test different types of errors
  const testErrors = [
    new Error('Timeout waiting for response'),
    new Error('error:1 G-code words consist of a letter and a value'),
    new Error('alarm:1 Hard limit triggered'),
    new Error('Serial port connection lost'),
    new Error('Buffer overflow detected')
  ];
  
  console.log('Classifying different error types:\n');
  
  for (const error of testErrors) {
    const classification = errorClassifier.classifyError(error);
    
    console.log(`Error: "${error.message}"`);
    console.log(`  Type: ${classification.type}`);
    console.log(`  Severity: ${classification.severity}`);
    console.log(`  Retryable: ${classification.retryable}`);
    console.log(`  Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
    console.log(`  Suggested: ${classification.suggestedActions[0] || 'None'}`);
    console.log('');
  }
}

/**
 * Example 6: Circuit Breaker Pattern
 * Shows how the retry manager protects against cascading failures
 */
export async function simpleCircuitBreakerExample() {
  console.log('=== Simple Circuit Breaker Example ===');
  
  const retryManager = new RetryManager({
    maxRetries: 2,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 3  // Open after 3 failures
  });
  
  // Simulate a function that always fails
  const alwaysFailsFunction = async (command) => {
    throw new Error('Simulated failure');
  };
  
  console.log('Sending commands that will fail to trigger circuit breaker...\n');
  
  for (let i = 1; i <= 5; i++) {
    try {
      await retryManager.executeWithRetry(
        alwaysFailsFunction,
        `test_command_${i}`
      );
    } catch (error) {
      console.log(`Command ${i}: ${error.message}`);
    }
    
    const stats = retryManager.getStatistics();
    console.log(`  Circuit breaker state: ${stats.circuitBreaker.state}`);
    console.log(`  Failure count: ${stats.circuitBreaker.failureCount}`);
    console.log('');
  }
  
  console.log('Circuit breaker prevents further attempts when open');
}

/**
 * Example 7: Adaptive Status Polling
 * Shows how polling rate adapts to machine activity
 */
export async function simpleAdaptivePollingExample() {
  console.log('=== Simple Adaptive Polling Example ===');
  
  const serial = createSerialInterface();
  const commandManager = new EventLoopCommandManager(serial);
  const statusPoller = new StatusPoller(commandManager, {
    pollInterval: 500,           // Normal rate
    fastPollInterval: 100,       // Fast rate when active
    slowPollInterval: 2000,      // Slow rate when idle
    enableAdaptivePolling: true
  });
  
  await serial.connect('/dev/ttyUSB0');
  
  // Monitor polling rate changes
  statusPoller.on('pollIntervalChanged', (event) => {
    console.log(`🔄 Poll rate changed to ${event.interval}ms (${event.reason})`);
  });
  
  statusPoller.start();
  
  console.log('Monitoring polling rate adaptation...');
  console.log('Will send a command after 3 seconds to trigger fast polling');
  
  // Send a command after 3 seconds to trigger activity
  setTimeout(async () => {
    try {
      await commandManager.sendCommand('G0 X1');
      console.log('Sent movement command - should trigger fast polling');
    } catch (error) {
      console.log('Command failed:', error.message);
    }
  }, 3000);
  
  // Stop after 10 seconds
  setTimeout(async () => {
    statusPoller.stop();
    await serial.disconnect();
    console.log('Adaptive polling demo completed');
  }, 10000);
}

/**
 * Example 8: G-code File Preprocessing
 * Shows file validation and optimization before streaming
 */
export async function simplePreprocessingExample() {
  console.log('=== Simple Preprocessing Example ===');
  
  const { GcodePreprocessor } = await import('../src/cnc/files/GcodePreprocessor.js');
  const preprocessor = new GcodePreprocessor();
  
  // Create a sample G-code file
  const sampleGcode = `
; Sample G-code file
G17 G20 G90 G94 G54
G0 Z0.25
G0 X1 Y1
G1 Z-0.1 F50
G1 X2 F100
G1 Y2
G1 X1
G1 Y1
G0 Z0.25
M30
`.trim();
  
  // Write to temporary file
  const fs = await import('fs/promises');
  const tempFile = '/tmp/sample.gcode';
  await fs.writeFile(tempFile, sampleGcode);
  
  try {
    // Preprocess the file
    const result = await preprocessor.processFile(tempFile);
    
    if (result.success) {
      console.log('✅ File preprocessing completed');
      console.log(`Lines: ${result.processedLineCount}`);
      console.log(`Warnings: ${result.warnings.length}`);
      console.log(`Errors: ${result.errors.length}`);
      console.log(`Estimated time: ${Math.round(result.estimatedTime / 1000)}s`);
      console.log(`Total distance: ${result.totalDistance.toFixed(2)}mm`);
      
      if (result.warnings.length > 0) {
        console.log('\nWarnings:');
        result.warnings.slice(0, 3).forEach(warning => {
          console.log(`  Line ${warning.line}: ${warning.message}`);
        });
      }
      
      console.log('\nFile bounds:', result.metadata.bounds);
      console.log('Operation counts:', result.metadata.operationCounts);
      
    } else {
      console.log('❌ Preprocessing failed:', result.error);
    }
    
  } finally {
    // Clean up
    await fs.unlink(tempFile);
  }
}

/**
 * Run all simple examples
 */
export async function runSimpleExamples() {
  console.log('🚀 CNC Advanced Features - Simple Examples\n');
  
  const examples = [
    { name: 'Error Classification', fn: simpleErrorClassificationExample },
    { name: 'Circuit Breaker', fn: simpleCircuitBreakerExample },
    { name: 'G-code Preprocessing', fn: simplePreprocessingExample }
  ];
  
  // Note: Examples requiring actual hardware connection are commented out
  // Uncomment and modify port paths to test with real hardware
  
  // { name: 'Retry Logic', fn: simpleRetryExample },
  // { name: 'Status Monitoring', fn: simpleMonitoringExample },
  // { name: 'File Streaming', fn: simpleStreamingExample },
  // { name: 'Performance Tracking', fn: simplePerformanceExample },
  // { name: 'Adaptive Polling', fn: simpleAdaptivePollingExample }
  
  for (const example of examples) {
    try {
      console.log(`\n--- ${example.name} ---`);
      await example.fn();
      console.log(`✅ ${example.name} completed`);
    } catch (error) {
      console.log(`❌ ${example.name} failed:`, error.message);
    }
  }
  
  console.log('\n🎉 All examples completed!');
}

// Individual example exports for selective testing
export {
  simpleRetryExample,
  simpleMonitoringExample,
  simpleStreamingExample,
  simplePerformanceExample,
  simpleErrorClassificationExample,
  simpleCircuitBreakerExample,
  simpleAdaptivePollingExample,
  simplePreprocessingExample
};

// Run examples if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSimpleExamples().catch(console.error);
}