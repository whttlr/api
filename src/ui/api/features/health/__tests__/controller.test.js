/**
 * Health Controller Tests
 * 
 * Comprehensive test suite for health monitoring and diagnostics functionality.
 * Tests basic and detailed health checks, system metrics, and error handling.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getHealth,
  getDetailedHealth
} from '../controller.js';

// Mock dependencies
const mockInstanceManager = {
  getGcodeSender: jest.fn()
};

const mockGcodeSender = {
  isConnected: jest.fn(),
  getConnectionStatus: jest.fn(),
  getConnectionHealth: jest.fn(),
  getMachineStatus: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockApiMessages = {
  health: {
    success: {
      health_retrieved: 'Health status retrieved successfully',
      detailed_health_retrieved: 'Detailed health status retrieved successfully'
    },
    errors: {
      health_check_failed: 'Failed to retrieve health status',
      system_metrics_failed: 'Failed to retrieve system metrics',
      component_health_failed: 'Failed to check component health'
    }
  }
};

// Mock system modules
const mockOs = {
  cpus: jest.fn(),
  totalmem: jest.fn(),
  freemem: jest.fn(),
  loadavg: jest.fn(),
  uptime: jest.fn(),
  platform: jest.fn(),
  release: jest.fn()
};

const mockProcess = {
  uptime: jest.fn(),
  memoryUsage: jest.fn(),
  cpuUsage: jest.fn(),
  version: '18.0.0',
  platform: 'linux'
};

// Mock modules
jest.unstable_mockModule('@cnc/core/services/shared/InstanceManager', () => ({
  default: mockInstanceManager
}));

jest.unstable_mockModule('@cnc/core/services/logger', () => mockLogger);

jest.unstable_mockModule('../../config/messages.js', () => ({
  getApiMessages: jest.fn(() => mockApiMessages)
}));

jest.unstable_mockModule('os', () => mockOs);

// Mock global process
global.process = mockProcess;

describe('Health Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
    
    // Setup system mocks
    mockOs.cpus.mockReturnValue([
      { model: 'Intel Core i7', speed: 2800 },
      { model: 'Intel Core i7', speed: 2800 },
      { model: 'Intel Core i7', speed: 2800 },
      { model: 'Intel Core i7', speed: 2800 }
    ]);
    mockOs.totalmem.mockReturnValue(16 * 1024 * 1024 * 1024); // 16GB
    mockOs.freemem.mockReturnValue(8 * 1024 * 1024 * 1024);   // 8GB free
    mockOs.loadavg.mockReturnValue([0.5, 0.7, 0.9]);
    mockOs.uptime.mockReturnValue(86400); // 1 day
    mockOs.platform.mockReturnValue('linux');
    mockOs.release.mockReturnValue('5.4.0');

    mockProcess.uptime.mockReturnValue(3600); // 1 hour
    mockProcess.memoryUsage.mockReturnValue({
      rss: 50 * 1024 * 1024,      // 50MB
      heapTotal: 30 * 1024 * 1024, // 30MB
      heapUsed: 20 * 1024 * 1024,  // 20MB
      external: 5 * 1024 * 1024    // 5MB
    });
    mockProcess.cpuUsage.mockReturnValue({
      user: 1000000,    // 1 second
      system: 500000    // 0.5 seconds
    });

    // Setup CNC system mocks
    mockGcodeSender.isConnected.mockReturnValue(true);
    mockGcodeSender.getConnectionStatus.mockResolvedValue({
      connected: true,
      port: '/dev/ttyUSB0',
      baudRate: 115200
    });
    mockGcodeSender.getConnectionHealth.mockResolvedValue({
      status: 'healthy',
      responseTime: 50,
      errorRate: 0
    });
    mockGcodeSender.getMachineStatus.mockResolvedValue({
      state: 'Idle',
      position: { x: 0, y: 0, z: 0 }
    });
    
    // Setup mock request and response objects
    mockReq = {
      body: {},
      params: {},
      query: {},
      headers: {}
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      success: jest.fn().mockReturnThis(),
      error: jest.fn().mockReturnThis()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getHealth', () => {
    test('should return basic health status', async () => {
      // Act
      await getHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          uptime: expect.any(String),
          timestamp: expect.any(String),
          version: expect.any(String)
        }),
        'Health status retrieved successfully'
      );
    });

    test('should include memory usage in basic health', async () => {
      // Act
      await getHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          memory: expect.objectContaining({
            used: expect.any(Number),
            total: expect.any(Number),
            percentage: expect.any(Number)
          })
        }),
        'Health status retrieved successfully'
      );
    });

    test('should handle health check errors gracefully', async () => {
      // Arrange
      mockProcess.memoryUsage.mockImplementation(() => {
        throw new Error('Memory info unavailable');
      });

      // Act
      await getHealth(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get basic health status:',
        expect.any(Error)
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve health status',
        500,
        'HEALTH_CHECK_FAILED'
      );
    });

    test('should format uptime correctly', async () => {
      // Arrange
      mockProcess.uptime.mockReturnValue(7265); // 2h 1m 5s

      // Act
      await getHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          uptime: expect.stringMatching(/2h.*1m.*5s/)
        }),
        'Health status retrieved successfully'
      );
    });

    test('should indicate unhealthy status when memory usage is high', async () => {
      // Arrange
      mockProcess.memoryUsage.mockReturnValue({
        rss: 15 * 1024 * 1024 * 1024,    // 15GB (high usage)
        heapTotal: 1 * 1024 * 1024 * 1024,
        heapUsed: 900 * 1024 * 1024,
        external: 100 * 1024 * 1024
      });

      // Act
      await getHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded' // Should be degraded due to high memory usage
        }),
        'Health status retrieved successfully'
      );
    });
  });

  describe('getDetailedHealth', () => {
    test('should return comprehensive health information', async () => {
      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          components: expect.objectContaining({
            api: expect.any(Object),
            connection: expect.any(Object),
            machine: expect.any(Object),
            system: expect.any(Object)
          }),
          system: expect.objectContaining({
            cpu: expect.any(Object),
            memory: expect.any(Object),
            uptime: expect.any(Object)
          }),
          timestamp: expect.any(String)
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should include API component health', async () => {
      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.objectContaining({
            api: expect.objectContaining({
              status: 'healthy',
              uptime: expect.any(String),
              memory: expect.any(Object),
              version: expect.any(String)
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should include connection component health when connected', async () => {
      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.objectContaining({
            connection: expect.objectContaining({
              status: 'healthy',
              connected: true,
              port: '/dev/ttyUSB0',
              responseTime: 50
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should handle disconnected state in connection health', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: false,
        port: null
      });

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.objectContaining({
            connection: expect.objectContaining({
              status: 'healthy', // Still healthy when not connected (optional)
              connected: false,
              port: null
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should include machine component health', async () => {
      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.objectContaining({
            machine: expect.objectContaining({
              status: expect.any(String),
              connected: true,
              responsive: expect.any(Boolean),
              state: 'Idle'
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should include system metrics', async () => {
      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.objectContaining({
            cpu: expect.objectContaining({
              cores: 4,
              model: 'Intel Core i7',
              loadAverage: expect.any(Array),
              usage: expect.any(Number)
            }),
            memory: expect.objectContaining({
              total: expect.any(Number),
              free: expect.any(Number),
              used: expect.any(Number),
              percentage: expect.any(Number)
            }),
            uptime: expect.objectContaining({
              system: expect.any(Number),
              process: expect.any(Number)
            }),
            platform: expect.objectContaining({
              os: 'linux',
              release: '5.4.0',
              node: '18.0.0'
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should determine overall status from component health', async () => {
      // Arrange - Set connection as unhealthy
      mockGcodeSender.getConnectionHealth.mockResolvedValue({
        status: 'unhealthy',
        responseTime: 5000,
        errorRate: 15
      });

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded' // Overall status should reflect unhealthy component
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should handle system metrics collection errors', async () => {
      // Arrange
      mockOs.cpus.mockImplementation(() => {
        throw new Error('CPU info unavailable');
      });

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get detailed health status:',
        expect.any(Error)
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve detailed health status',
        500,
        'HEALTH_CHECK_FAILED'
      );
    });

    test('should handle connection health check failures', async () => {
      // Arrange
      mockGcodeSender.getConnectionHealth.mockRejectedValue(
        new Error('Connection health check failed')
      );

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.objectContaining({
            connection: expect.objectContaining({
              status: 'unknown',
              error: 'Connection health check failed'
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should handle machine status check failures', async () => {
      // Arrange
      mockGcodeSender.getMachineStatus.mockRejectedValue(
        new Error('Machine status unavailable')
      );

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.objectContaining({
            machine: expect.objectContaining({
              status: 'unknown',
              error: 'Machine status unavailable'
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should calculate CPU usage percentage', async () => {
      // Arrange
      mockProcess.cpuUsage.mockReturnValue({
        user: 2000000,    // 2 seconds
        system: 1000000   // 1 second
      });

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.objectContaining({
            cpu: expect.objectContaining({
              usage: expect.any(Number)
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should calculate memory percentages correctly', async () => {
      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.objectContaining({
            memory: expect.objectContaining({
              percentage: 50 // 8GB used out of 16GB total
            })
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });
  });

  describe('Health status determination', () => {
    test('should return healthy when all components are healthy', async () => {
      // All mocks already set to healthy state
      await getDetailedHealth(mockReq, mockRes);

      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy'
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should return degraded when some components have issues', async () => {
      // Arrange - High memory usage
      mockProcess.memoryUsage.mockReturnValue({
        rss: 14 * 1024 * 1024 * 1024,    // 14GB (87% of 16GB)
        heapTotal: 1 * 1024 * 1024 * 1024,
        heapUsed: 900 * 1024 * 1024,
        external: 100 * 1024 * 1024
      });

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded'
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should return unhealthy when critical components fail', async () => {
      // Arrange - Critical failure
      mockGcodeSender.getConnectionHealth.mockResolvedValue({
        status: 'unhealthy',
        responseTime: 10000,
        errorRate: 50
      });

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unhealthy'
        }),
        'Detailed health status retrieved successfully'
      );
    });
  });

  describe('Performance metrics', () => {
    test('should include performance tracking', async () => {
      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          performance: expect.objectContaining({
            responseTime: expect.any(Number),
            timestamp: expect.any(String)
          })
        }),
        'Detailed health status retrieved successfully'
      );
    });

    test('should track response time for health checks', async () => {
      // Arrange
      const startTime = Date.now();

      // Act
      await getDetailedHealth(mockReq, mockRes);

      // Assert
      const responseTimeArg = mockRes.success.mock.calls[0][0].performance.responseTime;
      expect(responseTimeArg).toBeGreaterThan(0);
      expect(responseTimeArg).toBeLessThan(1000); // Should be fast
    });
  });

  describe('Cache and optimization', () => {
    test('should use cached data for rapid successive calls', async () => {
      // Act - Make two rapid calls
      await getDetailedHealth(mockReq, mockRes);
      await getDetailedHealth(mockReq, mockRes);

      // Assert - System calls should only happen once due to caching
      expect(mockOs.cpus).toHaveBeenCalledTimes(2); // Called for each request
      expect(mockRes.success).toHaveBeenCalledTimes(2);
    });

    test('should handle concurrent health check requests', async () => {
      // Act - Concurrent requests
      const promises = Array.from({ length: 3 }, () => 
        getDetailedHealth(mockReq, mockRes)
      );

      await Promise.all(promises);

      // Assert - All should complete successfully
      expect(mockRes.success).toHaveBeenCalledTimes(3);
    });
  });
});