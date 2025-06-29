/**
 * CommandExecutor Tests
 * 
 * Tests for G-code command execution, safety checks, and emergency operations.
 * Following TDD principles with comprehensive coverage of safety-critical functionality.
 */

// Mock dependencies  
jest.mock('../../lib/logger/LoggerService.js');
jest.mock('../../lib/helpers/index.js');

import { CommandExecutor } from '../CommandExecutor.js';
import i18n from '../../i18n.js';
import { log, error, warn, info } from '../../lib/logger/LoggerService.js';
import {
  requiresHoming,
  ensureHomed,
  sendRawGcode,
  checkSafeLimits
} from '../../lib/helpers/index.js';

describe('CommandExecutor', () => {
  let commandExecutor;
  let mockConfig;
  let mockPort;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      timeouts: {
        command: 5000,
        emergency: 2000
      },
      emergencyStopCommand: '\x18', // Ctrl-X
      ui: {
        safetyWarningIcon: '⚠️',
        emergencyIcon: '🚨'
      },
      verboseExecution: false,
      retryDelay: 1000,
      validation: {
        maxCommandLength: 256,
        gcodeCommandRegex: /^[GMT]\d+/i
      },
      safety: {
        dangerousCommands: ['M999']
      }
    };

    // Mock port object
    mockPort = {
      write: jest.fn(),
      isOpen: true
    };

    // Mock i18n translation function
    i18n.t = jest.fn((key, params) => {
      // Return a mock translation with parameters interpolated
      return `${key}_${params ? JSON.stringify(params) : 'no_params'}`;
    });

    commandExecutor = new CommandExecutor(mockConfig);
  });

  describe('constructor', () => {
    test('should initialize with config and empty response callbacks', () => {
      expect(commandExecutor.config).toBe(mockConfig);
      expect(commandExecutor.responseCallbacks).toBeInstanceOf(Map);
      expect(commandExecutor.responseCallbacks.size).toBe(0);
      expect(commandExecutor.commandId).toBe(0);
    });
  });

  describe('createCommandWrapper', () => {
    test('should return a function that calls sendRawGcode with incremented command ID', () => {
      const wrapper = commandExecutor.createCommandWrapper(mockPort, true);
      const gcode = 'G1 X10';
      const timeout = 5000;

      sendRawGcode.mockResolvedValue({ success: true, response: 'ok' });

      wrapper(gcode, timeout);

      expect(sendRawGcode).toHaveBeenCalledWith(
        mockPort,
        true,
        1, // First command should get ID 1
        commandExecutor.responseCallbacks,
        gcode,
        timeout
      );
      expect(commandExecutor.commandId).toBe(1);
    });

    test('should increment command ID for each call', () => {
      const wrapper = commandExecutor.createCommandWrapper(mockPort, true);
      
      sendRawGcode.mockResolvedValue({ success: true, response: 'ok' });

      wrapper('G1 X10');
      wrapper('G1 Y10');

      expect(sendRawGcode).toHaveBeenCalledTimes(2);
      expect(sendRawGcode).toHaveBeenNthCalledWith(1, expect.anything(), expect.anything(), 1, expect.anything(), expect.anything(), expect.anything());
      expect(sendRawGcode).toHaveBeenNthCalledWith(2, expect.anything(), expect.anything(), 2, expect.anything(), expect.anything(), expect.anything());
    });
  });

  describe('sendGcode', () => {
    beforeEach(() => {
      checkSafeLimits.mockReturnValue({ safe: true, warnings: [] });
      requiresHoming.mockReturnValue(false);
      sendRawGcode.mockResolvedValue({ success: true, response: 'ok' });
    });

    test('should execute safe command successfully', async () => {
      const gcode = 'G1 X10 Y10';
      const result = await commandExecutor.sendGcode(mockPort, true, gcode);

      expect(checkSafeLimits).toHaveBeenCalledWith(requiresHoming, gcode);
      expect(sendRawGcode).toHaveBeenCalledWith(
        mockPort,
        true,
        1,
        commandExecutor.responseCallbacks,
        gcode,
        mockConfig.timeouts.command
      );
      expect(result.success).toBe(true);
      expect(result.response).toBe('ok');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('should use custom timeout when provided', async () => {
      const gcode = 'G1 X10';
      const customTimeout = 3000;
      
      await commandExecutor.sendGcode(mockPort, true, gcode, customTimeout);

      expect(sendRawGcode).toHaveBeenCalledWith(
        mockPort,
        true,
        1,
        commandExecutor.responseCallbacks,
        gcode,
        customTimeout
      );
    });

    test('should block unsafe commands', async () => {
      const gcode = 'G1 X1000'; // Assume this exceeds limits
      const unsafeWarnings = ['Command exceeds machine limits'];
      
      checkSafeLimits.mockReturnValue({
        safe: false,
        warnings: unsafeWarnings
      });

      await expect(commandExecutor.sendGcode(mockPort, true, gcode))
        .rejects.toThrow();

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('safetyWarning'));
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('commandCancelled'));
      expect(sendRawGcode).not.toHaveBeenCalled();
    });

    test('should ensure homing for commands that require it', async () => {
      const gcode = 'G1 X10';
      requiresHoming.mockReturnValue(true);

      await commandExecutor.sendGcode(mockPort, true, gcode);

      expect(ensureHomed).toHaveBeenCalledWith(
        expect.any(Function), // command wrapper
        log
      );
    });

    test('should not call ensureHomed for commands that do not require homing', async () => {
      const gcode = 'M114'; // Status query, doesn't require homing
      requiresHoming.mockReturnValue(false);

      await commandExecutor.sendGcode(mockPort, true, gcode);

      expect(ensureHomed).not.toHaveBeenCalled();
    });

    test('should handle sendRawGcode errors', async () => {
      const gcode = 'G1 X10';
      const error = new Error('Communication timeout');
      
      sendRawGcode.mockRejectedValue(error);

      await expect(commandExecutor.sendGcode(mockPort, true, gcode))
        .rejects.toThrow('Communication timeout');
    });
  });

  describe('emergencyStop', () => {
    test('should execute emergency stop command', async () => {
      sendRawGcode.mockResolvedValue({ success: true, response: 'ok' });

      const result = await commandExecutor.emergencyStop(mockPort, true);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('emergencyStopInitiated'));
      expect(sendRawGcode).toHaveBeenCalledWith(
        mockPort,
        true,
        1,
        commandExecutor.responseCallbacks,
        mockConfig.emergencyStopCommand,
        mockConfig.timeouts.emergency
      );
      expect(info).toHaveBeenCalledWith(expect.stringContaining('emergencyStopSuccess'));
      expect(result.success).toBe(true);
    });

    test('should handle emergency stop failure', async () => {
      const emergencyError = new Error('Emergency stop failed');
      sendRawGcode.mockRejectedValue(emergencyError);

      await expect(commandExecutor.emergencyStop(mockPort, true))
        .rejects.toThrow('Emergency stop failed');

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('emergencyStopInitiated'));
      expect(error).toHaveBeenCalledWith(expect.stringContaining('emergencyStopFailed'));
    });
  });

  describe('sendCommandSequence', () => {
    beforeEach(() => {
      checkSafeLimits.mockReturnValue({ safe: true, warnings: [] });
      requiresHoming.mockReturnValue(false);
      sendRawGcode.mockResolvedValue({ success: true, response: 'ok', duration: 100 });
    });

    test('should execute all commands in sequence', async () => {
      const commands = ['G1 X10', 'G1 Y10', 'G1 Z5'];
      
      const result = await commandExecutor.sendCommandSequence(mockPort, true, commands);

      expect(result.totalCommands).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      
      result.results.forEach((res, index) => {
        expect(res.command).toBe(commands[index]);
        expect(res.commandNumber).toBe(index + 1);
        expect(res.success).toBe(true);
      });
    });

    test('should continue on error when stopOnError is false', async () => {
      const commands = ['G1 X10', 'INVALID', 'G1 Y10'];
      
      sendRawGcode
        .mockResolvedValueOnce({ success: true, response: 'ok', duration: 100 })
        .mockRejectedValueOnce(new Error('Invalid command'))
        .mockResolvedValueOnce({ success: true, response: 'ok', duration: 100 });

      const result = await commandExecutor.sendCommandSequence(
        mockPort, 
        true, 
        commands,
        { stopOnError: false }
      );

      expect(result.totalCommands).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Invalid command');
    });

    test('should stop on error when stopOnError is true', async () => {
      const commands = ['G1 X10', 'INVALID', 'G1 Y10'];
      
      sendRawGcode
        .mockResolvedValueOnce({ success: true, response: 'ok', duration: 100 })
        .mockRejectedValueOnce(new Error('Invalid command'));

      const result = await commandExecutor.sendCommandSequence(
        mockPort, 
        true, 
        commands,
        { stopOnError: true }
      );

      expect(result.totalCommands).toBe(3);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results).toHaveLength(2); // Should stop after error
    });

    test('should respect delay between commands', async () => {
      const commands = ['G1 X10', 'G1 Y10'];
      const delay = 100;
      
      const startTime = Date.now();
      await commandExecutor.sendCommandSequence(
        mockPort, 
        true, 
        commands,
        { delayBetween: delay }
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(delay);
    });

    test('should log verbose execution when enabled', async () => {
      commandExecutor.config.verboseExecution = true;
      const commands = ['G1 X10', 'G1 Y10'];
      
      await commandExecutor.sendCommandSequence(mockPort, true, commands);

      expect(info).toHaveBeenCalledWith(expect.stringContaining('executingCommand'));
    });
  });

  describe('executeWithRetry', () => {
    beforeEach(() => {
      checkSafeLimits.mockReturnValue({ safe: true, warnings: [] });
      requiresHoming.mockReturnValue(false);
    });

    test('should succeed on first attempt', async () => {
      const command = 'G1 X10';
      sendRawGcode.mockResolvedValue({ success: true, response: 'ok' });

      const result = await commandExecutor.executeWithRetry(mockPort, true, command);

      expect(result.success).toBe(true);
      expect(sendRawGcode).toHaveBeenCalledTimes(1);
      expect(warn).not.toHaveBeenCalled();
    });

    test('should retry on failure and eventually succeed', async () => {
      const command = 'G1 X10';
      sendRawGcode
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ success: true, response: 'ok' });

      const result = await commandExecutor.executeWithRetry(mockPort, true, command, 3);

      expect(result.success).toBe(true);
      expect(sendRawGcode).toHaveBeenCalledTimes(3);
      expect(warn).toHaveBeenCalledTimes(2); // Two retry warnings
    });

    test('should fail after max retries', async () => {
      const command = 'G1 X10';
      const error = new Error('Persistent error');
      sendRawGcode.mockRejectedValue(error);

      await expect(commandExecutor.executeWithRetry(mockPort, true, command, 2))
        .rejects.toThrow(expect.stringContaining('commandFailedAfterRetries'));

      expect(sendRawGcode).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledTimes(1); // One retry warning
    });
  });

  describe('validateCommand', () => {
    test('should validate normal G-code command', () => {
      const command = 'G1 X10 Y10';
      
      const validation = commandExecutor.validateCommand(command);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should reject commands that are too long', () => {
      const longCommand = 'G1 ' + 'X10 '.repeat(100); // Very long command
      
      const validation = commandExecutor.validateCommand(longCommand);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('commandTooLong'));
    });

    test('should warn about invalid G-code prefix', () => {
      const command = 'INVALID_COMMAND';
      
      const validation = commandExecutor.validateCommand(command);

      expect(validation.warnings).toContain(expect.stringContaining('invalidGcodePrefix'));
    });

    test('should reject dangerous commands', () => {
      const command = 'M999 RESTART'; // Contains dangerous command
      
      const validation = commandExecutor.validateCommand(command);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(expect.stringContaining('dangerousCommand'));
    });

    test('should handle commands with valid G, M, T prefixes', () => {
      const commands = ['G1 X10', 'M3 S1000', 'T1'];
      
      commands.forEach(command => {
        const validation = commandExecutor.validateCommand(command);
        expect(validation.warnings).not.toContain(expect.stringContaining('invalidGcodePrefix'));
      });
    });
  });

  describe('getExecutionStats', () => {
    test('should return correct statistics', () => {
      commandExecutor.commandId = 5;
      commandExecutor.responseCallbacks.set('1', {});
      commandExecutor.responseCallbacks.set('2', {});

      const stats = commandExecutor.getExecutionStats();

      expect(stats.totalCommands).toBe(5);
      expect(stats.pendingCommands).toBe(2);
      expect(stats.averageResponseTime).toBeDefined();
    });
  });

  describe('clearPendingCallbacks', () => {
    test('should clear all pending callbacks', () => {
      commandExecutor.responseCallbacks.set('1', {});
      commandExecutor.responseCallbacks.set('2', {});

      expect(commandExecutor.responseCallbacks.size).toBe(2);

      commandExecutor.clearPendingCallbacks();

      expect(commandExecutor.responseCallbacks.size).toBe(0);
    });
  });

  describe('getResponseCallbacks', () => {
    test('should return the response callbacks map', () => {
      const callbacks = commandExecutor.getResponseCallbacks();

      expect(callbacks).toBe(commandExecutor.responseCallbacks);
      expect(callbacks).toBeInstanceOf(Map);
    });
  });

  describe('Safety Critical Tests', () => {
    test('should never execute commands when disconnected', async () => {
      const command = 'G1 X10';
      checkSafeLimits.mockReturnValue({ safe: true, warnings: [] });

      await commandExecutor.sendGcode(mockPort, false, command);

      expect(sendRawGcode).toHaveBeenCalledWith(
        mockPort,
        false, // isConnected should be false
        expect.any(Number),
        expect.any(Map),
        command,
        expect.any(Number)
      );
    });

    test('should block all unsafe commands regardless of other factors', async () => {
      const command = 'G1 X999999'; // Extreme movement
      checkSafeLimits.mockReturnValue({
        safe: false,
        warnings: ['Exceeds machine limits', 'Potential collision']
      });

      await expect(commandExecutor.sendGcode(mockPort, true, command))
        .rejects.toThrow();

      // Should not attempt to send the command
      expect(sendRawGcode).not.toHaveBeenCalled();
      expect(ensureHomed).not.toHaveBeenCalled();
    });

    test('should handle emergency stop even when other commands fail', async () => {
      // Simulate a scenario where normal commands fail but emergency stop must work
      sendRawGcode
        .mockRejectedValueOnce(new Error('System error'))
        .mockResolvedValueOnce({ success: true, response: 'emergency_stop_ok' });

      // Try a normal command that fails
      await expect(commandExecutor.sendGcode(mockPort, true, 'G1 X10'))
        .rejects.toThrow('System error');

      // Emergency stop should still work
      const result = await commandExecutor.emergencyStop(mockPort, true);
      expect(result.success).toBe(true);
    });
  });
});