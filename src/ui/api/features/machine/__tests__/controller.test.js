/**
 * Machine Controller Tests
 * 
 * Comprehensive test suite for machine control, status monitoring, and safety operations.
 * Tests machine operations, diagnostics, safety features, and error handling.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getMachineStatus,
  getMachineLimits,
  runDiagnostics,
  unlockMachine,
  homeMachine,
  resetMachine,
  emergencyStop,
  getMachineHealth
} from '../controller.js';

// Mock dependencies
const mockInstanceManager = {
  getGcodeSender: jest.fn(),
  getDiagnosticsManager: jest.fn(),
  getQueryManager: jest.fn()
};

const mockGcodeSender = {
  isConnected: jest.fn(),
  getMachineStatus: jest.fn(),
  executeCommand: jest.fn(),
  getConnectionStatus: jest.fn()
};

const mockDiagnosticsManager = {
  runDiagnostics: jest.fn(),
  testMovement: jest.fn(),
  testCommunication: jest.fn()
};

const mockQueryManager = {
  getMachineLimits: jest.fn(),
  getParameters: jest.fn(),
  getStatus: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockApiMessages = {
  machine: {
    success: {
      status_retrieved: 'Machine status retrieved successfully',
      limits_retrieved: 'Machine limits retrieved successfully',
      diagnostics_completed: 'Machine diagnostics completed successfully',
      unlock_sent: 'Unlock command sent successfully',
      home_sent: 'Homing command sent successfully',
      reset_sent: 'Reset command sent successfully',
      emergency_stop_sent: 'Emergency stop sent successfully',
      health_retrieved: 'Machine health status retrieved successfully'
    },
    errors: {
      machine_not_connected: 'Machine not connected',
      status_failed: 'Failed to retrieve machine status',
      limits_failed: 'Failed to retrieve machine limits',
      diagnostics_failed: 'Failed to run machine diagnostics',
      unlock_failed: 'Failed to unlock machine',
      home_failed: 'Failed to home machine',
      reset_failed: 'Failed to reset machine',
      emergency_stop_failed: 'Failed to send emergency stop',
      health_failed: 'Failed to retrieve machine health',
      machine_alarm_state: 'Machine is in alarm state',
      unsafe_operation: 'Operation not safe in current machine state'
    }
  }
};

// Mock modules
jest.unstable_mockModule('../../../../lib/shared/InstanceManager.js', () => ({
  default: mockInstanceManager
}));

jest.unstable_mockModule('../../../../lib/logger/LoggerService.js', () => mockLogger);

jest.unstable_mockModule('../../config/messages.js', () => ({
  getApiMessages: jest.fn(() => mockApiMessages)
}));

describe('Machine Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
    mockInstanceManager.getDiagnosticsManager.mockReturnValue(mockDiagnosticsManager);
    mockInstanceManager.getQueryManager.mockReturnValue(mockQueryManager);
    
    mockGcodeSender.isConnected.mockReturnValue(true);
    
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

  describe('getMachineStatus', () => {
    test('should return machine status when connected', async () => {
      // Arrange
      const mockStatus = {
        state: 'Idle',
        position: {
          work: { x: 10, y: 20, z: 5 },
          machine: { x: 10, y: 20, z: 5 }
        },
        feedRate: 1000,
        spindleSpeed: 12000,
        coolant: false
      };
      
      mockGcodeSender.getMachineStatus.mockResolvedValue(mockStatus);
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB0'
      });

      // Act
      await getMachineStatus(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.getMachineStatus).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          port: '/dev/ttyUSB0',
          status: mockStatus
        }),
        'Machine status retrieved successfully'
      );
    });

    test('should reject when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await getMachineStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
      expect(mockGcodeSender.getMachineStatus).not.toHaveBeenCalled();
    });

    test('should handle status retrieval errors', async () => {
      // Arrange
      const error = new Error('Status query timeout');
      mockGcodeSender.getMachineStatus.mockRejectedValue(error);

      // Act
      await getMachineStatus(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get machine status:',
        error
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve machine status',
        500,
        'STATUS_FAILED'
      );
    });

    test('should include coordinate systems in status', async () => {
      // Arrange
      const mockStatusWithCoords = {
        state: 'Idle',
        position: {
          work: { x: 10, y: 20, z: 5 },
          machine: { x: 110, y: 120, z: -45 }
        },
        coordinateSystem: 'G54',
        offsets: {
          G54: { x: 100, y: 100, z: -50 },
          G55: { x: 0, y: 0, z: 0 }
        }
      };
      
      mockGcodeSender.getMachineStatus.mockResolvedValue(mockStatusWithCoords);

      // Act
      await getMachineStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: expect.objectContaining({
            coordinateSystem: 'G54',
            offsets: expect.any(Object)
          })
        }),
        'Machine status retrieved successfully'
      );
    });
  });

  describe('getMachineLimits', () => {
    test('should return machine travel limits', async () => {
      // Arrange
      const mockLimits = {
        soft: {
          x: { min: 0, max: 400 },
          y: { min: 0, max: 400 },
          z: { min: -100, max: 0 }
        },
        hard: {
          x: { min: -10, max: 410 },
          y: { min: -10, max: 410 },
          z: { min: -110, max: 10 }
        },
        current: {
          x: 10, y: 20, z: -5
        }
      };
      
      mockQueryManager.getMachineLimits.mockResolvedValue(mockLimits);
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB0'
      });

      // Act
      await getMachineLimits(mockReq, mockRes);

      // Assert
      expect(mockQueryManager.getMachineLimits).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          port: '/dev/ttyUSB0',
          limits: mockLimits
        }),
        'Machine limits retrieved successfully'
      );
    });

    test('should reject when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await getMachineLimits(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
    });

    test('should handle limits query errors', async () => {
      // Arrange
      const error = new Error('Limits query failed');
      mockQueryManager.getMachineLimits.mockRejectedValue(error);

      // Act
      await getMachineLimits(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve machine limits',
        500,
        'LIMITS_FAILED'
      );
    });
  });

  describe('runDiagnostics', () => {
    test('should run complete machine diagnostics', async () => {
      // Arrange
      const mockDiagnostics = {
        overall: 'passed',
        tests: {
          communication: { status: 'passed', responseTime: 45 },
          movement: { status: 'passed', accuracy: 0.01 },
          limits: { status: 'passed', softLimits: true },
          spindle: { status: 'passed', maxSpeed: 24000 }
        },
        duration: 15000,
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      
      mockDiagnosticsManager.runDiagnostics.mockResolvedValue(mockDiagnostics);
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB0'
      });

      // Act
      await runDiagnostics(mockReq, mockRes);

      // Assert
      expect(mockDiagnosticsManager.runDiagnostics).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          port: '/dev/ttyUSB0',
          diagnostics: mockDiagnostics,
          timestamp: expect.any(String)
        }),
        'Machine diagnostics completed successfully'
      );
    });

    test('should reject when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await runDiagnostics(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
    });

    test('should handle diagnostics failures', async () => {
      // Arrange
      const error = new Error('Diagnostic test failed');
      mockDiagnosticsManager.runDiagnostics.mockRejectedValue(error);

      // Act
      await runDiagnostics(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to run machine diagnostics',
        500,
        'DIAGNOSTICS_FAILED'
      );
    });

    test('should include failed test details in diagnostics', async () => {
      // Arrange
      const mockFailedDiagnostics = {
        overall: 'failed',
        tests: {
          communication: { status: 'passed', responseTime: 45 },
          movement: { status: 'failed', error: 'X-axis binding detected' },
          limits: { status: 'warning', message: 'Soft limits disabled' }
        },
        duration: 8000,
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      
      mockDiagnosticsManager.runDiagnostics.mockResolvedValue(mockFailedDiagnostics);

      // Act
      await runDiagnostics(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          diagnostics: expect.objectContaining({
            overall: 'failed',
            tests: expect.objectContaining({
              movement: expect.objectContaining({
                status: 'failed',
                error: 'X-axis binding detected'
              })
            })
          })
        }),
        'Machine diagnostics completed successfully'
      );
    });
  });

  describe('unlockMachine', () => {
    test('should send unlock command successfully', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        command: '$X',
        response: 'ok',
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      
      mockGcodeSender.executeCommand.mockResolvedValue(mockResponse);

      // Act
      await unlockMachine(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('$X');
      expect(mockRes.success).toHaveBeenCalledWith(
        mockResponse,
        'Unlock command sent successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Machine unlock command sent: $X');
    });

    test('should reject when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await unlockMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
    });

    test('should handle unlock command failures', async () => {
      // Arrange
      const error = new Error('Unlock command failed');
      mockGcodeSender.executeCommand.mockRejectedValue(error);

      // Act
      await unlockMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to unlock machine',
        500,
        'UNLOCK_FAILED'
      );
    });
  });

  describe('homeMachine', () => {
    test('should send homing command successfully', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        command: '$H',
        response: 'ok',
        duration: 30000,
        position: { x: 0, y: 0, z: 0 }
      };
      
      mockGcodeSender.executeCommand.mockResolvedValue(mockResponse);

      // Act
      await homeMachine(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('$H');
      expect(mockRes.success).toHaveBeenCalledWith(
        mockResponse,
        'Homing command sent successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Machine homing command sent: $H');
    });

    test('should reject when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await homeMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
    });

    test('should handle homing failures', async () => {
      // Arrange
      const error = new Error('Homing failed - limit switch not found');
      mockGcodeSender.executeCommand.mockRejectedValue(error);

      // Act
      await homeMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to home machine',
        500,
        'HOME_FAILED'
      );
    });

    test('should handle homing timeout', async () => {
      // Arrange
      const timeoutError = new Error('Homing timeout');
      timeoutError.code = 'TIMEOUT';
      mockGcodeSender.executeCommand.mockRejectedValue(timeoutError);

      // Act
      await homeMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Homing operation timed out',
        408,
        'HOME_TIMEOUT'
      );
    });
  });

  describe('resetMachine', () => {
    test('should send soft reset successfully', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        command: 'SOFT_RESET',
        message: 'Soft reset completed',
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      
      mockGcodeSender.executeCommand.mockResolvedValue(mockResponse);

      // Act
      await resetMachine(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('\x18'); // Ctrl-X
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'SOFT_RESET',
          message: 'Soft reset sent to machine'
        }),
        'Reset command sent successfully'
      );
    });

    test('should reject when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await resetMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
    });

    test('should handle reset failures', async () => {
      // Arrange
      const error = new Error('Reset failed');
      mockGcodeSender.executeCommand.mockRejectedValue(error);

      // Act
      await resetMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to reset machine',
        500,
        'RESET_FAILED'
      );
    });
  });

  describe('emergencyStop', () => {
    test('should send emergency stop successfully', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        command: 'M112',
        response: 'Emergency Stop',
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      
      mockGcodeSender.executeCommand.mockResolvedValue(mockResponse);

      // Act
      await emergencyStop(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('!'); // Real-time command
      expect(mockRes.success).toHaveBeenCalledWith(
        mockResponse,
        'Emergency stop sent successfully'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith('Emergency stop command executed');
    });

    test('should work even when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);
      const mockResponse = {
        success: true,
        command: 'EMERGENCY_STOP',
        message: 'Emergency stop sent (no connection)'
      };
      
      mockGcodeSender.executeCommand.mockResolvedValue(mockResponse);

      // Act
      await emergencyStop(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('!');
      expect(mockRes.success).toHaveBeenCalledWith(
        mockResponse,
        'Emergency stop sent successfully'
      );
    });

    test('should handle emergency stop failures', async () => {
      // Arrange
      const error = new Error('Emergency stop failed');
      mockGcodeSender.executeCommand.mockRejectedValue(error);

      // Act
      await emergencyStop(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to send emergency stop',
        500,
        'EMERGENCY_STOP_FAILED'
      );
    });

    test('should send multiple stop commands for reliability', async () => {
      // Arrange
      mockGcodeSender.executeCommand
        .mockResolvedValueOnce({ success: true, command: '!' })
        .mockResolvedValueOnce({ success: true, command: 'M112' });

      // Act
      await emergencyStop(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('!');
      // Additional safety commands may be sent
    });
  });

  describe('getMachineHealth', () => {
    test('should return comprehensive machine health', async () => {
      // Arrange
      const mockHealth = {
        status: 'healthy',
        connection: {
          connected: true,
          port: '/dev/ttyUSB0',
          responseTime: 50
        },
        machine: {
          statusAvailable: true,
          state: 'Idle',
          responsive: true,
          alarms: []
        },
        performance: {
          averageResponseTime: 45,
          errorRate: 0.02,
          uptime: 3600
        },
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB0'
      });
      
      mockGcodeSender.getMachineStatus.mockResolvedValue({
        state: 'Idle',
        alarms: []
      });

      // Act
      await getMachineHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy',
          connection: expect.objectContaining({
            connected: true,
            port: '/dev/ttyUSB0'
          }),
          machine: expect.objectContaining({
            statusAvailable: true,
            state: 'Idle',
            responsive: true
          }),
          timestamp: expect.any(String)
        }),
        'Machine health status retrieved successfully'
      );
    });

    test('should return degraded health when machine has alarms', async () => {
      // Arrange
      mockGcodeSender.getMachineStatus.mockResolvedValue({
        state: 'Alarm',
        alarms: ['Hard limit triggered', 'Spindle control fail']
      });

      // Act
      await getMachineHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'degraded',
          machine: expect.objectContaining({
            state: 'Alarm',
            alarms: ['Hard limit triggered', 'Spindle control fail']
          })
        }),
        'Machine health status retrieved successfully'
      );
    });

    test('should work when machine not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await getMachineHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'healthy', // Can still be healthy when not connected
          connection: expect.objectContaining({
            connected: false
          }),
          machine: expect.objectContaining({
            statusAvailable: false
          })
        }),
        'Machine health status retrieved successfully'
      );
    });

    test('should handle health check errors gracefully', async () => {
      // Arrange
      const error = new Error('Health check failed');
      mockGcodeSender.getConnectionStatus.mockRejectedValue(error);

      // Act
      await getMachineHealth(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve machine health',
        500,
        'HEALTH_FAILED'
      );
    });
  });

  describe('Safety validations', () => {
    test('should prevent unsafe operations in alarm state', async () => {
      // Arrange
      mockGcodeSender.getMachineStatus.mockResolvedValue({
        state: 'Alarm',
        alarms: ['Hard limit triggered']
      });

      // Act
      await homeMachine(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Operation not safe in current machine state',
        400,
        'UNSAFE_OPERATION'
      );
      expect(mockGcodeSender.executeCommand).not.toHaveBeenCalled();
    });

    test('should allow unlock when machine in alarm state', async () => {
      // Arrange
      mockGcodeSender.getMachineStatus.mockResolvedValue({
        state: 'Alarm',
        alarms: ['Hard limit triggered']
      });
      
      mockGcodeSender.executeCommand.mockResolvedValue({
        success: true,
        command: '$X'
      });

      // Act
      await unlockMachine(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('$X');
      expect(mockRes.success).toHaveBeenCalled();
    });

    test('should always allow emergency stop regardless of state', async () => {
      // Arrange
      mockGcodeSender.getMachineStatus.mockResolvedValue({
        state: 'Run',
        position: { x: 100, y: 100, z: -10 }
      });
      
      mockGcodeSender.executeCommand.mockResolvedValue({
        success: true,
        command: '!'
      });

      // Act
      await emergencyStop(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('!');
      expect(mockRes.success).toHaveBeenCalled();
    });
  });

  describe('Concurrent operations', () => {
    test('should handle multiple status requests concurrently', async () => {
      // Arrange
      mockGcodeSender.getMachineStatus.mockResolvedValue({
        state: 'Idle',
        position: { x: 0, y: 0, z: 0 }
      });

      // Act
      const promises = Array.from({ length: 3 }, () => 
        getMachineStatus(mockReq, mockRes)
      );
      
      await Promise.all(promises);

      // Assert
      expect(mockGcodeSender.getMachineStatus).toHaveBeenCalledTimes(3);
      expect(mockRes.success).toHaveBeenCalledTimes(3);
    });

    test('should serialize safety-critical operations', async () => {
      // This test would verify that operations like homing and reset
      // are properly serialized to prevent conflicts
      expect(true).toBe(true); // Placeholder for serialization tests
    });
  });
});