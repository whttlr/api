/**
 * FileProcessor Tests
 * 
 * Tests for G-code file reading, validation, preprocessing, and execution.
 * Following TDD principles with comprehensive coverage of file operations.
 */

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../lib/logger/index.js');
jest.mock('../../lib/reporting/index.js');

import { FileProcessor } from '../FileProcessor.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import i18n from '../../../i18n.js';
import { info, warn, error } from '../../../lib/logger/index.js';
import { structuredLogger, createFileExecutionSummary } from '../../../lib/reporting/index.js';

describe('FileProcessor', () => {
  let fileProcessor;
  let mockConfig;
  let mockCommandExecutor;
  let mockPort;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      validation: {
        gcodeFileExtensions: ['.gcode', '.nc', '.txt'],
        gcodeCommandRegex: '^[GMT]\\d+'
      },
      ui: {
        progressFormat: '[{current}/{total}]',
        continueOnErrorMsg: 'Continue on error?'
      },
      estimation: {
        avgCommandTime: 500,
        movementCommandTime: 1000
      }
    };

    // Mock command executor
    mockCommandExecutor = {
      sendGcode: jest.fn()
    };

    // Mock port
    mockPort = { write: jest.fn(), isOpen: true };

    // Mock i18n
    if (i18n && i18n.t) {
      i18n.t.mockImplementation((key, params) => 
        params ? `${key}_${JSON.stringify(params)}` : key
      );
    }

    // Mock structured logger
    structuredLogger.config = {};
    structuredLogger.logStructured = jest.fn().mockReturnValue({ logged: true });
    createFileExecutionSummary.mockReturnValue({ reportData: 'mock' });

    fileProcessor = new FileProcessor(mockConfig);
  });

  describe('constructor', () => {
    test('should initialize with config', () => {
      expect(fileProcessor.config).toBe(mockConfig);
    });
  });

  describe('preprocessGcodeFile', () => {
    test('should process valid G-code content', () => {
      const content = `
G1 X10 Y10 ; Move to position
M3 S1000 ; Start spindle
; This is a comment
T1 ; Tool change

G0 Z5 ; Rapid move
      `;

      const result = fileProcessor.preprocessGcodeFile(content);

      expect(result).toEqual([
        'G1 X10 Y10',
        'M3 S1000',
        'T1',
        'G0 Z5'
      ]);
    });

    test('should remove comments in parentheses', () => {
      const content = 'G1 X10 (move to position) Y10';
      const result = fileProcessor.preprocessGcodeFile(content);
      expect(result).toEqual(['G1 X10  Y10']);
    });

    test('should remove semicolon comments', () => {
      const content = 'G1 X10 Y10 ; this is a comment';
      const result = fileProcessor.preprocessGcodeFile(content);
      expect(result).toEqual(['G1 X10 Y10']);
    });

    test('should skip empty lines', () => {
      const content = `
      G1 X10
      
      
      M3 S1000
      `;
      const result = fileProcessor.preprocessGcodeFile(content);
      expect(result).toEqual(['G1 X10', 'M3 S1000']);
    });

    test('should skip lines that do not match G-code pattern', () => {
      const content = `
      G1 X10
      Invalid line
      Another invalid line
      M3 S1000
      `;
      const result = fileProcessor.preprocessGcodeFile(content);
      expect(result).toEqual(['G1 X10', 'M3 S1000']);
    });

    test('should convert commands to uppercase', () => {
      const content = 'g1 x10 y10\nm3 s1000';
      const result = fileProcessor.preprocessGcodeFile(content);
      expect(result).toEqual(['G1 X10 Y10', 'M3 S1000']);
    });

    test('should handle mixed case comments and commands', () => {
      const content = `
      g1 x10 ; Lower case command
      G1 Y10 ; Upper case command
      m3 s1000 (spindle start)
      `;
      const result = fileProcessor.preprocessGcodeFile(content);
      expect(result).toEqual(['G1 X10', 'G1 Y10', 'M3 S1000']);
    });
  });

  describe('validateGcodeFile', () => {
    beforeEach(() => {
      resolve.mockReturnValue('/resolved/path/test.gcode');
    });

    test('should validate a valid G-code file', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('G1 X10\nM3 S1000\n; Comment\n\nG0 Z5');

      const result = fileProcessor.validateGcodeFile('test.gcode');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.totalLines).toBe(5);
      expect(result.stats.validCommands).toBe(3);
      expect(result.stats.comments).toBe(1);
      expect(result.stats.emptyLines).toBe(1);
    });

    test('should handle non-existent file', () => {
      existsSync.mockReturnValue(false);

      const result = fileProcessor.validateGcodeFile('nonexistent.gcode');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('fileNotFoundValidation'));
    });

    test('should warn about invalid file extension', () => {
      resolve.mockReturnValue('/resolved/path/test.xyz');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('G1 X10');

      const result = fileProcessor.validateGcodeFile('test.xyz');

      expect(result.warnings).toContain(expect.stringContaining('unrecognizedFileExtensionValidation'));
    });

    test('should handle file with no valid commands', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('; Only comments\n; More comments\n\n');

      const result = fileProcessor.validateGcodeFile('test.gcode');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('noValidCommandsFoundValidation'));
      expect(result.stats.validCommands).toBe(0);
    });

    test('should handle file read errors', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = fileProcessor.validateGcodeFile('test.gcode');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('fileValidationFailed'));
    });

    test('should count different line types correctly', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(`
G1 X10 Y10
; Full line comment
M3 S1000

( Parentheses comment )
G0 Z5
Invalid line that will be ignored
      `);

      const result = fileProcessor.validateGcodeFile('test.gcode');

      expect(result.stats.validCommands).toBe(3); // G1, M3, G0
      expect(result.stats.comments).toBe(2); // ; and ( comments
      expect(result.stats.emptyLines).toBe(2); // Two empty lines
    });
  });

  describe('executeGcodeFile', () => {
    beforeEach(() => {
      resolve.mockReturnValue('/resolved/path/test.gcode');
      existsSync.mockReturnValue(true);
    });

    test('should execute G-code file successfully', async () => {
      const gcodeContent = 'G1 X10\nM3 S1000\nG0 Z5';
      readFileSync.mockReturnValue(gcodeContent);
      
      mockCommandExecutor.sendGcode
        .mockResolvedValueOnce({ response: 'ok', duration: 100 })
        .mockResolvedValueOnce({ response: 'ok', duration: 150 })
        .mockResolvedValueOnce({ response: 'ok', duration: 80 });

      const result = await fileProcessor.executeGcodeFile(
        'test.gcode',
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(result.success).toBe(true);
      expect(result.totalCommands).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.results[0]).toEqual({
        line: 1,
        command: 'G1 X10',
        success: true,
        response: 'ok',
        duration: 100
      });
      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledTimes(3);
    });

    test('should handle file not found error', async () => {
      existsSync.mockReturnValue(false);

      await expect(fileProcessor.executeGcodeFile(
        'nonexistent.gcode',
        mockCommandExecutor,
        mockPort,
        true
      )).rejects.toThrow();

      expect(i18n.t).toHaveBeenCalledWith('fileProcessor.fileNotFound', expect.any(Object));
    });

    test('should warn about invalid file extension but proceed', async () => {
      resolve.mockReturnValue('/resolved/path/test.xyz');
      readFileSync.mockReturnValue('G1 X10');
      mockCommandExecutor.sendGcode.mockResolvedValue({ response: 'ok', duration: 100 });

      const result = await fileProcessor.executeGcodeFile(
        'test.xyz',
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unrecognizedFileExtension'));
      expect(info).toHaveBeenCalledWith(expect.stringContaining('proceedingAnyway'));
      expect(result.success).toBe(true);
    });

    test('should handle empty file error', async () => {
      readFileSync.mockReturnValue('; Only comments\n\n');

      await expect(fileProcessor.executeGcodeFile(
        'empty.gcode',
        mockCommandExecutor,
        mockPort,
        true
      )).rejects.toThrow();

      expect(i18n.t).toHaveBeenCalledWith('fileProcessor.noValidCommandsFound');
    });

    test('should handle command execution errors and continue', async () => {
      const gcodeContent = 'G1 X10\nINVALID\nG0 Z5';
      readFileSync.mockReturnValue(gcodeContent);
      
      mockCommandExecutor.sendGcode
        .mockResolvedValueOnce({ response: 'ok', duration: 100 })
        .mockRejectedValueOnce(new Error('Invalid command'))
        .mockResolvedValueOnce({ response: 'ok', duration: 80 });

      // Mock promptContinueOnError to return true
      jest.spyOn(fileProcessor, 'promptContinueOnError').mockResolvedValue(true);

      const result = await fileProcessor.executeGcodeFile(
        'test.gcode',
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toBe('Invalid command');
      expect(error).toHaveBeenCalledWith(expect.stringContaining('failedToExecuteLine'));
    });

    test('should stop execution on error when user chooses not to continue', async () => {
      const gcodeContent = 'G1 X10\nINVALID\nG0 Z5';
      readFileSync.mockReturnValue(gcodeContent);
      
      mockCommandExecutor.sendGcode
        .mockResolvedValueOnce({ response: 'ok', duration: 100 })
        .mockRejectedValueOnce(new Error('Invalid command'));

      // Mock promptContinueOnError to return false
      jest.spyOn(fileProcessor, 'promptContinueOnError').mockResolvedValue(false);

      const result = await fileProcessor.executeGcodeFile(
        'test.gcode',
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2); // Should stop after error
      expect(info).toHaveBeenCalledWith(expect.stringContaining('fileExecutionStopped'));
      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledTimes(2);
    });

    test('should log progress information during execution', async () => {
      const gcodeContent = 'G1 X10\nM3 S1000';
      readFileSync.mockReturnValue(gcodeContent);
      mockCommandExecutor.sendGcode.mockResolvedValue({ response: 'ok', duration: 100 });

      await fileProcessor.executeGcodeFile(
        'test.gcode',
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(info).toHaveBeenCalledWith(expect.stringContaining('readingGcodeFile'));
      expect(info).toHaveBeenCalledWith(expect.stringContaining('commandsToExecute'));
      expect(info).toHaveBeenCalledWith(expect.stringContaining('executingCommand'));
    });
  });

  describe('getFileStats', () => {
    beforeEach(() => {
      resolve.mockReturnValue('/resolved/path/test.gcode');
    });

    test('should return file statistics', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('G1 X10\nM3 S1000\n; Comment\n\nG0 Z5');

      const result = fileProcessor.getFileStats('test.gcode');

      expect(result.filePath).toBe('/resolved/path/test.gcode');
      expect(result.totalLines).toBe(5);
      expect(result.validCommands).toBe(3);
      expect(result.commands).toEqual(['G1 X10', 'M3 S1000', 'G0 Z5']);
      expect(result.estimatedDuration).toBeDefined();
      expect(result.estimatedDuration.milliseconds).toBeGreaterThan(0);
    });

    test('should handle file not found error', () => {
      existsSync.mockReturnValue(false);

      expect(() => fileProcessor.getFileStats('nonexistent.gcode'))
        .toThrow('File not found: nonexistent.gcode');
    });

    test('should handle file read errors', () => {
      existsSync.mockReturnValue(true);
      readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      expect(() => fileProcessor.getFileStats('test.gcode'))
        .toThrow();

      expect(i18n.t).toHaveBeenCalledWith('fileProcessor.failedToAnalyzeFile', 
        expect.objectContaining({ error: 'Read error' }));
    });
  });

  describe('estimateExecutionTime', () => {
    test('should estimate execution time for movement commands', () => {
      const commands = ['G0 X10', 'G1 Y10', 'M3 S1000', 'T1'];

      const result = fileProcessor.estimateExecutionTime(commands);

      expect(result.milliseconds).toBe(3000); // 2 * 1000 + 2 * 500
      expect(result.seconds).toBe(3);
      expect(result.minutes).toBe(0);
    });

    test('should handle empty command list', () => {
      const result = fileProcessor.estimateExecutionTime([]);

      expect(result.milliseconds).toBe(0);
      expect(result.seconds).toBe(0);
      expect(result.minutes).toBe(0);
    });

    test('should round time calculations correctly', () => {
      const commands = Array(120).fill('M3'); // 120 * 500ms = 60000ms = 1 minute

      const result = fileProcessor.estimateExecutionTime(commands);

      expect(result.milliseconds).toBe(60000);
      expect(result.seconds).toBe(60);
      expect(result.minutes).toBe(1);
    });
  });

  describe('generateFileExecutionSummary', () => {
    test('should generate structured execution summary', () => {
      const filePath = 'test.gcode';
      const results = [
        { line: 1, command: 'G1 X10', success: true, response: 'ok' },
        { line: 2, command: 'M3 S1000', success: false, error: 'timeout' }
      ];

      const result = fileProcessor.generateFileExecutionSummary(filePath, results, null, 'json');

      expect(createFileExecutionSummary).toHaveBeenCalledWith(filePath, results, null);
      expect(structuredLogger.config.outputMode).toBe('json');
      expect(structuredLogger.config.ui).toBe(mockConfig.ui);
      expect(structuredLogger.logStructured).toHaveBeenCalled();
      expect(result).toEqual({ logged: true });
    });

    test('should use console output mode by default', () => {
      const result = fileProcessor.generateFileExecutionSummary('test.gcode', []);

      expect(structuredLogger.config.outputMode).toBe('console');
    });
  });

  describe('displayFileExecutionSummary', () => {
    test('should call generateFileExecutionSummary with console mode', () => {
      const filePath = 'test.gcode';
      const results = [];
      const spy = jest.spyOn(fileProcessor, 'generateFileExecutionSummary');

      fileProcessor.displayFileExecutionSummary(filePath, results);

      expect(spy).toHaveBeenCalledWith(filePath, results, null, 'console');
    });
  });

  describe('promptContinueOnError', () => {
    test('should return true by default', async () => {
      const result = await fileProcessor.promptContinueOnError(5, 'G1 X10', 'timeout');

      expect(result).toBe(true);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('continueOnErrorMsg'));
    });

    test('should use default message when config is missing', async () => {
      fileProcessor.config.ui = {};

      const result = await fileProcessor.promptContinueOnError(5, 'G1 X10', 'timeout');

      expect(result).toBe(true);
      expect(i18n.t).toHaveBeenCalledWith('fileProcessor.errorOnLineContinue', { lineNumber: 5 });
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete file execution workflow', async () => {
      const gcodeContent = `
; Test file
G1 X10 Y10 ; First move
M3 S1000 ; Start spindle
G0 Z5 ; Rapid move up
M5 ; Stop spindle
      `;
      
      resolve.mockReturnValue('/path/test.gcode');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue(gcodeContent);
      
      mockCommandExecutor.sendGcode.mockResolvedValue({ response: 'ok', duration: 100 });

      const result = await fileProcessor.executeGcodeFile(
        'test.gcode',
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(result.success).toBe(true);
      expect(result.totalCommands).toBe(4); // G1, M3, G0, M5
      expect(result.results.every(r => r.success)).toBe(true);
      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledTimes(4);
    });

    test('should handle validation before execution', () => {
      resolve.mockReturnValue('/path/test.gcode');
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('G1 X10\nM3 S1000');

      // Validate first
      const validation = fileProcessor.validateGcodeFile('test.gcode');
      expect(validation.valid).toBe(true);
      expect(validation.stats.validCommands).toBe(2);

      // Get stats
      const stats = fileProcessor.getFileStats('test.gcode');
      expect(stats.validCommands).toBe(2);
      expect(stats.estimatedDuration.milliseconds).toBe(1500); // G1=1000ms + M3=500ms
    });
  });
});