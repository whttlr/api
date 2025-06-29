/**
 * StructuredLogger Tests
 * 
 * Tests for the structured logging system.
 */

import { StructuredLogger, structuredLogger } from '../index.js';
import { createDiagnosticReport, createAlarmReport } from '../index.js';

describe('StructuredLogger', () => {
  let logger;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      outputMode: 'console',
      ui: {
        reportSeparator: '============================================',
        diagnosticsEmojis: {
          success: '✅',
          failure: '❌',
          warning: '⚠️',
          info: '📋',
          alarm: '🚨'
        }
      }
    };

    logger = new StructuredLogger(mockConfig);
    
    // Mock console.log to capture output
    jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default config', () => {
      const defaultLogger = new StructuredLogger();
      expect(defaultLogger.outputMode).toBe('console');
    });

    test('should initialize with provided config', () => {
      expect(logger.outputMode).toBe('console');
      expect(logger.config).toBe(mockConfig);
    });
  });

  describe('logStructured', () => {
    test('should log diagnostic report in console mode', () => {
      const mockDiagnostics = {
        timestamp: '2023-01-01T00:00:00.000Z',
        machineStatus: { parsed: { state: 'Idle', position: { x: 0, y: 0, z: 0 } } },
        grblSettings: { parsed: { 20: 1, 21: 1, 22: 1 } },
        testMovements: [
          { command: 'G0 X1', success: true, duration: 100 },
          { command: 'G0 X0', success: true, duration: 95 }
        ],
        recommendations: ['Machine appears operational']
      };

      const reportData = createDiagnosticReport(mockDiagnostics);
      const result = logger.logStructured(reportData);

      expect(console.log).toHaveBeenCalled();
      expect(result).toBe(reportData);
      expect(result.type).toBe('diagnostic_report');
    });

    test('should return structured data in API mode', () => {
      logger.config.outputMode = 'api';
      
      const reportData = {
        type: 'test_report',
        timestamp: '2023-01-01T00:00:00.000Z',
        data: { test: 'value' }
      };

      const result = logger.logStructured(reportData);

      // In API mode, should just return the data without console logging
      expect(result).toBe(reportData);
      expect(console.log).not.toHaveBeenCalled();
    });

    test('should log as JSON in json mode', () => {
      logger.config.outputMode = 'json';
      
      const reportData = {
        type: 'test_report',
        data: { test: 'value' }
      };

      const result = logger.logStructured(reportData);

      expect(console.log).toHaveBeenCalledWith(JSON.stringify(reportData, null, 2));
      expect(result).toBe(reportData);
    });
  });

  describe('registerFormatter', () => {
    test('should register custom formatter', () => {
      const customFormatter = jest.fn();
      logger.registerFormatter('custom_type', customFormatter);

      const reportData = { type: 'custom_type', data: 'test' };
      logger.logStructured(reportData);

      expect(customFormatter).toHaveBeenCalledWith(reportData);
    });
  });
});

describe('createDiagnosticReport', () => {
  test('should create structured diagnostic report', () => {
    const mockDiagnostics = {
      timestamp: '2023-01-01T00:00:00.000Z',
      machineStatus: { parsed: { state: 'Idle', position: { x: 0, y: 0, z: 0 } } },
      grblSettings: { parsed: { 20: 1, 21: 1, 22: 1, 130: 200, 131: 200, 132: 200 } },
      testMovements: [
        { command: 'G0 X1', success: true, duration: 100 }
      ],
      recommendations: ['Test recommendation'],
      errors: []
    };

    const report = createDiagnosticReport(mockDiagnostics);

    expect(report.type).toBe('diagnostic_report');
    expect(report.machineStatus.state).toBe('Idle');
    expect(report.grblSettings.count).toBe(6);
    expect(report.movementTests).toHaveLength(1);
    expect(report.recommendations).toContain('Test recommendation');
  });
});

describe('createAlarmReport', () => {
  test('should create structured alarm report', () => {
    const mockAlarmAnalysis = {
      alarmDetected: true,
      alarmType: 1,
      description: 'Hard limit triggered',
      possibleCauses: ['Machine moved beyond limits'],
      recoverySteps: ['Use $X to unlock', 'Check position']
    };

    const report = createAlarmReport(mockAlarmAnalysis);

    expect(report.type).toBe('alarm_report');
    expect(report.alarmDetected).toBe(true);
    expect(report.alarmType).toBe(1);
    expect(report.description).toBe('Hard limit triggered');
    expect(report.possibleCauses).toContain('Machine moved beyond limits');
    expect(report.recoverySteps).toContain('Use $X to unlock');
  });
});