/**
 * Presets Controller Tests
 * 
 * Comprehensive test suite for preset management functionality.
 * Tests preset creation, listing, execution, validation, and error handling.
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  listPresets,
  getPreset,
  createPreset,
  updatePreset,
  deletePreset,
  executePreset,
  validatePreset
} from '../controller.js';

// Mock dependencies
const mockPresetsService = {
  listPresets: jest.fn(),
  getPreset: jest.fn(),
  createPreset: jest.fn(),
  updatePreset: jest.fn(),
  deletePreset: jest.fn(),
  validatePreset: jest.fn(),
  presetExists: jest.fn()
};

const mockInstanceManager = {
  getGcodeSender: jest.fn(),
  getPresetsService: jest.fn()
};

const mockGcodeSender = {
  isConnected: jest.fn(),
  executeCommand: jest.fn(),
  executeGcodeFile: jest.fn(),
  getMachineStatus: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn()
};

const mockApiMessages = {
  presets: {
    success: {
      presets_listed: 'Presets retrieved successfully',
      preset_retrieved: 'Preset {name} retrieved successfully',
      preset_created: 'Preset {name} created successfully',
      preset_updated: 'Preset {name} updated successfully',
      preset_deleted: 'Preset {name} deleted successfully',
      preset_executed: 'Preset {name} executed successfully',
      preset_validated: 'Preset {name} validated successfully'
    },
    errors: {
      preset_not_found: 'Preset {name} not found',
      preset_already_exists: 'Preset {name} already exists',
      preset_name_required: 'Preset name is required',
      preset_invalid: 'Preset validation failed: {errors}',
      preset_execution_failed: 'Failed to execute preset {name}: {error}',
      machine_not_connected: 'Machine not connected',
      preset_create_failed: 'Failed to create preset {name}',
      preset_update_failed: 'Failed to update preset {name}',
      preset_delete_failed: 'Failed to delete preset {name}',
      dangerous_preset: 'Preset {name} contains dangerous commands and requires confirmation'
    }
  }
};

// Mock modules
jest.unstable_mockModule('@cnc/core/services/shared/InstanceManager', () => ({
  default: mockInstanceManager
}));

jest.unstable_mockModule('@cnc/core/services/logger', () => mockLogger);

jest.unstable_mockModule('@cnc/core/services/presets', () => ({
  default: mockPresetsService
}));

jest.unstable_mockModule('../../config/messages.js', () => ({
  getApiMessages: jest.fn(() => mockApiMessages)
}));

describe('Presets Controller', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
    mockInstanceManager.getPresetsService.mockReturnValue(mockPresetsService);
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

  describe('listPresets', () => {
    test('should return list of available presets', async () => {
      // Arrange
      const mockPresets = [
        {
          name: 'drill_holes',
          description: 'Standard drilling pattern',
          commands: ['G81 Z-5 R2 F100'],
          category: 'drilling',
          tags: ['holes', 'standard'],
          created: '2024-06-24T12:00:00.000Z',
          modified: '2024-06-24T12:00:00.000Z'
        },
        {
          name: 'surface_mill',
          description: 'Surface milling operation',
          commands: ['G01 Z-1 F500', 'G01 X100 Y100'],
          category: 'milling',
          tags: ['surface', 'roughing'],
          created: '2024-06-24T11:00:00.000Z',
          modified: '2024-06-24T11:30:00.000Z'
        }
      ];
      
      mockPresetsService.listPresets.mockResolvedValue(mockPresets);

      // Act
      await listPresets(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.listPresets).toHaveBeenCalledWith();
      expect(mockRes.success).toHaveBeenCalledWith(
        {
          presets: mockPresets,
          count: 2,
          categories: ['drilling', 'milling']
        },
        'Presets retrieved successfully'
      );
    });

    test('should filter presets by category', async () => {
      // Arrange
      mockReq.query = { category: 'drilling' };
      
      const mockFilteredPresets = [
        {
          name: 'drill_holes',
          description: 'Standard drilling pattern',
          category: 'drilling'
        }
      ];
      
      mockPresetsService.listPresets.mockResolvedValue(mockFilteredPresets);

      // Act
      await listPresets(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.listPresets).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'drilling' })
      );
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          presets: mockFilteredPresets,
          count: 1
        }),
        'Presets retrieved successfully'
      );
    });

    test('should filter presets by tags', async () => {
      // Arrange
      mockReq.query = { tags: 'holes,standard' };
      
      const mockTaggedPresets = [
        {
          name: 'drill_holes',
          tags: ['holes', 'standard']
        }
      ];
      
      mockPresetsService.listPresets.mockResolvedValue(mockTaggedPresets);

      // Act
      await listPresets(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.listPresets).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ['holes', 'standard'] })
      );
    });

    test('should handle empty preset list', async () => {
      // Arrange
      mockPresetsService.listPresets.mockResolvedValue([]);

      // Act
      await listPresets(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        {
          presets: [],
          count: 0,
          categories: []
        },
        'Presets retrieved successfully'
      );
    });

    test('should handle preset service errors', async () => {
      // Arrange
      const error = new Error('Preset storage unavailable');
      mockPresetsService.listPresets.mockRejectedValue(error);

      // Act
      await listPresets(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to list presets:',
        error
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve presets',
        500,
        'PRESETS_LIST_FAILED'
      );
    });
  });

  describe('getPreset', () => {
    test('should return specific preset by name', async () => {
      // Arrange
      mockReq.params = { presetName: 'drill_holes' };
      
      const mockPreset = {
        name: 'drill_holes',
        description: 'Standard drilling pattern',
        commands: ['G81 Z-5 R2 F100', 'G80'],
        parameters: {
          depth: -5,
          retract: 2,
          feedRate: 100
        },
        category: 'drilling',
        tags: ['holes', 'standard'],
        created: '2024-06-24T12:00:00.000Z',
        modified: '2024-06-24T12:00:00.000Z'
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);

      // Act
      await getPreset(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.getPreset).toHaveBeenCalledWith('drill_holes');
      expect(mockRes.success).toHaveBeenCalledWith(
        mockPreset,
        'Preset drill_holes retrieved successfully'
      );
    });

    test('should handle preset not found', async () => {
      // Arrange
      mockReq.params = { presetName: 'nonexistent' };
      mockPresetsService.getPreset.mockResolvedValue(null);

      // Act
      await getPreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset nonexistent not found',
        404,
        'PRESET_NOT_FOUND'
      );
    });

    test('should handle preset service errors', async () => {
      // Arrange
      mockReq.params = { presetName: 'drill_holes' };
      const error = new Error('Database connection failed');
      mockPresetsService.getPreset.mockRejectedValue(error);

      // Act
      await getPreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to retrieve preset drill_holes',
        500,
        'PRESET_RETRIEVAL_FAILED'
      );
    });
  });

  describe('createPreset', () => {
    test('should create new preset successfully', async () => {
      // Arrange
      const newPreset = {
        name: 'new_drill',
        description: 'New drilling pattern',
        commands: ['G81 Z-3 R1 F200'],
        category: 'drilling',
        tags: ['holes', 'custom']
      };
      
      mockReq.body = newPreset;
      mockPresetsService.presetExists.mockResolvedValue(false);
      mockPresetsService.validatePreset.mockResolvedValue({ valid: true, errors: [] });
      mockPresetsService.createPreset.mockResolvedValue({
        ...newPreset,
        created: '2024-06-24T12:00:00.000Z',
        modified: '2024-06-24T12:00:00.000Z'
      });

      // Act
      await createPreset(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.presetExists).toHaveBeenCalledWith('new_drill');
      expect(mockPresetsService.validatePreset).toHaveBeenCalledWith(newPreset);
      expect(mockPresetsService.createPreset).toHaveBeenCalledWith(newPreset);
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining(newPreset),
        'Preset new_drill created successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Created new preset: new_drill');
    });

    test('should reject preset creation if name missing', async () => {
      // Arrange
      mockReq.body = {
        description: 'Missing name',
        commands: ['G01 X10']
      };

      // Act
      await createPreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset name is required',
        400,
        'PRESET_NAME_REQUIRED'
      );
      expect(mockPresetsService.createPreset).not.toHaveBeenCalled();
    });

    test('should reject preset creation if already exists', async () => {
      // Arrange
      mockReq.body = {
        name: 'existing_preset',
        commands: ['G01 X10']
      };
      
      mockPresetsService.presetExists.mockResolvedValue(true);

      // Act
      await createPreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset existing_preset already exists',
        409,
        'PRESET_ALREADY_EXISTS'
      );
    });

    test('should reject invalid preset commands', async () => {
      // Arrange
      mockReq.body = {
        name: 'invalid_preset',
        commands: ['INVALID_COMMAND', 'G999 X999999']
      };
      
      mockPresetsService.presetExists.mockResolvedValue(false);
      mockPresetsService.validatePreset.mockResolvedValue({
        valid: false,
        errors: ['Invalid command: INVALID_COMMAND', 'Unknown G-code: G999']
      });

      // Act
      await createPreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset validation failed: Invalid command: INVALID_COMMAND, Unknown G-code: G999',
        400,
        'PRESET_INVALID',
        expect.objectContaining({
          errors: ['Invalid command: INVALID_COMMAND', 'Unknown G-code: G999']
        })
      );
    });

    test('should handle dangerous commands with confirmation', async () => {
      // Arrange
      mockReq.body = {
        name: 'dangerous_preset',
        commands: ['M05', 'M30', 'G28'],
        confirm: false
      };
      
      mockPresetsService.presetExists.mockResolvedValue(false);
      mockPresetsService.validatePreset.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: ['Contains dangerous commands: M05, M30, G28']
      });

      // Act
      await createPreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset dangerous_preset contains dangerous commands and requires confirmation',
        400,
        'DANGEROUS_PRESET'
      );
    });

    test('should create preset with dangerous commands when confirmed', async () => {
      // Arrange
      mockReq.body = {
        name: 'dangerous_preset',
        commands: ['M05', 'G01 X10'],
        confirm: true
      };
      
      mockPresetsService.presetExists.mockResolvedValue(false);
      mockPresetsService.validatePreset.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: ['Contains dangerous commands: M05']
      });
      mockPresetsService.createPreset.mockResolvedValue(mockReq.body);

      // Act
      await createPreset(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.createPreset).toHaveBeenCalledWith(mockReq.body);
      expect(mockRes.success).toHaveBeenCalled();
    });
  });

  describe('executePreset', () => {
    test('should execute preset successfully', async () => {
      // Arrange
      mockReq.params = { presetName: 'drill_holes' };
      mockReq.body = { parameters: { depth: -5, feedRate: 150 } };
      
      const mockPreset = {
        name: 'drill_holes',
        commands: ['G81 Z{depth} R2 F{feedRate}', 'G80'],
        parameters: {
          depth: -3,
          feedRate: 100
        }
      };
      
      const mockExecutionResult = {
        success: true,
        preset: 'drill_holes',
        commandsExecuted: 2,
        executionTime: 3000,
        parameters: { depth: -5, feedRate: 150 }
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);
      mockGcodeSender.executeCommand
        .mockResolvedValueOnce({ success: true, command: 'G81 Z-5 R2 F150' })
        .mockResolvedValueOnce({ success: true, command: 'G80' });

      // Act
      await executePreset(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.getPreset).toHaveBeenCalledWith('drill_holes');
      expect(mockGcodeSender.executeCommand).toHaveBeenCalledTimes(2);
      expect(mockGcodeSender.executeCommand).toHaveBeenNthCalledWith(1, 'G81 Z-5 R2 F150');
      expect(mockGcodeSender.executeCommand).toHaveBeenNthCalledWith(2, 'G80');
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          preset: 'drill_holes',
          commandsExecuted: 2
        }),
        'Preset drill_holes executed successfully'
      );
    });

    test('should reject execution when machine not connected', async () => {
      // Arrange
      mockReq.params = { presetName: 'drill_holes' };
      mockGcodeSender.isConnected.mockReturnValue(false);

      // Act
      await executePreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Machine not connected',
        400,
        'MACHINE_NOT_CONNECTED'
      );
      expect(mockPresetsService.getPreset).not.toHaveBeenCalled();
    });

    test('should handle preset not found during execution', async () => {
      // Arrange
      mockReq.params = { presetName: 'nonexistent' };
      mockPresetsService.getPreset.mockResolvedValue(null);

      // Act
      await executePreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset nonexistent not found',
        404,
        'PRESET_NOT_FOUND'
      );
    });

    test('should handle command execution failures', async () => {
      // Arrange
      mockReq.params = { presetName: 'drill_holes' };
      
      const mockPreset = {
        name: 'drill_holes',
        commands: ['G81 Z-5 R2 F100', 'G80']
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);
      mockGcodeSender.executeCommand
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Machine alarm state'));

      // Act
      await executePreset(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to execute preset drill_holes:',
        expect.any(Error)
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to execute preset drill_holes: Machine alarm state',
        500,
        'PRESET_EXECUTION_FAILED'
      );
    });

    test('should support dry run mode', async () => {
      // Arrange
      mockReq.params = { presetName: 'drill_holes' };
      mockReq.body = { dryRun: true };
      
      const mockPreset = {
        name: 'drill_holes',
        commands: ['G81 Z-5 R2 F100', 'G80']
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);

      // Act
      await executePreset(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).not.toHaveBeenCalled();
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          dryRun: true,
          preset: 'drill_holes',
          validation: expect.objectContaining({
            valid: true,
            commandCount: 2
          })
        }),
        'Preset drill_holes executed successfully'
      );
    });

    test('should interpolate parameters in commands', async () => {
      // Arrange
      mockReq.params = { presetName: 'parametric_drill' };
      mockReq.body = {
        parameters: {
          x: 10,
          y: 20,
          depth: -3,
          feedRate: 200
        }
      };
      
      const mockPreset = {
        name: 'parametric_drill',
        commands: [
          'G00 X{x} Y{y}',
          'G01 Z{depth} F{feedRate}',
          'G00 Z2'
        ]
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);
      mockGcodeSender.executeCommand.mockResolvedValue({ success: true });

      // Act
      await executePreset(mockReq, mockRes);

      // Assert
      expect(mockGcodeSender.executeCommand).toHaveBeenNthCalledWith(1, 'G00 X10 Y20');
      expect(mockGcodeSender.executeCommand).toHaveBeenNthCalledWith(2, 'G01 Z-3 F200');
      expect(mockGcodeSender.executeCommand).toHaveBeenNthCalledWith(3, 'G00 Z2');
    });
  });

  describe('validatePreset', () => {
    test('should validate preset successfully', async () => {
      // Arrange
      mockReq.params = { presetName: 'drill_holes' };
      
      const mockPreset = {
        name: 'drill_holes',
        commands: ['G81 Z-5 R2 F100', 'G80']
      };
      
      const mockValidationResult = {
        valid: true,
        errors: [],
        warnings: [],
        statistics: {
          commandCount: 2,
          estimatedTime: 150,
          movements: 1
        }
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);
      mockPresetsService.validatePreset.mockResolvedValue(mockValidationResult);

      // Act
      await validatePreset(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.getPreset).toHaveBeenCalledWith('drill_holes');
      expect(mockPresetsService.validatePreset).toHaveBeenCalledWith(mockPreset);
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          preset: 'drill_holes',
          validation: mockValidationResult
        }),
        'Preset drill_holes validated successfully'
      );
    });

    test('should handle validation errors', async () => {
      // Arrange
      mockReq.params = { presetName: 'invalid_preset' };
      
      const mockPreset = {
        name: 'invalid_preset',
        commands: ['INVALID_COMMAND', 'G999 X999999']
      };
      
      const mockValidationResult = {
        valid: false,
        errors: ['Invalid command: INVALID_COMMAND', 'Unknown G-code: G999'],
        warnings: ['Coordinates exceed machine limits']
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);
      mockPresetsService.validatePreset.mockResolvedValue(mockValidationResult);

      // Act
      await validatePreset(mockReq, mockRes);

      // Assert
      expect(mockRes.success).toHaveBeenCalledWith(
        expect.objectContaining({
          preset: 'invalid_preset',
          validation: mockValidationResult
        }),
        'Preset invalid_preset validated successfully'
      );
    });

    test('should handle preset not found during validation', async () => {
      // Arrange
      mockReq.params = { presetName: 'nonexistent' };
      mockPresetsService.getPreset.mockResolvedValue(null);

      // Act
      await validatePreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset nonexistent not found',
        404,
        'PRESET_NOT_FOUND'
      );
    });
  });

  describe('deletePreset', () => {
    test('should delete preset successfully', async () => {
      // Arrange
      mockReq.params = { presetName: 'old_preset' };
      mockPresetsService.presetExists.mockResolvedValue(true);
      mockPresetsService.deletePreset.mockResolvedValue(true);

      // Act
      await deletePreset(mockReq, mockRes);

      // Assert
      expect(mockPresetsService.presetExists).toHaveBeenCalledWith('old_preset');
      expect(mockPresetsService.deletePreset).toHaveBeenCalledWith('old_preset');
      expect(mockRes.success).toHaveBeenCalledWith(
        { deleted: true, preset: 'old_preset' },
        'Preset old_preset deleted successfully'
      );
      expect(mockLogger.info).toHaveBeenCalledWith('Deleted preset: old_preset');
    });

    test('should handle preset not found during deletion', async () => {
      // Arrange
      mockReq.params = { presetName: 'nonexistent' };
      mockPresetsService.presetExists.mockResolvedValue(false);

      // Act
      await deletePreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        'Preset nonexistent not found',
        404,
        'PRESET_NOT_FOUND'
      );
      expect(mockPresetsService.deletePreset).not.toHaveBeenCalled();
    });

    test('should handle deletion failures', async () => {
      // Arrange
      mockReq.params = { presetName: 'problematic_preset' };
      mockPresetsService.presetExists.mockResolvedValue(true);
      const error = new Error('File system permission denied');
      mockPresetsService.deletePreset.mockRejectedValue(error);

      // Act
      await deletePreset(mockReq, mockRes);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to delete preset problematic_preset:',
        error
      );
      expect(mockRes.error).toHaveBeenCalledWith(
        'Failed to delete preset problematic_preset',
        500,
        'PRESET_DELETE_FAILED'
      );
    });
  });

  describe('Safety and validation', () => {
    test('should identify dangerous presets', async () => {
      // Arrange
      const dangerousPresets = [
        { name: 'emergency_stop', commands: ['M112'] },
        { name: 'rapid_home', commands: ['G28'] },
        { name: 'spindle_control', commands: ['M05', 'M03 S24000'] },
        { name: 'machine_reset', commands: ['$X', '$H'] }
      ];

      for (const preset of dangerousPresets) {
        mockReq.body = { ...preset, confirm: false };
        mockPresetsService.presetExists.mockResolvedValue(false);
        mockPresetsService.validatePreset.mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [`Contains dangerous commands: ${preset.commands.join(', ')}`]
        });

        // Act
        await createPreset(mockReq, mockRes);

        // Assert
        expect(mockRes.error).toHaveBeenCalledWith(
          expect.stringContaining('contains dangerous commands'),
          400,
          'DANGEROUS_PRESET'
        );

        // Reset for next iteration
        jest.clearAllMocks();
        mockInstanceManager.getGcodeSender.mockReturnValue(mockGcodeSender);
        mockInstanceManager.getPresetsService.mockReturnValue(mockPresetsService);
        mockGcodeSender.isConnected.mockReturnValue(true);
      }
    });

    test('should validate parameter substitution safety', async () => {
      // Arrange
      mockReq.params = { presetName: 'parametric_preset' };
      mockReq.body = {
        parameters: {
          x: 999999,      // Dangerous large value
          feedRate: -100  // Invalid negative value
        }
      };

      const mockPreset = {
        name: 'parametric_preset',
        commands: ['G01 X{x} F{feedRate}']
      };

      mockPresetsService.getPreset.mockResolvedValue(mockPreset);

      // Act
      await executePreset(mockReq, mockRes);

      // Assert
      expect(mockRes.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid parameter values'),
        400,
        'INVALID_PARAMETERS'
      );
    });
  });

  describe('Concurrent operations', () => {
    test('should handle multiple preset operations concurrently', async () => {
      // Arrange
      const operations = [
        { type: 'list', req: { query: {} } },
        { type: 'get', req: { params: { presetName: 'preset1' } } },
        { type: 'get', req: { params: { presetName: 'preset2' } } }
      ];

      mockPresetsService.listPresets.mockResolvedValue([]);
      mockPresetsService.getPreset
        .mockResolvedValueOnce({ name: 'preset1' })
        .mockResolvedValueOnce({ name: 'preset2' });

      const promises = operations.map(({ type, req }) => {
        const res = {
          success: jest.fn(),
          error: jest.fn()
        };

        if (type === 'list') {
          return { promise: listPresets(req, res), res };
        } else {
          return { promise: getPreset(req, res), res };
        }
      });

      // Act
      await Promise.all(promises.map(({ promise }) => promise));

      // Assert
      promises.forEach(({ res }) => {
        expect(res.success).toHaveBeenCalled();
      });
      expect(mockPresetsService.listPresets).toHaveBeenCalledTimes(1);
      expect(mockPresetsService.getPreset).toHaveBeenCalledTimes(2);
    });

    test('should prevent concurrent execution of same preset', async () => {
      // Arrange
      mockReq.params = { presetName: 'concurrent_test' };
      
      const mockPreset = {
        name: 'concurrent_test',
        commands: ['G01 X10', 'G01 X20']
      };
      
      mockPresetsService.getPreset.mockResolvedValue(mockPreset);
      mockGcodeSender.executeCommand.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const promises = Array.from({ length: 2 }, () => {
        const res = {
          success: jest.fn(),
          error: jest.fn()
        };
        return { promise: executePreset(mockReq, res), res };
      });

      // Act
      await Promise.all(promises.map(({ promise }) => promise));

      // Assert - Only one execution should succeed, one should be rejected
      const successCount = promises.filter(({ res }) => res.success.mock.calls.length > 0).length;
      const errorCount = promises.filter(({ res }) => res.error.mock.calls.length > 0).length;
      
      expect(successCount + errorCount).toBe(2);
      expect(successCount).toBe(1); // Only one should succeed
    });
  });
});