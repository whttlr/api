/**
 * QueryManager Tests
 * 
 * Tests for machine status queries, GRBL settings, coordinate systems, and limits.
 * Following TDD principles with comprehensive coverage of query operations.
 */

import { QueryManager } from '../QueryManager.js';
import i18n from '../../../i18n.js';
import { log, info } from '../../../lib/logger/LoggerService.js';

describe('QueryManager', () => {
  let queryManager;
  let mockConfig;
  let mockCommandExecutor;
  let mockPort;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      ui: {
        reportSeparator: '========================================',
        queryReportTitle: 'Machine Query Report'
      }
    };

    // Mock command executor
    mockCommandExecutor = {
      createCommandWrapper: jest.fn()
    };

    // Mock port
    mockPort = { write: jest.fn(), isOpen: true };

    // Mock i18n
    i18n.t = jest.fn((key, params) => 
      params ? `${key}_${JSON.stringify(params)}` : key
    );

    queryManager = new QueryManager(mockConfig);
  });

  describe('constructor', () => {
    test('should initialize with config', () => {
      expect(queryManager.config).toBe(mockConfig);
    });

    test('should initialize with empty config', () => {
      const emptyQueryManager = new QueryManager({});
      expect(emptyQueryManager.config).toEqual({});
    });

    test('should initialize with null config', () => {
      const nullQueryManager = new QueryManager(null);
      expect(nullQueryManager.config).toBeNull();
    });
  });

  describe('createQueryWrapper', () => {
    test('should create query wrapper with command executor', () => {
      const mockWrapper = jest.fn();
      mockCommandExecutor.createCommandWrapper.mockReturnValue(mockWrapper);

      const queryWrapper = queryManager.createQueryWrapper(mockCommandExecutor, mockPort, true);

      expect(mockCommandExecutor.createCommandWrapper).toHaveBeenCalledWith(mockPort, true);
      expect(queryWrapper).toBe(mockWrapper);
    });

    test('should pass through gcode and timeout parameters', () => {
      const mockWrapper = jest.fn();
      mockCommandExecutor.createCommandWrapper.mockReturnValue(mockWrapper);

      const queryWrapper = queryManager.createQueryWrapper(mockCommandExecutor, mockPort, true);
      queryWrapper('G0 X10', 5000);

      expect(mockWrapper).toHaveBeenCalledWith('G0 X10', 5000);
    });

    test('should handle disconnected state', () => {
      const mockWrapper = jest.fn();
      mockCommandExecutor.createCommandWrapper.mockReturnValue(mockWrapper);

      const queryWrapper = queryManager.createQueryWrapper(mockCommandExecutor, mockPort, false);

      expect(mockCommandExecutor.createCommandWrapper).toHaveBeenCalledWith(mockPort, false);
    });

    test('should work with multiple query wrappers', () => {
      const mockWrapper1 = jest.fn();
      const mockWrapper2 = jest.fn();
      mockCommandExecutor.createCommandWrapper
        .mockReturnValueOnce(mockWrapper1)
        .mockReturnValueOnce(mockWrapper2);

      const wrapper1 = queryManager.createQueryWrapper(mockCommandExecutor, mockPort, true);
      const wrapper2 = queryManager.createQueryWrapper(mockCommandExecutor, mockPort, false);

      expect(mockCommandExecutor.createCommandWrapper).toHaveBeenCalledTimes(2);
      expect(mockCommandExecutor.createCommandWrapper).toHaveBeenNthCalledWith(1, mockPort, true);
      expect(mockCommandExecutor.createCommandWrapper).toHaveBeenNthCalledWith(2, mockPort, false);
      expect(wrapper1).toBe(mockWrapper1);
      expect(wrapper2).toBe(mockWrapper2);
    });
  });

  describe('generateQueryReport', () => {
    test('should generate comprehensive query report', () => {
      const queryResults = {
        timestamp: '2023-01-01T12:00:00.000Z',
        machineStatus: {
          parsed: { state: 'Idle', position: { x: 10, y: 20, z: 5 } }
        },
        grblSettings: {
          parsed: { 0: 10, 1: 25, 2: 0 }
        },
        coordinateSystems: {
          parsed: { G54: { x: 0, y: 0, z: 0 } }
        },
        parserState: {
          parsed: { mode: 'G0' }
        },
        limitsInfo: {
          softLimitsEnabled: true
        },
        errors: []
      };

      const result = queryManager.generateQueryReport(queryResults);

      expect(i18n.t).toHaveBeenCalledWith('queryManager.reportHeader', { reportTitle: 'Machine Query Report' });
      expect(i18n.t).toHaveBeenCalledWith('queryManager.timestamp', { timestamp: '2023-01-01T12:00:00.000Z' });
      expect(i18n.t).toHaveBeenCalledWith('queryManager.state', { state: 'Idle' });
      expect(i18n.t).toHaveBeenCalledWith('queryManager.position', { x: 10, y: 20, z: 5 });
      expect(i18n.t).toHaveBeenCalledWith('queryManager.settingsRetrieved', { count: 3 });
      expect(i18n.t).toHaveBeenCalledWith('queryManager.limitsInfoAvailable');
      expect(result).toBe(queryResults);
    });

    test('should handle missing parsed data gracefully', () => {
      const queryResults = {
        timestamp: '2023-01-01T12:00:00.000Z',
        machineStatus: { raw: 'unparsed data' },
        grblSettings: { raw: ['$0=10'] },
        coordinateSystems: null,
        parserState: null,
        limitsInfo: null,
        errors: ['Error 1', 'Error 2']
      };

      queryManager.generateQueryReport(queryResults);

      expect(i18n.t).toHaveBeenCalledWith('queryManager.failedToParseMachineStatus');
      expect(i18n.t).toHaveBeenCalledWith('queryManager.failedToParseGrblSettings');
      expect(i18n.t).toHaveBeenCalledWith('queryManager.errorsHeader');
      expect(i18n.t).toHaveBeenCalledWith('queryManager.errorItem', { error: 'Error 1' });
      expect(i18n.t).toHaveBeenCalledWith('queryManager.errorItem', { error: 'Error 2' });
    });

    test('should use default config when ui config missing', () => {
      queryManager.config = {};
      const queryResults = {
        timestamp: '2023-01-01T12:00:00.000Z',
        machineStatus: null,
        grblSettings: null,
        coordinateSystems: null,
        parserState: null,
        limitsInfo: null,
        errors: []
      };

      queryManager.generateQueryReport(queryResults);

      expect(i18n.t).toHaveBeenCalledWith('queryManager.reportTitle');
    });

    test('should handle empty query results', () => {
      const queryResults = {
        timestamp: '2023-01-01T12:00:00.000Z',
        machineStatus: null,
        grblSettings: null,
        coordinateSystems: null,
        parserState: null,
        limitsInfo: null,
        errors: []
      };

      const result = queryManager.generateQueryReport(queryResults);

      expect(i18n.t).toHaveBeenCalledWith('queryManager.errorsCount', { count: 0 });
      expect(result).toBe(queryResults);
    });

    test('should handle missing position data', () => {
      const queryResults = {
        timestamp: '2023-01-01T12:00:00.000Z',
        machineStatus: {
          parsed: { state: 'Idle' } // No position data
        },
        grblSettings: null,
        coordinateSystems: null,
        parserState: null,
        limitsInfo: null,
        errors: []
      };

      queryManager.generateQueryReport(queryResults);

      expect(i18n.t).toHaveBeenCalledWith('queryManager.state', { state: 'Idle' });
      expect(i18n.t).not.toHaveBeenCalledWith('queryManager.position', expect.any(Object));
    });

    test('should use custom separator and title from config', () => {
      mockConfig.ui.reportSeparator = '*********************';
      mockConfig.ui.queryReportTitle = 'Custom Query Report';
      queryManager = new QueryManager(mockConfig);

      const queryResults = {
        timestamp: '2023-01-01T12:00:00.000Z',
        machineStatus: null,
        grblSettings: null,
        coordinateSystems: null,
        parserState: null,
        limitsInfo: null,
        errors: []
      };

      queryManager.generateQueryReport(queryResults);

      expect(i18n.t).toHaveBeenCalledWith('queryManager.reportHeader', { reportTitle: 'Custom Query Report' });
    });
  });

  describe('Error Handling', () => {
    test('should handle null command executor gracefully', () => {
      expect(() => 
        queryManager.createQueryWrapper(null, mockPort, false)
      ).not.toThrow();
    });

    test('should handle null port gracefully', () => {
      expect(() => 
        queryManager.createQueryWrapper(mockCommandExecutor, null, false)
      ).not.toThrow();
    });

    test('should handle generateQueryReport with minimal data', () => {
      const minimalResults = {
        timestamp: '2023-01-01T12:00:00.000Z',
        errors: []
      };

      expect(() => 
        queryManager.generateQueryReport(minimalResults)
      ).not.toThrow();
    });

    test('should handle generateQueryReport with null timestamp', () => {
      const queryResults = {
        timestamp: null,
        machineStatus: null,
        grblSettings: null,
        coordinateSystems: null,
        parserState: null,
        limitsInfo: null,
        errors: []
      };

      expect(() => 
        queryManager.generateQueryReport(queryResults)
      ).not.toThrow();

      expect(i18n.t).toHaveBeenCalledWith('queryManager.timestamp', { timestamp: null });
    });
  });

  describe('runFullQuery Interface', () => {
    test('should have runFullQuery method', () => {
      expect(typeof queryManager.runFullQuery).toBe('function');
    });

    test('should return promise from runFullQuery', () => {
      const result = queryManager.runFullQuery(mockCommandExecutor, mockPort, true);
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to prevent hanging
      result.catch(() => {});
    });
  });

  describe('Query Method Interfaces', () => {
    test('should have queryMachineStatus method', () => {
      expect(typeof queryManager.queryMachineStatus).toBe('function');
    });

    test('should have queryGrblSettings method', () => {
      expect(typeof queryManager.queryGrblSettings).toBe('function');
    });

    test('should have queryCoordinateSystems method', () => {
      expect(typeof queryManager.queryCoordinateSystems).toBe('function');
    });

    test('should have queryParserState method', () => {
      expect(typeof queryManager.queryParserState).toBe('function');
    });

    test('should have getLimitsInfo method', () => {
      expect(typeof queryManager.getLimitsInfo).toBe('function');
    });

    test('should have displayLimitsInfo method', () => {
      expect(typeof queryManager.displayLimitsInfo).toBe('function');
    });

    test('should have getStatus method', () => {
      expect(typeof queryManager.getStatus).toBe('function');
    });
  });

  describe('Integration Test Structure', () => {
    test('should maintain proper method signatures', () => {
      // Test that methods have expected parameter counts
      expect(queryManager.createQueryWrapper.length).toBe(3);
      expect(queryManager.queryMachineStatus.length).toBe(3);
      expect(queryManager.queryGrblSettings.length).toBe(3);
      expect(queryManager.queryCoordinateSystems.length).toBe(3);
      expect(queryManager.queryParserState.length).toBe(3);
      expect(queryManager.getLimitsInfo.length).toBe(3);
      expect(queryManager.displayLimitsInfo.length).toBe(1);
      expect(queryManager.getStatus.length).toBe(3);
      expect(queryManager.runFullQuery.length).toBe(3);
      expect(queryManager.generateQueryReport.length).toBe(1);
    });

    test('should maintain consistent API interface', () => {
      // Verify that all expected methods exist and are functions
      const expectedMethods = [
        'createQueryWrapper',
        'queryMachineStatus',
        'queryGrblSettings',
        'queryCoordinateSystems',
        'queryParserState',
        'getLimitsInfo',
        'displayLimitsInfo',
        'getStatus',
        'runFullQuery',
        'generateQueryReport'
      ];

      expectedMethods.forEach(methodName => {
        expect(queryManager[methodName]).toBeDefined();
        expect(typeof queryManager[methodName]).toBe('function');
      });
    });

    test('should handle config variations', () => {
      // Test with different config structures
      const configs = [
        {},
        { ui: {} },
        { ui: { reportSeparator: '---' } },
        { ui: { queryReportTitle: 'Test' } },
        null,
        undefined
      ];

      configs.forEach(config => {
        expect(() => new QueryManager(config)).not.toThrow();
      });
    });
  });
});