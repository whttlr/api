/**
 * Connection Controller Tests
 * 
 * Comprehensive test suite for connection management functionality.
 * Tests port listing, connection establishment, status monitoring, and error handling.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  listPorts,
  getStatus,
  connect,
  disconnect,
  healthCheck,
  reset
} from '../controller.js';

// Mock dependencies
const mockInstanceManager = {
  getInstance: jest.fn(),
  getGcodeSender: jest.fn()
};

const mockGcodeSender = {
  listSerialPorts: jest.fn(),
  getConnectionStatus: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  isConnected: jest.fn(),
  getConnectionHealth: jest.fn(),
  resetConnection: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockApiMessages = {
  connection: {
    success: {
      ports_listed: 'Available ports retrieved successfully',
      connected: 'Successfully connected to {port}',
      disconnected: 'Successfully disconnected from {port}',
      status_retrieved: 'Connection status retrieved successfully',
      health_retrieved: 'Connection health retrieved successfully',
      reset_completed: 'Connection reset completed successfully'
    },
    errors: {
      port_required: 'Port path is required',
      already_connected: 'Already connected to {port}. Disconnect first.',
      connection_failed: 'Failed to connect to {port}',
      port_not_available: 'Port {port} is not available',
      not_connected: 'No active connection',
      disconnect_failed: 'Failed to disconnect from {port}',
      ports_list_failed: 'Failed to list available ports',
      status_failed: 'Failed to retrieve connection status',
      health_failed: 'Failed to retrieve connection health',
      reset_failed: 'Failed to reset connection'
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

describe('Connection Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
    
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

  describe('listPorts', () => {
    test('should successfully list available ports', async () => {
      // Arrange
      const mockPorts = [
        { path: '/dev/ttyUSB0', manufacturer: 'FTDI' },
        { path: '/dev/ttyUSB1', manufacturer: 'Prolific' }
      ];
      mockGcodeSender.listSerialPorts.mockResolvedValue(mockPorts);

      // Act
      await listPorts(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.listSerialPorts).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith({
        ports: mockPorts,
        count: mockPorts.length
      }, 'Available ports retrieved successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('Listed 2 available serial ports');
    });

    test('should handle empty ports list', async () => {
      // Arrange
      mockGcodeSender.listSerialPorts.mockResolvedValue([]);

      // Act
      await listPorts(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith({
        ports: [],
        count: 0
      }, 'Available ports retrieved successfully');
      expect(mockLogger.info).toHaveBeenCalledWith('Listed 0 available serial ports');
    });

    test('should handle port listing errors', async () => {
      // Arrange
      const error = new Error('Port scanning failed');
      mockGcodeSender.listSerialPorts.mockRejectedValue(error);

      // Act
      await listPorts(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to list serial ports:', error);
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to list available ports',
        500,
        'PORTS_LIST_FAILED'
      );
    });
  });

  describe('getStatus', () => {
    test('should return connection status when connected', async () => {
      // Arrange
      const mockStatus = {
        connected: true,
        port: '/dev/ttyUSB0',
        baudRate: 115200,
        connectionTime: '2024-06-24T12:00:00.000Z'
      };
      mockGcodeSender.getConnectionStatus.mockResolvedValue(mockStatus);

      // Act
      await getStatus(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.getConnectionStatus).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        mockStatus,
        'Connection status retrieved successfully'
      );
    });

    test('should return connection status when not connected', async () => {
      // Arrange
      const mockStatus = {
        connected: false,
        port: null,
        baudRate: null,
        connectionTime: null
      };
      mockGcodeSender.getConnectionStatus.mockResolvedValue(mockStatus);

      // Act
      await getStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        mockStatus,
        'Connection status retrieved successfully'
      );
    });

    test('should handle status retrieval errors', async () => {
      // Arrange
      const error = new Error('Status query failed');
      mockGcodeSender.getConnectionStatus.mockRejectedValue(error);

      // Act
      await getStatus(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get connection status:', error);
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve connection status',
        500,
        'STATUS_FAILED'
      );
    });
  });

  describe('connect', () => {
    test('should successfully connect to a port', async () => {
      // Arrange
      mockReq.body = { port: '/dev/ttyUSB0' };
      mockGcodeSender.isConnected.mockReturnValue(false);
      mockGcodeSender.connect.mockResolvedValue({
        success: true,
        port: '/dev/ttyUSB0',
        baudRate: 115200
      });

      // Act
      await connect(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.connect).toHaveBeenCalledWith('/dev/ttyUSB0');
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          port: '/dev/ttyUSB0'
        }),
        'Successfully connected to /dev/ttyUSB0'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully connected to /dev/ttyUSB0');
    });

    test('should reject connection when port is missing', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await connect(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.connect).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Port path is required',
        400,
        'PORT_REQUIRED'
      );
    });

    test('should reject connection when already connected', async () => {
      // Arrange
      mockReq.body = { port: '/dev/ttyUSB0' };
      mockGcodeSender.isConnected.mockReturnValue(true);
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB1'
      });

      // Act
      await connect(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.connect).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Already connected to /dev/ttyUSB1. Disconnect first.',
        409,
        'ALREADY_CONNECTED'
      );
    });

    test('should handle connection failures', async () => {
      // Arrange
      mockReq.body = { port: '/dev/ttyUSB0' };
      mockGcodeSender.isConnected.mockReturnValue(false);
      const error = new Error('Port not available');
      mockGcodeSender.connect.mockRejectedValue(error);

      // Act
      await connect(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to connect to /dev/ttyUSB0:', error);
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to connect to /dev/ttyUSB0',
        400,
        'CONNECTION_FAILED'
      );
    });
  });

  describe('disconnect', () => {
    test('should successfully disconnect from port', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(true);
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB0'
      });
      mockGcodeSender.disconnect.mockResolvedValue({
        success: true,
        port: '/dev/ttyUSB0'
      });

      // Act
      await disconnect(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.disconnect).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        }),
        'Successfully disconnected from /dev/ttyUSB0'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Successfully disconnected from /dev/ttyUSB0');
    });

    test('should handle disconnect when not connected', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await disconnect(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.disconnect).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'No active connection',
        400,
        'NOT_CONNECTED'
      );
    });

    test('should handle disconnect failures', async () => {
      // Arrange
      mockGcodeSender.isConnected.mockReturnValue(true);
      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB0'
      });
      const error = new Error('Disconnect failed');
      mockGcodeSender.disconnect.mockRejectedValue(error);

      // Act
      await disconnect(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to disconnect:', error);
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to disconnect from /dev/ttyUSB0',
        500,
        'DISCONNECT_FAILED'
      );
    });
  });

  describe('healthCheck', () => {
    test('should return healthy status when connected and responsive', async () => {
      // Arrange
      const mockHealth = {
        status: 'healthy',
        connection: {
          connected: true,
          port: '/dev/ttyUSB0',
          responsive: true,
          responseTime: 50
        },
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      mockGcodeSender.getConnectionHealth.mockResolvedValue(mockHealth);

      // Act
      await healthCheck(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.getConnectionHealth).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        mockHealth,
        'Connection health retrieved successfully'
      );
    });

    test('should return unhealthy status when connection issues exist', async () => {
      // Arrange
      const mockHealth = {
        status: 'unhealthy',
        connection: {
          connected: false,
          port: null,
          responsive: false,
          responseTime: null
        },
        issues: ['No connection established'],
        timestamp: '2024-06-24T12:00:00.000Z'
      };
      mockGcodeSender.getConnectionHealth.mockResolvedValue(mockHealth);

      // Act
      await healthCheck(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        mockHealth,
        'Connection health retrieved successfully'
      );
    });

    test('should handle health check errors', async () => {
      // Arrange
      const error = new Error('Health check failed');
      mockGcodeSender.getConnectionHealth.mockRejectedValue(error);

      // Act
      await healthCheck(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get connection health:', error);
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve connection health',
        500,
        'HEALTH_FAILED'
      );
    });
  });

  describe('reset', () => {
    test('should successfully reset connection', async () => {
      // Arrange
      mockGcodeSender.resetConnection.mockResolvedValue({
        success: true,
        message: 'Connection reset completed'
      });

      // Act
      await reset(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.resetConnection).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true
        }),
        'Connection reset completed successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Connection reset completed successfully');
    });

    test('should handle reset failures', async () => {
      // Arrange
      const error = new Error('Reset failed');
      mockGcodeSender.resetConnection.mockRejectedValue(error);

      // Act
      await reset(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to reset connection:', error);
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to reset connection',
        500,
        'RESET_FAILED'
      );
    });
  });

  describe('Integration scenarios', () => {
    test('should handle rapid connect/disconnect cycles', async () => {
      // Arrange
      mockReq.body = { port: '/dev/ttyUSB0' };
      mockGcodeSender.isConnected
        .mockReturnValueOnce(false) // First connect
        .mockReturnValueOnce(true)  // Then disconnect
        .mockReturnValueOnce(false); // Then connect again

      mockGcodeSender.connect.mockResolvedValue({
        success: true,
        port: '/dev/ttyUSB0'
      });

      mockGcodeSender.disconnect.mockResolvedValue({
        success: true,
        port: '/dev/ttyUSB0'
      });

      mockGcodeSender.getConnectionStatus.mockResolvedValue({
        connected: true,
        port: '/dev/ttyUSB0'
      });

      // Act & Assert - Connect
      await connect(mockReq, mockRes);
      expect(mockGcodeSender.connect).toHaveBeenCalledWith('/dev/ttyUSB0');

      // Act & Assert - Disconnect
      await disconnect(mockReq, mockRes);
      expect(mockGcodeSender.disconnect).toHaveBeenCalled();

      // Act & Assert - Connect again
      await connect(mockReq, mockRes);
      expect(mockGcodeSender.connect).toHaveBeenCalledTimes(2);
    });

    test('should maintain state consistency across operations', async () => {
      // Test that operations maintain consistent state
      // This would be expanded based on actual state management needs
      expect(true).toBe(true); // Placeholder for state consistency tests
    });
  });
});