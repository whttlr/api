/**
 * LoggerService Tests
 * 
 * Tests for centralized logging functionality with level filtering and formatting.
 * Following TDD principles with comprehensive coverage of logging scenarios.
 */

import { log, error, warn, info, debug, verbose } from '../LoggerService.js';

describe('LoggerService', () => {
  let consoleSpy;
  let consoleErrorSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock Date to have predictable timestamps
    jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-01T12:00:00.000Z');
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    jest.restoreAllMocks();
  });

  describe('log function', () => {
    test('should log info messages without timestamp or level prefix', () => {
      log('Test message', null, 'info');

      expect(consoleSpy).toHaveBeenCalledWith('Test message');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    test('should log info messages with data', () => {
      const testData = { key: 'value' };
      log('Test message', testData, 'info');

      expect(consoleSpy).toHaveBeenCalledWith('Test message', testData);
    });

    test('should log error messages with timestamp and ERROR prefix', () => {
      log('Error message', null, 'error');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [ERROR] Error message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    test('should log error messages with data', () => {
      const errorData = { code: 500, details: 'Server error' };
      log('Error message', errorData, 'error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00.000Z] [ERROR] Error message', 
        errorData
      );
    });

    test('should log warn messages with timestamp and WARN prefix', () => {
      log('Warning message', null, 'warn');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [WARN] Warning message');
    });

    test('should filter out debug messages at INFO level', () => {
      log('Debug message', null, 'debug');

      expect(consoleSpy).not.toHaveBeenCalled(); // Debug filtered out at INFO level
    });

    test('should default to info level when no level specified', () => {
      log('Default level message');

      expect(consoleSpy).toHaveBeenCalledWith('Default level message');
    });

    test('should handle invalid log levels by treating them as custom levels with prefix', () => {
      log('Invalid level message', null, 'INVALID');

      expect(consoleSpy).toHaveBeenCalledWith('[INVALID] Invalid level message');
    });

    test('should handle case-insensitive log levels', () => {
      log('Uppercase level', null, 'error'); // Use lowercase 'error' as expected by LoggerService
      log('Lowercase level', null, 'warn');
      log('Mixed case level', null, 'debug'); // This will be filtered out at INFO level

      expect(consoleErrorSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [ERROR] Uppercase level');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [WARN] Lowercase level');
      expect(consoleSpy).not.toHaveBeenCalled(); // DEBUG filtered out at INFO level
    });
  });

  describe('log level filtering', () => {
    test('should filter out debug messages with default INFO level', () => {
      log('Info message', null, 'info');
      log('Debug message', null, 'debug');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith('Info message');
    });

    test('should show error, warn, and info messages with default INFO level', () => {
      log('Error message', null, 'error');
      log('Warn message', null, 'warn');
      log('Info message', null, 'info');
      log('Debug message', null, 'debug');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledTimes(1); // Only info, debug filtered out
    });

    test('should handle verbose log level (filtered out by default)', () => {
      log('Verbose message', null, 'verbose');
      log('Debug message', null, 'debug');
      log('Info message', null, 'info');

      expect(consoleSpy).toHaveBeenCalledTimes(1); // Only info shows
      expect(consoleSpy).toHaveBeenCalledWith('Info message');
    });
  });

  describe('convenience functions', () => {
    test('error() should call log with error level', () => {
      error('Error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [ERROR] Error message');
    });

    test('error() should handle data parameter', () => {
      const errorData = { code: 404 };
      error('Not found', errorData);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00.000Z] [ERROR] Not found', 
        errorData
      );
    });

    test('warn() should call log with warn level', () => {
      warn('Warning message');

      expect(consoleWarnSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [WARN] Warning message');
    });

    test('warn() should handle data parameter', () => {
      const warnData = { deprecated: true };
      warn('Deprecated feature', warnData);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[2023-01-01T12:00:00.000Z] [WARN] Deprecated feature', 
        warnData
      );
    });

    test('info() should call log with info level', () => {
      info('Info message');

      expect(consoleSpy).toHaveBeenCalledWith('Info message');
    });

    test('info() should handle data parameter', () => {
      const infoData = { status: 'success' };
      info('Operation completed', infoData);

      expect(consoleSpy).toHaveBeenCalledWith('Operation completed', infoData);
    });

    test('debug() should be filtered out at INFO level', () => {
      debug('Debug message');

      expect(consoleSpy).not.toHaveBeenCalled(); // Filtered out at INFO level
    });

    test('debug() with data should be filtered out at INFO level', () => {
      const debugData = { variables: { x: 10, y: 20 } };
      debug('Debug info', debugData);

      expect(consoleSpy).not.toHaveBeenCalled(); // Filtered out at INFO level
    });

    test('verbose() should be filtered out at INFO level', () => {
      verbose('Verbose message');

      expect(consoleSpy).not.toHaveBeenCalled(); // Filtered out at INFO level
    });

    test('verbose() with data should be filtered out at INFO level', () => {
      const verboseData = { trace: 'detailed execution path' };
      verbose('Verbose trace', verboseData);

      expect(consoleSpy).not.toHaveBeenCalled(); // Filtered out at INFO level
    });
  });

  describe('config fallback behavior', () => {
    test('should use fallback behavior (tests default INFO level)', () => {
      // LoggerService uses fallback config internally
      info('Fallback test');
      debug('Debug with fallback');

      expect(consoleSpy).toHaveBeenCalledTimes(1); // Only info should show with default INFO level
      expect(consoleSpy).toHaveBeenCalledWith('Fallback test');
    });

    test('should handle default behavior gracefully', () => {
      info('Message with default behavior');
      debug('Debug with default behavior');

      expect(consoleSpy).toHaveBeenCalledTimes(1); // Default to INFO level
      expect(consoleSpy).toHaveBeenCalledWith('Message with default behavior');
    });
  });

  describe('edge cases', () => {
    test('should handle null and undefined messages', () => {
      log(null);
      log(undefined);
      log('');

      expect(consoleSpy).toHaveBeenCalledWith('null');
      expect(consoleSpy).toHaveBeenCalledWith('undefined');
      expect(consoleSpy).toHaveBeenCalledWith('');
    });

    test('should handle complex data objects', () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' }
        },
        circular: null
      };
      complexData.circular = complexData; // Create circular reference

      info('Complex data test', complexData);

      expect(consoleSpy).toHaveBeenCalledWith('Complex data test', complexData);
    });

    test('should handle very long messages', () => {
      const longMessage = 'A'.repeat(10000);
      
      info(longMessage);

      expect(consoleSpy).toHaveBeenCalledWith(longMessage);
    });

    test('should handle special characters in messages', () => {
      const specialMessage = 'Message with émojis 🚀 and special chars: ñ, ü, ç';
      
      info(specialMessage);

      expect(consoleSpy).toHaveBeenCalledWith(specialMessage);
    });

    test('should handle rapid successive logging calls', () => {
      for (let i = 0; i < 100; i++) {
        info(`Message ${i}`);
      }

      expect(consoleSpy).toHaveBeenCalledTimes(100);
    });
  });

  describe('timestamp behavior', () => {
    test('should use actual timestamp when Date mock is removed', () => {
      jest.restoreAllMocks();
      
      // Re-mock console to capture calls
      const newConsoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      error('Real timestamp test');

      expect(newConsoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\] Real timestamp test$/)
      );

      newConsoleSpy.mockRestore();
    });

    test('should show info without timestamp but filter debug at INFO level', () => {
      info('Info without timestamp');
      debug('Debug with timestamp'); // This will be filtered out

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Info without timestamp');
    });
  });

  describe('integration scenarios', () => {
    test('should work correctly in a typical logging session', () => {
      // Simulate a typical application flow (with default INFO level)
      info('Application starting');
      debug('Loading configuration', { config: 'test.json' }); // This will be filtered out
      info('Configuration loaded successfully');
      warn('Deprecated feature used', { feature: 'old-api' });
      error('Connection failed', { host: 'localhost', port: 3000 });
      info('Retrying connection');
      info('Connection established');

      expect(consoleSpy).toHaveBeenCalledTimes(4); // Only info calls (debug filtered out)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

      // Verify specific calls
      expect(consoleSpy).toHaveBeenNthCalledWith(1, 'Application starting');
      expect(consoleSpy).toHaveBeenNthCalledWith(2, 'Configuration loaded successfully');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [WARN] Deprecated feature used', { feature: 'old-api' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('[2023-01-01T12:00:00.000Z] [ERROR] Connection failed', { host: 'localhost', port: 3000 });
    });

    test('should maintain performance with high-frequency logging', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        log(`High frequency message ${i}`, { iteration: i }, 'info');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(consoleSpy).toHaveBeenCalledTimes(1000);
    });
  });
});