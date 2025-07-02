/**
 * G-code Controller Tests
 * 
 * Comprehensive test suite for G-code execution, file processing, and queue management.
 * Tests command execution, safety validation, and error handling.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  executeCommand,
  executeFile,
  getQueueStatus
} from '../controller.js';

// Mock dependencies
const mockInstanceManager = {
  getGcodeSender: jest.fn()
};

const mockGcodeSender = {
  executeCommand: jest.fn(),
  executeGcodeFile: jest.fn(),
  getQueueStatus: jest.fn(),
  isConnected: jest.fn(),
  pauseExecution: jest.fn(),
  resumeExecution: jest.fn(),
  stopExecution: jest.fn(),
  clearQueue: jest.fn()
};

const mockFileProcessor = {
  validateGcodeFile: jest.fn(),
  loadGcodeFile: jest.fn(),
  preprocessGcode: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockApiMessages = {
  gcode: {
    success: {
      command_executed: 'Command executed successfully',
      file_executed: 'G-code file {filename} executed successfully',
      queue_status_retrieved: 'Queue status retrieved successfully',
      execution_paused: 'Execution paused successfully',
      execution_resumed: 'Execution resumed successfully',
      execution_stopped: 'Execution stopped successfully'
    },
    errors: {
      command_required: 'G-code command is required',
      filename_required: 'Filename is required',
      machine_not_connected: 'Machine not connected',
      invalid_command: 'Invalid G-code command: {command}',
      file_not_found: 'G-code file {filename} not found',
      execution_failed: 'Failed to execute G-code: {error}',
      queue_error: 'Failed to retrieve queue status',
      dangerous_command: 'Command {command} requires confirmation'
    }
  }
};

// Mock modules
jest.unstable_mockModule('@cnc/core/services/shared/InstanceManager', () => ({
  default: mockInstanceManager
}));

jest.unstable_mockModule('@cnc/core/services/logger', () => mockLogger);

jest.unstable_mockModule('@cnc/core/cnc/files', () => ({
  default: mockFileProcessor
}));

jest.unstable_mockModule('../../config/messages.js', () => ({
  getApiMessages: jest.fn(() => mockApiMessages)
}));

describe('G-code Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
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

  describe('executeCommand', () => {
    test('should successfully execute valid G-code command', async () => {
      // Arrange
      mockReq.body = { command: 'G01 X10 Y10 F1000' };
      
      const mockResponse = {
        success: true,
        command: 'G01 X10 Y10 F1000',
        response: 'ok',
        executionTime: 150
      };
      
      mockGcodeSender.executeCommand.mockResolvedValue(mockResponse);

      // Act
      await executeCommand(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('G01 X10 Y10 F1000');
      expect(mockRes.success).toHaveBeenCalledWith(
        mockResponse,
        'Command executed successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Executed G-code command: G01 X10 Y10 F1000');
    });

    test('should reject execution when machine not connected', async () => {
      // Arrange
      mockReq.body = { command: 'G01 X10 Y10' };
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await executeCommand(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).not.toHaveBeenCalled();
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
    });

    test('should reject empty command', async () => {
      // Arrange
      mockReq.body = { command: '' };

      // Act
      await executeCommand(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'G-code command is required',
        400,
        'COMMAND_REQUIRED'
      );
      expect(mockGcodeSender.executeCommand).not.toHaveBeenCalled();
    });

    test('should reject missing command', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await executeCommand(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'G-code command is required',
        400,
        'COMMAND_REQUIRED'
      );
    });

    test('should handle dangerous commands with confirmation', async () => {
      // Arrange
      const dangerousCommands = ['M05', 'M30', 'M112', 'G28'];
      
      for (const command of dangerousCommands) {
        mockReq.body = { command, confirm: false };
        
        // Act
        await executeCommand(mockReq, mockRes);
        
        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          `Command ${command} requires confirmation`,
          400,
          'DANGEROUS_COMMAND'
        );
        
        // Reset mocks for next iteration
        jest.clearAllMocks();
        mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
        mockGcodeSender.isConnected.mockReturnValue(true);
      }
    });

    test('should execute dangerous commands with confirmation', async () => {
      // Arrange
      mockReq.body = { command: 'M05', confirm: true };
      
      const mockResponse = {
        success: true,
        command: 'M05',
        response: 'ok'
      };
      
      mockGcodeSender.executeCommand.mockResolvedValue(mockResponse);

      // Act
      await executeCommand(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledWith('M05');
      expect(mockRes.success).toHaveBeenCalledWith(
        mockResponse,
        'Command executed successfully'
      );
    });

    test('should validate G-code syntax', async () => {
      // Arrange
      const invalidCommands = [
        'INVALID_COMMAND',
        'G999 X10',
        'M999',
        'random text'
      ];

      for (const command of invalidCommands) {
        mockReq.body = { command };
        
        // Act
        await executeCommand(mockReq, mockRes);
        
        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          `Invalid G-code command: ${command}`,
          400,
          'INVALID_COMMAND'
        );
        
        // Reset for next iteration
        jest.clearAllMocks();
        mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
        mockGcodeSender.isConnected.mockReturnValue(true);
      }
    });

    test('should handle command execution failures', async () => {
      // Arrange
      mockReq.body = { command: 'G01 X10 Y10' };
      const error = new Error('Machine alarm state');
      mockGcodeSender.executeCommand.mockRejectedValue(error);

      // Act
      await executeCommand(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to execute G-code command G01 X10 Y10:',
        error
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to execute G-code: Machine alarm state',
        500,
        'EXECUTION_FAILED'
      );
    });

    test('should handle command timeout', async () => {
      // Arrange
      mockReq.body = { command: 'G01 X100 Y100 F50' }; // Slow movement
      const timeoutError = new Error('Command timeout');
      mockGcodeSender.executeCommand.mockRejectedValue(timeoutError);

      // Act
      await executeCommand(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to execute G-code: Command timeout',
        408,
        'EXECUTION_TIMEOUT'
      );
    });
  });

  describe('executeFile', () => {
    test('should successfully execute G-code file', async () => {
      // Arrange
      mockReq.body = { filename: 'test.gcode' };
      
      const mockFileContent = 'G01 X10 Y10\nG01 X20 Y20\nM30';
      const mockResponse = {
        success: true,
        filename: 'test.gcode',
        linesExecuted: 3,
        executionTime: 5000,
        status: 'completed'
      };
      
      mockFileProcessor.loadGcodeFile.mockResolvedValue(mockFileContent);
      mockFileProcessor.validateGcodeFile.mockResolvedValue({ valid: true, errors: [] });
      mockGcodeSender.executeGcodeFile.mockResolvedValue(mockResponse);

      // Act
      await executeFile(mockReq, mockRes);

      // Assert
      expect(mockFileProcessor.loadGcodeFile).toHaveBeenCalledWith('test.gcode');
      expect(mockFileProcessor.validateGcodeFile).toHaveBeenCalledWith(mockFileContent);
      expect(mockGcodeSender.executeGcodeFile).toHaveBeenCalledWith(
        mockFileContent,
        expect.objectContaining({ filename: 'test.gcode' })
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        mockResponse,
        'G-code file test.gcode executed successfully'
      );
    });

    test('should reject execution when machine not connected', async () => {
      // Arrange
      mockReq.body = { filename: 'test.gcode' };
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await executeFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
      expect(mockFileProcessor.loadGcodeFile).not.toHaveBeenCalled();
    });

    test('should reject missing filename', async () => {
      // Arrange
      mockReq.body = {};

      // Act
      await executeFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Filename is required',
        400,
        'FILENAME_REQUIRED'
      );
    });

    test('should handle file not found', async () => {
      // Arrange
      mockReq.body = { filename: 'nonexistent.gcode' };
      mockFileProcessor.loadGcodeFile.mockRejectedValue(new Error('ENOENT'));

      // Act
      await executeFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'G-code file nonexistent.gcode not found',
        404,
        'FILE_NOT_FOUND'
      );
    });

    test('should handle invalid G-code in file', async () => {
      // Arrange
      mockReq.body = { filename: 'invalid.gcode' };
      const invalidContent = 'INVALID COMMANDS\nG999 X999999';
      
      mockFileProcessor.loadGcodeFile.mockResolvedValue(invalidContent);
      mockFileProcessor.validateGcodeFile.mockResolvedValue({
        valid: false,
        errors: ['Invalid command: INVALID', 'Unknown G-code: G999']
      });

      // Act
      await executeFile(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'G-code file contains validation errors',
        400,
        'VALIDATION_FAILED',
        expect.objectContaining({
          errors: ['Invalid command: INVALID', 'Unknown G-code: G999']
        })
      );
    });

    test('should support dry run mode', async () => {
      // Arrange
      mockReq.body = { 
        filename: 'test.gcode',
        options: { dryRun: true }
      };
      
      const mockFileContent = 'G01 X10 Y10\nG01 X20 Y20';
      const mockDryRunResponse = {
        success: true,
        filename: 'test.gcode',
        dryRun: true,
        validation: { valid: true, lineCount: 2 },
        estimatedTime: 300
      };
      
      mockFileProcessor.loadGcodeFile.mockResolvedValue(mockFileContent);
      mockFileProcessor.validateGcodeFile.mockResolvedValue({ valid: true, errors: [] });
      mockGcodeSender.executeGcodeFile.mockResolvedValue(mockDryRunResponse);

      // Act
      await executeFile(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeGcodeFile).toHaveBeenCalledWith(
        mockFileContent,
        expect.objectContaining({
          filename: 'test.gcode',
          dryRun: true
        })
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        mockDryRunResponse,
        'G-code file test.gcode executed successfully'
      );
    });

    test('should handle execution errors during file processing', async () => {
      // Arrange
      mockReq.body = { filename: 'error.gcode' };
      const mockFileContent = 'G01 X10 Y10';
      
      mockFileProcessor.loadGcodeFile.mockResolvedValue(mockFileContent);
      mockFileProcessor.validateGcodeFile.mockResolvedValue({ valid: true, errors: [] });
      
      const executionError = new Error('Machine error during execution');
      mockGcodeSender.executeGcodeFile.mockRejectedValue(executionError);

      // Act
      await executeFile(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to execute G-code file error.gcode:',
        executionError
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to execute G-code: Machine error during execution',
        500,
        'EXECUTION_FAILED'
      );
    });
  });

  describe('getQueueStatus', () => {
    test('should return current queue status', async () => {
      // Arrange
      const mockQueueStatus = {
        status: 'running',
        totalCommands: 150,
        completedCommands: 75,
        remainingCommands: 75,
        currentCommand: 'G01 X15 Y15',
        progress: 50,
        estimatedTimeRemaining: 300,
        queuedFiles: ['part1.gcode', 'part2.gcode']
      };
      
      mockGcodeSender.getQueueStatus.mockResolvedValue(mockQueueStatus);

      // Act
      await getQueueStatus(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.getQueueStatus).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        mockQueueStatus,
        'Queue status retrieved successfully'
      );
    });

    test('should return empty queue status', async () => {
      // Arrange
      const emptyQueueStatus = {
        status: 'idle',
        totalCommands: 0,
        completedCommands: 0,
        remainingCommands: 0,
        currentCommand: null,
        progress: 0,
        estimatedTimeRemaining: 0,
        queuedFiles: []
      };
      
      mockGcodeSender.getQueueStatus.mockResolvedValue(emptyQueueStatus);

      // Act
      await getQueueStatus(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        emptyQueueStatus,
        'Queue status retrieved successfully'
      );
    });

    test('should handle queue status retrieval errors', async () => {
      // Arrange
      const error = new Error('Queue service unavailable');
      mockGcodeSender.getQueueStatus.mockRejectedValue(error);

      // Act
      await getQueueStatus(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get queue status:',
        error
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve queue status',
        500,
        'QUEUE_ERROR'
      );
    });

    test('should include detailed queue metrics when requested', async () => {
      // Arrange
      mockReq.query = { detailed: 'true' };
      
      const detailedQueueStatus = {
        status: 'running',
        totalCommands: 150,
        completedCommands: 75,
        remainingCommands: 75,
        currentCommand: 'G01 X15 Y15',
        progress: 50,
        performance: {
          averageCommandTime: 2000,
          commandsPerMinute: 30,
          errorRate: 0.02
        },
        history: {
          recentCommands: ['G01 X10 Y10', 'G01 X12 Y12', 'G01 X15 Y15'],
          recentErrors: []
        }
      };
      
      mockGcodeSender.getQueueStatus.mockResolvedValue(detailedQueueStatus);

      // Act
      await getQueueStatus(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.getQueueStatus).toHaveBeenCalledWith(
        expect.objectContaining({ detailed: true })
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        detailedQueueStatus,
        'Queue status retrieved successfully'
      );
    });
  });

  describe('Safety and validation', () => {
    test('should prevent execution of malicious commands', async () => {
      // Arrange
      const maliciousCommands = [
        'M999',     // Emergency reset (potentially dangerous)
        'G53',      // Machine coordinate system (could bypass limits)
        '$H',       // Homing (potentially dangerous without proper setup)
        '$X'        // Unlock (could override safety systems)
      ];

      for (const command of maliciousCommands) {
        mockReq.body = { command };
        
        // Act
        await executeCommand(mockReq, mockRes);
        
        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          expect.stringContaining('requires confirmation'),
          400,
          'DANGEROUS_COMMAND'
        );
        
        // Reset for next iteration
        jest.clearAllMocks();
        mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
        mockGcodeSender.isConnected.mockReturnValue(true);
      }
    });

    test('should validate coordinate bounds', async () => {
      // Arrange
      const outOfBoundsCommands = [
        'G01 X999999 Y999999',  // Extremely large coordinates
        'G01 X-999999 Y-999999', // Extremely negative coordinates
        'G01 Z-999999'           // Deep negative Z
      ];

      for (const command of outOfBoundsCommands) {
        mockReq.body = { command };
        
        // Act
        await executeCommand(mockReq, mockRes);
        
        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          `Invalid G-code command: ${command}`,
          400,
          'INVALID_COMMAND'
        );
        
        // Reset for next iteration
        jest.clearAllMocks();
        mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
        mockGcodeSender.isConnected.mockReturnValue(true);
      }
    });

    test('should validate feed rates and spindle speeds', async () => {
      // Arrange
      const invalidCommands = [
        'G01 X10 F999999',    // Extremely high feed rate
        'M03 S999999',        // Extremely high spindle speed
        'G01 X10 F-100'       // Negative feed rate
      ];

      for (const command of invalidCommands) {
        mockReq.body = { command };
        
        // Act
        await executeCommand(mockReq, mockRes);
        
        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          `Invalid G-code command: ${command}`,
          400,
          'INVALID_COMMAND'
        );
        
        // Reset for next iteration
        jest.clearAllMocks();
        mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
        mockGcodeSender.isConnected.mockReturnValue(true);
      }
    });
  });

  describe('Concurrent execution handling', () => {
    test('should handle multiple simultaneous command requests', async () => {
      // Arrange
      const commands = ['G01 X10', 'G01 X20', 'G01 X30'];
      const promises = commands.map((command, i) => {
        const req = { body: { command } };
        const res = {
          success: jest.fn(),
          error: jest.fn()
        };
        
        mockGcodeSender.executeCommand.mockResolvedValueOnce({
          success: true,
          command,
          response: 'ok'
        });
        
        return { req, res, promise: executeCommand(req, res) };
      });

      // Act
      await Promise.all(promises.map(({ promise }) => promise));

      // Assert
      promises.forEach(({ res }, i) => {
        expect(res.success).toHaveBeenCalledWith(
          expect.objectContaining({
            command: commands[i]
          }),
          'Command executed successfully'
        );
      });
    });

    test('should queue file execution requests properly', async () => {
      // Arrange
      const files = ['file1.gcode', 'file2.gcode'];
      
      mockFileProcessor.loadGcodeFile
        .mockResolvedValueOnce('G01 X10')
        .mockResolvedValueOnce('G01 X20');
      
      mockFileProcessor.validateGcodeFile
        .mockResolvedValue({ valid: true, errors: [] });
      
      mockGcodeSender.executeGcodeFile
        .mockResolvedValueOnce({ success: true, filename: 'file1.gcode' })
        .mockResolvedValueOnce({ success: true, filename: 'file2.gcode' });

      const promises = files.map(filename => {
        const req = { body: { filename } };
        const res = {
          success: jest.fn(),
          error: jest.fn()
        };
        return { req, res, promise: executeFile(req, res) };
      });

      // Act
      await Promise.all(promises.map(({ promise }) => promise));

      // Assert
      expect(mockGcodeSender.executeGcodeFile).toHaveBeenCalledTimes(2);
      promises.forEach(({ res }) => {
        expect(res.success).toHaveBeenCalled();
      });
    });
  });
});