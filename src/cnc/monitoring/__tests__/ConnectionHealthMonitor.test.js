/**
 * ConnectionHealthMonitor Test Suite
 * 
 * Tests for connection health monitoring functionality including
 * connectivity checks, latency monitoring, and failure detection.
 */

import { ConnectionHealthMonitor } from '../ConnectionHealthMonitor.js';
import { MockConnectionManager } from '../__mocks__/MockConnectionManager.js';

describe('ConnectionHealthMonitor', () => {
  let healthMonitor;
  let mockConnectionManager;

  beforeEach(() => {
    mockConnectionManager = new MockConnectionManager();
    healthMonitor = new ConnectionHealthMonitor(mockConnectionManager, {
      healthCheckInterval: 100,
      pingTimeout: 500,
      maxFailedPings: 3,
      enableLatencyTracking: true,
      enableAutoReconnect: true
    });
  });

  afterEach(() => {
    healthMonitor.cleanup();
  });

  describe('constructor', () => {
    test('should create ConnectionHealthMonitor with valid connection manager', () => {
      expect(healthMonitor).toBeInstanceOf(ConnectionHealthMonitor);
      expect(healthMonitor.connectionManager).toBe(mockConnectionManager);
      expect(healthMonitor.isMonitoring).toBe(false);
    });

    test('should throw error without connection manager', () => {
      expect(() => new ConnectionHealthMonitor()).toThrow('ConnectionHealthMonitor requires a connection manager');
    });

    test('should apply default configuration', () => {
      const defaultMonitor = new ConnectionHealthMonitor(mockConnectionManager);
      expect(defaultMonitor.config.healthCheckInterval).toBe(5000);
      expect(defaultMonitor.config.maxFailedPings).toBe(3);
    });
  });

  describe('startMonitoring', () => {
    test('should start monitoring successfully', () => {
      healthMonitor.startMonitoring();
      
      expect(healthMonitor.isMonitoring).toBe(true);
      expect(healthMonitor.monitoringTimer).not.toBeNull();
    });

    test('should not start monitoring if already monitoring', () => {
      healthMonitor.startMonitoring();
      const firstTimer = healthMonitor.monitoringTimer;
      
      healthMonitor.startMonitoring();
      
      expect(healthMonitor.monitoringTimer).toBe(firstTimer);
    });

    test('should emit monitoring started event', () => {
      const startedSpy = jest.fn();
      healthMonitor.on('monitoringStarted', startedSpy);
      
      healthMonitor.startMonitoring();
      
      expect(startedSpy).toHaveBeenCalledWith({
        interval: healthMonitor.config.healthCheckInterval
      });
    });
  });

  describe('stopMonitoring', () => {
    test('should stop monitoring successfully', () => {
      healthMonitor.startMonitoring();
      
      healthMonitor.stopMonitoring();
      
      expect(healthMonitor.isMonitoring).toBe(false);
      expect(healthMonitor.monitoringTimer).toBeNull();
    });

    test('should emit monitoring stopped event', () => {
      const stoppedSpy = jest.fn();
      healthMonitor.on('monitoringStopped', stoppedSpy);
      
      healthMonitor.startMonitoring();
      healthMonitor.stopMonitoring();
      
      expect(stoppedSpy).toHaveBeenCalled();
    });
  });

  describe('health checks', () => {
    test('should perform successful health check', async () => {
      mockConnectionManager.setHealthy(true);
      
      const result = await healthMonitor.performHealthCheck();
      
      expect(result.healthy).toBe(true);
      expect(result.latency).toBeGreaterThan(0);
    });

    test('should detect unhealthy connection', async () => {
      mockConnectionManager.setHealthy(false);
      
      const result = await healthMonitor.performHealthCheck();
      
      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should track health check history', async () => {
      mockConnectionManager.setHealthy(true);
      
      await healthMonitor.performHealthCheck();
      await healthMonitor.performHealthCheck();
      
      const history = healthMonitor.getHealthHistory();
      expect(history.length).toBe(2);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('healthy');
    });
  });

  describe('latency tracking', () => {
    test('should track ping latency', async () => {
      mockConnectionManager.setLatency(50);
      healthMonitor.startMonitoring();
      
      // Wait for some health checks
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const metrics = healthMonitor.getLatencyMetrics();
      expect(metrics.averageLatency).toBeGreaterThan(0);
      expect(metrics.minLatency).toBeGreaterThan(0);
      expect(metrics.maxLatency).toBeGreaterThan(0);
    });

    test('should detect high latency', async () => {
      const highLatencySpy = jest.fn();
      healthMonitor.on('highLatency', highLatencySpy);
      healthMonitor.config.latencyThreshold = 100;
      
      mockConnectionManager.setLatency(150);
      
      await healthMonitor.performHealthCheck();
      
      expect(highLatencySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          latency: 150,
          threshold: 100
        })
      );
    });

    test('should track latency trends', async () => {
      healthMonitor.startMonitoring();
      
      // Simulate increasing latency
      let latency = 10;
      mockConnectionManager.setLatencyCallback(() => {
        latency += 10;
        return latency;
      });
      
      // Wait for multiple checks
      await new Promise(resolve => setTimeout(resolve, 350));
      
      const trends = healthMonitor.getLatencyTrends();
      expect(trends.direction).toBe('increasing');
    });
  });

  describe('connection failure detection', () => {
    test('should detect connection failures', async () => {
      const connectionLostSpy = jest.fn();
      healthMonitor.on('connectionLost', connectionLostSpy);
      
      healthMonitor.startMonitoring();
      mockConnectionManager.setHealthy(false);
      
      // Wait for failure detection
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(connectionLostSpy).toHaveBeenCalled();
    });

    test('should track consecutive failures', async () => {
      healthMonitor.startMonitoring();
      mockConnectionManager.setHealthy(false);
      
      // Wait for multiple failures
      await new Promise(resolve => setTimeout(resolve, 350));
      
      expect(healthMonitor.consecutiveFailures).toBeGreaterThan(0);
    });

    test('should emit critical failure after max failures', async () => {
      const criticalFailureSpy = jest.fn();
      healthMonitor.on('criticalFailure', criticalFailureSpy);
      healthMonitor.config.maxFailedPings = 2;
      
      healthMonitor.startMonitoring();
      mockConnectionManager.setHealthy(false);
      
      // Wait for critical failure
      await new Promise(resolve => setTimeout(resolve, 250));
      
      expect(criticalFailureSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          consecutiveFailures: expect.any(Number)
        })
      );
    });
  });

  describe('auto-reconnect', () => {
    test('should attempt auto-reconnect on failure', async () => {
      const reconnectAttemptSpy = jest.fn();
      healthMonitor.on('reconnectAttempt', reconnectAttemptSpy);
      healthMonitor.config.enableAutoReconnect = true;
      
      healthMonitor.startMonitoring();
      mockConnectionManager.setHealthy(false);
      
      // Wait for reconnect attempt
      await new Promise(resolve => setTimeout(resolve, 400));
      
      expect(reconnectAttemptSpy).toHaveBeenCalled();
    });

    test('should succeed auto-reconnect', async () => {
      const reconnectSuccessSpy = jest.fn();
      healthMonitor.on('reconnectSuccess', reconnectSuccessSpy);
      
      healthMonitor.startMonitoring();
      
      // Simulate connection loss and recovery
      mockConnectionManager.setHealthy(false);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      mockConnectionManager.setHealthy(true);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(reconnectSuccessSpy).toHaveBeenCalled();
    });

    test('should track reconnect attempts', async () => {
      healthMonitor.config.enableAutoReconnect = true;
      healthMonitor.startMonitoring();
      
      mockConnectionManager.setHealthy(false);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const metrics = healthMonitor.getReconnectMetrics();
      expect(metrics.totalAttempts).toBeGreaterThan(0);
    });
  });

  describe('connection quality assessment', () => {
    test('should assess connection quality as excellent', async () => {
      mockConnectionManager.setLatency(10);
      mockConnectionManager.setHealthy(true);
      
      healthMonitor.startMonitoring();
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const quality = healthMonitor.getConnectionQuality();
      expect(quality.rating).toBe('excellent');
      expect(quality.score).toBeGreaterThan(90);
    });

    test('should assess connection quality as poor', async () => {
      mockConnectionManager.setLatency(500);
      mockConnectionManager.setReliability(0.5); // 50% success rate
      
      healthMonitor.startMonitoring();
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const quality = healthMonitor.getConnectionQuality();
      expect(quality.rating).toBe('poor');
      expect(quality.score).toBeLessThan(50);
    });
  });

  describe('health metrics', () => {
    test('should calculate uptime percentage', async () => {
      healthMonitor.startMonitoring();
      mockConnectionManager.setHealthy(true);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const metrics = healthMonitor.getHealthMetrics();
      expect(metrics.uptimePercentage).toBeGreaterThan(0);
      expect(metrics.uptimePercentage).toBeLessThanOrEqual(100);
    });

    test('should track mean time between failures', async () => {
      healthMonitor.startMonitoring();
      
      // Simulate intermittent failures
      mockConnectionManager.setHealthy(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      mockConnectionManager.setHealthy(false);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      mockConnectionManager.setHealthy(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const metrics = healthMonitor.getHealthMetrics();
      expect(metrics.meanTimeBetweenFailures).toBeGreaterThan(0);
    });
  });

  describe('alerting', () => {
    test('should emit degraded performance alert', async () => {
      const alertSpy = jest.fn();
      healthMonitor.on('performanceAlert', alertSpy);
      
      mockConnectionManager.setLatency(1000); // Very high latency
      
      await healthMonitor.performHealthCheck();
      
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'degraded_performance',
          severity: expect.any(String)
        })
      );
    });

    test('should emit connection unstable alert', async () => {
      const alertSpy = jest.fn();
      healthMonitor.on('connectionAlert', alertSpy);
      
      healthMonitor.startMonitoring();
      
      // Simulate unstable connection
      for (let i = 0; i < 5; i++) {
        mockConnectionManager.setHealthy(i % 2 === 0);
        await new Promise(resolve => setTimeout(resolve, 110));
      }
      
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'unstable',
          pattern: expect.any(String)
        })
      );
    });
  });

  describe('data export', () => {
    test('should export health monitoring data', async () => {
      healthMonitor.startMonitoring();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const exportData = healthMonitor.exportData();
      expect(exportData).toHaveProperty('healthHistory');
      expect(exportData).toHaveProperty('latencyMetrics');
      expect(exportData).toHaveProperty('reconnectMetrics');
      expect(exportData).toHaveProperty('config');
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      healthMonitor.startMonitoring();
      
      healthMonitor.cleanup();
      
      expect(healthMonitor.isMonitoring).toBe(false);
      expect(healthMonitor.monitoringTimer).toBeNull();
      expect(healthMonitor.listenerCount()).toBe(0);
    });
  });
});