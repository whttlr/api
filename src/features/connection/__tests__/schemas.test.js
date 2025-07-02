/**
 * Connection Schemas Tests
 * 
 * Test suite for connection feature request/response validation schemas.
 * Ensures proper validation of connection parameters and data structures.
 */

import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { validateConnection } from '../schemas.js';

describe('Connection Schemas', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      error: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('validateConnection', () => {
    test('should pass validation with valid port', () => {
      // Arrange
      mockReq.body = {
        port: '/dev/ttyUSB0'
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    test('should pass validation with valid Windows port', () => {
      // Arrange
      mockReq.body = {
        port: 'COM3'
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    test('should pass validation with various Unix port formats', () => {
      const validPorts = [
        '/dev/ttyUSB0',
        '/dev/ttyACM0',
        '/dev/ttyS0',
        '/dev/cu.usbmodem1101',
        '/dev/tty.usbserial-ABC123'
      ];

      validPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.error).not.toHaveBeenCalled();
      });
    });

    test('should fail validation when port is missing', () => {
      // Arrange
      mockReq.body = {};

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Port path is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    test('should fail validation when port is empty string', () => {
      // Arrange
      mockReq.body = {
        port: ''
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Port path cannot be empty',
        400,
        'VALIDATION_ERROR'
      );
    });

    test('should fail validation when port is null', () => {
      // Arrange
      mockReq.body = {
        port: null
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Port path is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    test('should fail validation when port is not a string', () => {
      const invalidPorts = [123, true, [], {}];

      invalidPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.error).toHaveBeenCalledWith(
          'Port path must be a string',
          400,
          'VALIDATION_ERROR'
        );
      });
    });

    test('should fail validation with invalid port format', () => {
      const invalidPorts = [
        'invalid-port',
        '/dev/',
        'COM',
        '/dev/invalid',
        'ttyUSB0', // Missing /dev/
        '\\dev\\ttyUSB0', // Wrong slashes
        '/dev/ttyUSB', // Missing number
        'COM0' // COM ports start from 1
      ];

      invalidPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid port format'),
          400,
          'VALIDATION_ERROR'
        );
      });
    });

    test('should pass validation with optional baud rate', () => {
      // Arrange
      mockReq.body = {
        port: '/dev/ttyUSB0',
        baudRate: 115200
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    test('should validate baud rate values', () => {
      const validBaudRates = [9600, 19200, 38400, 57600, 115200, 230400];

      validBaudRates.forEach(baudRate => {
        mockReq.body = {
          port: '/dev/ttyUSB0',
          baudRate
        };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.error).not.toHaveBeenCalled();
      });
    });

    test('should fail validation with invalid baud rate', () => {
      const invalidBaudRates = [1200, 4800, 14400, 28800, 500000];

      invalidBaudRates.forEach(baudRate => {
        mockReq.body = {
          port: '/dev/ttyUSB0',
          baudRate
        };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid baud rate'),
          400,
          'VALIDATION_ERROR'
        );
      });
    });

    test('should fail validation with non-numeric baud rate', () => {
      // Arrange
      mockReq.body = {
        port: '/dev/ttyUSB0',
        baudRate: 'fast'
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Baud rate must be a number',
        400,
        'VALIDATION_ERROR'
      );
    });

    test('should ignore extra fields in request body', () => {
      // Arrange
      mockReq.body = {
        port: '/dev/ttyUSB0',
        extraField: 'should be ignored',
        anotherField: 123
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    test('should sanitize port path', () => {
      // Arrange
      mockReq.body = {
        port: '  /dev/ttyUSB0  ' // With whitespace
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.port).toBe('/dev/ttyUSB0'); // Trimmed
      expect(mockRes.error).not.toHaveBeenCalled();
    });

    test('should handle case-insensitive COM ports', () => {
      const comPorts = ['COM1', 'com1', 'Com1', 'COM10', 'com99'];

      comPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.error).not.toHaveBeenCalled();
        // Should normalize to uppercase
        expect(mockReq.body.port).toMatch(/^COM\d+$/);
      });
    });

    test('should validate maximum port path length', () => {
      // Arrange
      const longPort = '/dev/' + 'a'.repeat(100); // Very long port name
      mockReq.body = {
        port: longPort
      };

      // Act
      validateConnection(mockReq, mockRes, mockNext);

      // Assert
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Port path too long (maximum 50 characters)',
        400,
        'VALIDATION_ERROR'
      );
    });

    test('should prevent path traversal attacks', () => {
      const maliciousPorts = [
        '../../../etc/passwd',
        '/dev/../../../etc/passwd',
        '/dev/tty/../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/dev/ttyUSB0/../../../etc/passwd'
      ];

      maliciousPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).not.toHaveBeenCalled();
        expect(mockRes.error).toHaveBeenCalledWith(
          expect.stringContaining('Invalid port format'),
          400,
          'VALIDATION_ERROR'
        );
      });
    });
  });

  describe('Schema edge cases', () => {
    test('should handle malformed JSON gracefully', () => {
      // This would be handled by Express body parser, but we can test our validation
      mockReq.body = undefined;

      validateConnection(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Request body is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    test('should handle empty request body', () => {
      mockReq.body = {};

      validateConnection(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Port path is required',
        400,
        'VALIDATION_ERROR'
      );
    });

    test('should handle request body with only whitespace port', () => {
      mockReq.body = {
        port: '   \t\n   '
      };

      validateConnection(mockReq, mockRes, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Port path cannot be empty',
        400,
        'VALIDATION_ERROR'
      );
    });
  });

  describe('Platform-specific validations', () => {
    test('should validate Linux/Unix serial ports', () => {
      const linuxPorts = [
        '/dev/ttyUSB0',
        '/dev/ttyACM0',
        '/dev/ttyS0',
        '/dev/ttyAMA0',
        '/dev/rfcomm0'
      ];

      linuxPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.error).not.toHaveBeenCalled();
      });
    });

    test('should validate macOS serial ports', () => {
      const macPorts = [
        '/dev/cu.usbmodem1101',
        '/dev/tty.usbserial-ABC123',
        '/dev/cu.wchusbserial1410',
        '/dev/tty.Bluetooth-Incoming-Port'
      ];

      macPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.error).not.toHaveBeenCalled();
      });
    });

    test('should validate Windows COM ports', () => {
      const windowsPorts = [
        'COM1', 'COM2', 'COM3', 'COM4', 'COM5',
        'COM10', 'COM15', 'COM99', 'COM256'
      ];

      windowsPorts.forEach(port => {
        mockReq.body = { port };
        mockNext.mockClear();
        mockRes.error.mockClear();

        validateConnection(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(mockRes.error).not.toHaveBeenCalled();
      });
    });
  });
});