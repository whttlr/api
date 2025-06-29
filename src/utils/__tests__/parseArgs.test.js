/**
 * Unit tests for parseArgs utility
 */

import { parseArgs } from '../parseArgs.js';

// Mock process.argv
const originalArgv = process.argv;

describe('parseArgs', () => {
  beforeEach(() => {
    // Reset process.argv before each test
    process.argv = ['node', 'gcode-sender.js'];
  });

  afterAll(() => {
    // Restore original process.argv
    process.argv = originalArgv;
  });

  describe('basic option parsing', () => {
    test('should parse --help flag', () => {
      process.argv = ['node', 'gcode-sender.js', '--help'];
      const options = parseArgs();
      expect(options.help).toBe(true);
    });

    test('should parse -h flag', () => {
      process.argv = ['node', 'gcode-sender.js', '-h'];
      const options = parseArgs();
      expect(options.help).toBe(true);
    });

    test('should parse --port with value', () => {
      process.argv = ['node', 'gcode-sender.js', '--port', '/dev/ttyUSB0'];
      const options = parseArgs();
      expect(options.port).toBe('/dev/ttyUSB0');
    });

    test('should parse -p with value', () => {
      process.argv = ['node', 'gcode-sender.js', '-p', '/dev/tty.usbmodem1101'];
      const options = parseArgs();
      expect(options.port).toBe('/dev/tty.usbmodem1101');
    });

    test('should parse --list-ports flag', () => {
      process.argv = ['node', 'gcode-sender.js', '--list-ports'];
      const options = parseArgs();
      expect(options.listPorts).toBe(true);
    });

    test('should parse -l flag', () => {
      process.argv = ['node', 'gcode-sender.js', '-l'];
      const options = parseArgs();
      expect(options.listPorts).toBe(true);
    });

    test('should parse --interactive flag', () => {
      process.argv = ['node', 'gcode-sender.js', '--interactive'];
      const options = parseArgs();
      expect(options.interactive).toBe(true);
    });

    test('should parse -i flag', () => {
      process.argv = ['node', 'gcode-sender.js', '-i'];
      const options = parseArgs();
      expect(options.interactive).toBe(true);
    });

    test('should parse --diagnose flag', () => {
      process.argv = ['node', 'gcode-sender.js', '--diagnose'];
      const options = parseArgs();
      expect(options.diagnose).toBe(true);
    });

    test('should parse -d flag', () => {
      process.argv = ['node', 'gcode-sender.js', '-d'];
      const options = parseArgs();
      expect(options.diagnose).toBe(true);
    });

    test('should parse --limits flag', () => {
      process.argv = ['node', 'gcode-sender.js', '--limits'];
      const options = parseArgs();
      expect(options.limits).toBe(true);
    });
  });

  describe('command parsing', () => {
    test('should parse G-code command', () => {
      process.argv = ['node', 'gcode-sender.js', 'G0 X10'];
      const options = parseArgs();
      expect(options.command).toBe('G0 X10');
    });

    test('should parse command with port option', () => {
      process.argv = ['node', 'gcode-sender.js', '--port', '/dev/ttyUSB0', 'G1 Y5'];
      const options = parseArgs();
      expect(options.port).toBe('/dev/ttyUSB0');
      expect(options.command).toBe('G1 Y5');
    });

    test('should take first non-option argument as command', () => {
      process.argv = ['node', 'gcode-sender.js', 'G0 X1', 'G0 Y1'];
      const options = parseArgs();
      expect(options.command).toBe('G0 X1');
    });
  });

  describe('default behavior', () => {
    test('should default to interactive mode when no command or flags', () => {
      process.argv = ['node', 'gcode-sender.js'];
      const options = parseArgs();
      expect(options.interactive).toBe(true);
      expect(options.command).toBeNull();
    });

    test('should not enable interactive when command is provided', () => {
      process.argv = ['node', 'gcode-sender.js', 'G0 X10'];
      const options = parseArgs();
      expect(options.interactive).toBe(false);
      expect(options.command).toBe('G0 X10');
    });

    test('should not enable interactive when --list-ports is provided', () => {
      process.argv = ['node', 'gcode-sender.js', '--list-ports'];
      const options = parseArgs();
      expect(options.interactive).toBe(false);
      expect(options.listPorts).toBe(true);
    });

    test('should not enable interactive when --help is provided', () => {
      process.argv = ['node', 'gcode-sender.js', '--help'];
      const options = parseArgs();
      expect(options.interactive).toBe(false);
      expect(options.help).toBe(true);
    });

    test('should not enable interactive when --diagnose is provided', () => {
      process.argv = ['node', 'gcode-sender.js', '--diagnose'];
      const options = parseArgs();
      expect(options.interactive).toBe(false);
      expect(options.diagnose).toBe(true);
    });

    test('should not enable interactive when --limits is provided', () => {
      process.argv = ['node', 'gcode-sender.js', '--limits'];
      const options = parseArgs();
      expect(options.interactive).toBe(false);
      expect(options.limits).toBe(true);
    });
  });

  describe('default option values', () => {
    test('should have correct default values', () => {
      process.argv = ['node', 'gcode-sender.js', '--help'];
      const options = parseArgs();
      expect(options).toEqual({
        port: null,
        command: null,
        interactive: false,
        help: true,
        listPorts: false,
        diagnose: false,
        limits: false,
        file: null
      });
    });
  });

  describe('complex combinations', () => {
    test('should handle multiple flags correctly', () => {
      process.argv = ['node', 'gcode-sender.js', '--port', '/dev/ttyUSB0', '--diagnose'];
      const options = parseArgs();
      expect(options.port).toBe('/dev/ttyUSB0');
      expect(options.diagnose).toBe(true);
      expect(options.interactive).toBe(false);
    });

    test('should handle mixed short and long flags', () => {
      process.argv = ['node', 'gcode-sender.js', '-p', '/dev/ttyUSB0', '--list-ports'];
      const options = parseArgs();
      expect(options.port).toBe('/dev/ttyUSB0');
      expect(options.listPorts).toBe(true);
    });

    test('should handle command with flags', () => {
      process.argv = ['node', 'gcode-sender.js', '-p', '/dev/ttyUSB0', 'G0 X10 Y20'];
      const options = parseArgs();
      expect(options.port).toBe('/dev/ttyUSB0');
      expect(options.command).toBe('G0 X10 Y20');
      expect(options.interactive).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle empty args array', () => {
      process.argv = ['node', 'gcode-sender.js'];
      const options = parseArgs();
      expect(options.interactive).toBe(true);
    });

    test('should handle port flag without value', () => {
      process.argv = ['node', 'gcode-sender.js', '--port'];
      const options = parseArgs();
      expect(options.port).toBeUndefined(); // Will increment i but no next arg exists
    });

    test('should handle command that looks like a flag', () => {
      process.argv = ['node', 'gcode-sender.js', '--unknown-flag'];
      const options = parseArgs();
      expect(options.command).toBe('--unknown-flag');
      expect(options.interactive).toBe(false);
    });
  });
});