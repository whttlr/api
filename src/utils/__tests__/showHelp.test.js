/**
 * Unit tests for showHelp utility
 */

import { showHelp } from '../showHelp.js';

// Mock console.log to capture output
const originalConsoleLog = console.log;
let consoleOutput = '';

describe('showHelp', () => {
  beforeEach(() => {
    // Reset console output capture
    consoleOutput = '';
    console.log = (message) => {
      consoleOutput += message + '\n';
    };
  });

  afterAll(() => {
    // Restore original console.log
    console.log = originalConsoleLog;
  });

  describe('help text content', () => {
    test('should display application title', () => {
      showHelp();
      expect(consoleOutput).toContain('G-code Sender - CNC Machine Communication & Debugging Tool');
    });

    test('should display usage instructions', () => {
      showHelp();
      expect(consoleOutput).toContain('Usage:');
      expect(consoleOutput).toContain('node gcode-sender.js [options] [command]');
    });

    test('should display all command-line options', () => {
      showHelp();
      
      // Check for all the expected options
      expect(consoleOutput).toContain('-p, --port <path>');
      expect(consoleOutput).toContain('-l, --list-ports');
      expect(consoleOutput).toContain('-i, --interactive');
      expect(consoleOutput).toContain('-d, --diagnose');
      expect(consoleOutput).toContain('--limits');
      expect(consoleOutput).toContain('-h, --help');
    });

    test('should display option descriptions', () => {
      showHelp();
      
      expect(consoleOutput).toContain('Specify serial port path');
      expect(consoleOutput).toContain('List available serial ports');
      expect(consoleOutput).toContain('Start interactive mode');
      expect(consoleOutput).toContain('Run movement diagnostics');
      expect(consoleOutput).toContain('Show machine limits and current position');
      expect(consoleOutput).toContain('Show this help message');
    });

    test('should display usage examples', () => {
      showHelp();
      
      expect(consoleOutput).toContain('Examples:');
      expect(consoleOutput).toContain('node gcode-sender.js "G0 X10"');
      expect(consoleOutput).toContain('node gcode-sender.js --port /dev/ttyUSB0 "G0 X10"');
      expect(consoleOutput).toContain('node gcode-sender.js --interactive');
      expect(consoleOutput).toContain('node gcode-sender.js --list-ports');
      expect(consoleOutput).toContain('node gcode-sender.js --diagnose');
      expect(consoleOutput).toContain('node gcode-sender.js --limits');
    });

    test('should display interactive commands', () => {
      showHelp();
      
      expect(consoleOutput).toContain('Interactive Commands:');
      expect(consoleOutput).toContain('help');
      expect(consoleOutput).toContain('status');
      expect(consoleOutput).toContain('connect <port>');
      expect(consoleOutput).toContain('disconnect');
      expect(consoleOutput).toContain('diagnose');
      expect(consoleOutput).toContain('limits');
      expect(consoleOutput).toContain('unlock');
      expect(consoleOutput).toContain('home');
      expect(consoleOutput).toContain('reset');
      expect(consoleOutput).toContain('stop');
      expect(consoleOutput).toContain('quit, exit');
      expect(consoleOutput).toContain('<gcode>');
    });

    test('should display interactive command descriptions', () => {
      showHelp();
      
      expect(consoleOutput).toContain('Show available commands');
      expect(consoleOutput).toContain('Show connection status');
      expect(consoleOutput).toContain('Connect to specified port');
      expect(consoleOutput).toContain('Disconnect from current port');
      expect(consoleOutput).toContain('Run movement diagnostics');
      expect(consoleOutput).toContain('Show machine limits and position');
      expect(consoleOutput).toContain('Send unlock command ($X)');
      expect(consoleOutput).toContain('Send homing command ($H)');
      expect(consoleOutput).toContain('Send soft reset');
      expect(consoleOutput).toContain('Emergency stop (M112)');
      expect(consoleOutput).toContain('Exit the program');
      expect(consoleOutput).toContain('Send G-code command');
    });

    test('should display Z-axis limits section', () => {
      showHelp();
      
      expect(consoleOutput).toContain('Z-Axis Limits:');
      expect(consoleOutput).toContain('The Z-axis is configured with the following limits:');
      expect(consoleOutput).toContain('Minimum: -28mm');
      expect(consoleOutput).toContain('Maximum: 40mm');
      expect(consoleOutput).toContain('Total travel: 78.5mm');
      expect(consoleOutput).toContain('To change these limits, modify the machineLimits.z values in the CONFIG object');
    });
  });

  describe('configuration integration', () => {
    test('should use config values for Z-axis limits', () => {
      showHelp();
      
      // The help should display the actual config values
      // These come from the CONFIG object loaded from config.json
      expect(consoleOutput).toContain('-28mm'); // min
      expect(consoleOutput).toContain('40mm');  // max
      expect(consoleOutput).toContain('78.5mm'); // totalTravel
    });
  });

  describe('function behavior', () => {
    test('should call console.log', () => {
      let called = false;
      console.log = () => { called = true; };
      showHelp();
      expect(called).toBe(true);
    });

    test('should output a single multi-line string', () => {
      let callCount = 0;
      console.log = () => { callCount++; };
      showHelp();
      expect(callCount).toBe(1);
    });

    test('should return undefined', () => {
      const result = showHelp();
      expect(result).toBeUndefined();
    });
  });

  describe('formatting', () => {
    test('should contain proper line breaks and spacing', () => {
      showHelp();
      
      // Check for proper section separation
      expect(consoleOutput).toContain('\n\n');
      
      // Check for proper indentation in examples and commands
      expect(consoleOutput).toContain('  node gcode-sender.js');
      expect(consoleOutput).toContain('  help');
      expect(consoleOutput).toContain('  -p, --port');
    });

    test('should start and end with newlines', () => {
      showHelp();
      
      expect(consoleOutput.startsWith('\n')).toBe(true);
      expect(consoleOutput.endsWith('\n')).toBe(true);
    });
  });
});