/**
 * PerformanceTracker Test Suite
 * 
 * Tests for performance monitoring and metrics collection functionality
 * including command execution timing and system performance tracking.
 */

import { PerformanceTracker } from '../PerformanceTracker.js';
import { MockCommandManager } from '../__mocks__/MockCommandManager.js';

describe('PerformanceTracker', () => {
  let performanceTracker;
  let mockCommandManager;

  beforeEach(() => {
    mockCommandManager = new MockCommandManager();
    performanceTracker = new PerformanceTracker(mockCommandManager, {
      enableCommandTiming: true,
      enableSystemMetrics: true,
      metricsInterval: 100,
      historySize: 50
    });
  });

  afterEach(() => {
    performanceTracker.cleanup();
  });

  describe('constructor', () => {
    test('should create PerformanceTracker with valid command manager', () => {
      expect(performanceTracker).toBeInstanceOf(PerformanceTracker);
      expect(performanceTracker.commandManager).toBe(mockCommandManager);
      expect(performanceTracker.isTracking).toBe(false);
    });

    test('should throw error without command manager', () => {
      expect(() => new PerformanceTracker()).toThrow('PerformanceTracker requires a command manager');
    });

    test('should apply default configuration', () => {
      const defaultTracker = new PerformanceTracker(mockCommandManager);
      expect(defaultTracker.config.enableCommandTiming).toBe(true);
      expect(defaultTracker.config.metricsInterval).toBe(1000);
    });
  });

  describe('startTracking', () => {
    test('should start tracking successfully', () => {
      performanceTracker.startTracking();
      
      expect(performanceTracker.isTracking).toBe(true);
      expect(performanceTracker.startTime).toBeDefined();
    });

    test('should not start tracking if already tracking', () => {
      performanceTracker.startTracking();
      const firstStartTime = performanceTracker.startTime;
      
      performanceTracker.startTracking();
      
      expect(performanceTracker.startTime).toBe(firstStartTime);
    });

    test('should emit tracking started event', () => {
      const startedSpy = jest.fn();
      performanceTracker.on('trackingStarted', startedSpy);
      
      performanceTracker.startTracking();
      
      expect(startedSpy).toHaveBeenCalled();
    });
  });

  describe('stopTracking', () => {
    test('should stop tracking successfully', () => {
      performanceTracker.startTracking();
      
      performanceTracker.stopTracking();
      
      expect(performanceTracker.isTracking).toBe(false);
    });

    test('should emit tracking stopped event', () => {
      const stoppedSpy = jest.fn();
      performanceTracker.on('trackingStopped', stoppedSpy);
      
      performanceTracker.startTracking();
      performanceTracker.stopTracking();
      
      expect(stoppedSpy).toHaveBeenCalled();
    });
  });

  describe('command timing', () => {
    test('should track command execution time', async () => {
      performanceTracker.startTracking();
      mockCommandManager.setMockDelay(100);
      mockCommandManager.setMockResponse('G0 X10', { response: 'ok' });
      
      performanceTracker.startCommandTiming('G0 X10');
      await mockCommandManager.sendCommand('G0 X10');
      performanceTracker.endCommandTiming('G0 X10');
      
      const metrics = performanceTracker.getCommandMetrics();
      expect(metrics.totalCommands).toBe(1);
      expect(metrics.averageExecutionTime).toBeGreaterThan(90);
    });

    test('should track different command types', async () => {
      performanceTracker.startTracking();
      mockCommandManager.setMockResponse('G0 X10', { response: 'ok' });
      mockCommandManager.setMockResponse('M3 S1000', { response: 'ok' });
      
      performanceTracker.startCommandTiming('G0 X10');
      await mockCommandManager.sendCommand('G0 X10');
      performanceTracker.endCommandTiming('G0 X10');
      
      performanceTracker.startCommandTiming('M3 S1000');
      await mockCommandManager.sendCommand('M3 S1000');
      performanceTracker.endCommandTiming('M3 S1000');
      
      const typeMetrics = performanceTracker.getCommandTypeMetrics();
      expect(typeMetrics).toHaveProperty('G');
      expect(typeMetrics).toHaveProperty('M');
    });

    test('should detect slow commands', async () => {
      const slowCommandSpy = jest.fn();
      performanceTracker.on('slowCommand', slowCommandSpy);
      performanceTracker.config.slowCommandThreshold = 50;
      
      performanceTracker.startTracking();
      mockCommandManager.setMockDelay(100);
      mockCommandManager.setMockResponse('G0 X10', { response: 'ok' });
      
      performanceTracker.startCommandTiming('G0 X10');
      await mockCommandManager.sendCommand('G0 X10');
      performanceTracker.endCommandTiming('G0 X10');
      
      expect(slowCommandSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'G0 X10',
          executionTime: expect.any(Number)
        })
      );
    });
  });

  describe('system metrics', () => {
    test('should collect system performance metrics', async () => {
      performanceTracker.config.enableSystemMetrics = true;
      performanceTracker.startTracking();
      
      // Wait for metrics collection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const systemMetrics = performanceTracker.getSystemMetrics();
      expect(systemMetrics).toHaveProperty('memoryUsage');
      expect(systemMetrics).toHaveProperty('cpuUsage');
    });

    test('should track memory usage over time', async () => {
      performanceTracker.config.enableSystemMetrics = true;
      performanceTracker.startTracking();
      
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const history = performanceTracker.getMetricsHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('memoryUsage');
      expect(history[0]).toHaveProperty('timestamp');
    });
  });

  describe('throughput tracking', () => {
    test('should calculate commands per second', async () => {
      performanceTracker.startTracking();
      
      // Simulate multiple commands
      for (let i = 0; i < 10; i++) {
        performanceTracker.recordCommand(`G0 X${i}`);
      }
      
      // Wait a bit for rate calculation
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const metrics = performanceTracker.getThroughputMetrics();
      expect(metrics.commandsPerSecond).toBeGreaterThan(0);
    });

    test('should track peak throughput', async () => {
      performanceTracker.startTracking();
      
      // Burst of commands
      for (let i = 0; i < 20; i++) {
        performanceTracker.recordCommand(`G0 X${i}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const metrics = performanceTracker.getThroughputMetrics();
      expect(metrics.peakCommandsPerSecond).toBeGreaterThan(metrics.commandsPerSecond);
    });
  });

  describe('bottleneck detection', () => {
    test('should detect command queue bottlenecks', () => {
      const bottleneckSpy = jest.fn();
      performanceTracker.on('bottleneckDetected', bottleneckSpy);
      performanceTracker.config.queueThreshold = 5;
      
      performanceTracker.startTracking();
      
      // Simulate queue buildup
      performanceTracker.updateQueueSize(10);
      
      expect(bottleneckSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue',
          currentSize: 10,
          threshold: 5
        })
      );
    });

    test('should detect memory bottlenecks', () => {
      const bottleneckSpy = jest.fn();
      performanceTracker.on('bottleneckDetected', bottleneckSpy);
      performanceTracker.config.memoryThreshold = 80;
      
      performanceTracker.startTracking();
      
      // Simulate high memory usage
      performanceTracker.updateMemoryUsage(85);
      
      expect(bottleneckSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'memory',
          currentUsage: 85,
          threshold: 80
        })
      );
    });
  });

  describe('performance alerts', () => {
    test('should emit performance degradation alert', async () => {
      const alertSpy = jest.fn();
      performanceTracker.on('performanceAlert', alertSpy);
      performanceTracker.config.performanceDegradationThreshold = 50;
      
      performanceTracker.startTracking();
      
      // Simulate performance degradation
      for (let i = 0; i < 10; i++) {
        performanceTracker.recordCommandTime(100); // Slow commands
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'degradation',
          severity: expect.any(String)
        })
      );
    });
  });

  describe('metrics export', () => {
    test('should export all performance data', async () => {
      performanceTracker.startTracking();
      
      // Generate some activity
      performanceTracker.recordCommand('G0 X10');
      performanceTracker.recordCommandTime(50);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const exportData = performanceTracker.exportData();
      expect(exportData).toHaveProperty('commandMetrics');
      expect(exportData).toHaveProperty('systemMetrics');
      expect(exportData).toHaveProperty('throughputMetrics');
      expect(exportData).toHaveProperty('history');
    });

    test('should export metrics in JSON format', () => {
      performanceTracker.startTracking();
      performanceTracker.recordCommand('G0 X10');
      
      const jsonData = performanceTracker.exportAsJSON();
      expect(() => JSON.parse(jsonData)).not.toThrow();
    });
  });

  describe('reset functionality', () => {
    test('should reset all metrics', async () => {
      performanceTracker.startTracking();
      
      // Generate some data
      performanceTracker.recordCommand('G0 X10');
      performanceTracker.recordCommandTime(50);
      
      performanceTracker.resetMetrics();
      
      const metrics = performanceTracker.getCommandMetrics();
      expect(metrics.totalCommands).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      performanceTracker.startTracking();
      
      performanceTracker.cleanup();
      
      expect(performanceTracker.isTracking).toBe(false);
      expect(performanceTracker.listenerCount()).toBe(0);
    });
  });
});