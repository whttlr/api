/**
 * ConnectionManager Tests
 * 
 * Tests for the Connection module following TDD principles.
 */

// Mock the SerialPort before importing
jest.mock('serialport');

import { ConnectionManager, CONNECTION_STATES } from '../index.js';
import { MockSerialPort } from '../__mocks__/mock-serial-port.js';
import { SerialPort } from 'serialport';

// Set up the mock
SerialPort.mockImplementation = MockSerialPort;
SerialPort.list = MockSerialPort.list;

describe('ConnectionManager', () => {
  let connectionManager;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      defaultPort: '/dev/ttyUSB0',
      serialPort: {
        baudRate: 115200,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        autoOpen: false
      },
      timeouts: {
        connection: 5000
      },
      connectionInitDelay: 100,
      verboseSerial: false
    };

    connectionManager = new ConnectionManager(mockConfig);
  });

  describe('constructor', () => {
    test('should initialize with correct default state', () => {
      expect(connectionManager.isConnected).toBe(false);
      expect(connectionManager.currentPort).toBeNull();
      expect(connectionManager.port).toBeNull();
    });
  });

  describe('getAvailablePorts', () => {
    test('should return list of available ports', async () => {
      const ports = await connectionManager.getAvailablePorts();
      
      expect(Array.isArray(ports)).toBe(true);
      expect(ports.length).toBeGreaterThan(0);
      expect(ports[0]).toHaveProperty('path');
      expect(ports[0]).toHaveProperty('manufacturer');
    });

    test('should handle errors gracefully', async () => {
      // Mock SerialPort.list to throw error
      MockSerialPort.list = jest.fn().mockRejectedValue(new Error('Port list error'));
      
      const ports = await connectionManager.getAvailablePorts();
      expect(ports).toEqual([]);
    });
  });

  describe('connect', () => {
    test('should connect to specified port successfully', async () => {
      const result = await connectionManager.connect('/dev/ttyUSB0');
      
      expect(result.success).toBe(true);
      expect(result.port).toBe('/dev/ttyUSB0');
      expect(connectionManager.isConnected).toBe(true);
      expect(connectionManager.currentPort).toBe('/dev/ttyUSB0');
    });

    test('should use default port when none specified', async () => {
      const result = await connectionManager.connect();
      
      expect(result.success).toBe(true);
      expect(result.port).toBe(mockConfig.defaultPort);
    });

    test('should handle connection timeout', async () => {
      // Set a very short timeout
      mockConfig.timeouts.connection = 1;
      connectionManager = new ConnectionManager(mockConfig);
      
      await expect(connectionManager.connect('/dev/ttyUSB0'))
        .rejects.toThrow('Connection timeout');
    });
  });

  describe('disconnect', () => {
    test('should disconnect successfully when connected', async () => {
      // First connect
      await connectionManager.connect('/dev/ttyUSB0');
      
      // Then disconnect
      const result = await connectionManager.disconnect();
      
      expect(result.success).toBe(true);
      expect(connectionManager.isConnected).toBe(false);
      expect(connectionManager.currentPort).toBeNull();
    });

    test('should handle disconnect when already disconnected', async () => {
      const result = await connectionManager.disconnect();
      
      expect(result.success).toBe(true);
    });
  });

  describe('getConnectionStatus', () => {
    test('should return correct status when disconnected', () => {
      const status = connectionManager.getConnectionStatus();
      
      expect(status.connected).toBe(false);
      expect(status.port).toBeNull();
      expect(status.hasPort).toBe(false);
    });

    test('should return correct status when connected', async () => {
      await connectionManager.connect('/dev/ttyUSB0');
      const status = connectionManager.getConnectionStatus();
      
      expect(status.connected).toBe(true);
      expect(status.port).toBe('/dev/ttyUSB0');
      expect(status.hasPort).toBe(true);
    });
  });
});

describe('CONNECTION_STATES', () => {
  test('should export correct connection states', () => {
    expect(CONNECTION_STATES.DISCONNECTED).toBe('disconnected');
    expect(CONNECTION_STATES.CONNECTING).toBe('connecting');
    expect(CONNECTION_STATES.CONNECTED).toBe('connected');
    expect(CONNECTION_STATES.ERROR).toBe('error');
  });
});