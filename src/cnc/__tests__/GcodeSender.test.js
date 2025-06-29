/**
 * GcodeSender Tests
 * 
 * Tests for the main GcodeSender orchestrator class following TDD principles.
 * Tests the orchestration of all modules and backward compatibility.
 */

// Mock all module dependencies before importing
jest.mock('../connection/index.js');
jest.mock('../commands/index.js');
jest.mock('../queries/index.js');
jest.mock('../files/index.js');
jest.mock('../diagnostics/index.js');
jest.mock('../alarms/index.js');
jest.mock('../config.js', () => ({
  Config: {
    get: jest.fn(() => ({
      timeouts: {
        command: 5000,
        connection: 10000
      },
      defaultPort: '/dev/ttyUSB0',
      serialPort: {
        baudRate: 115200
      }
    }))
  }
}));
jest.mock('../../lib/logger/index.js');
jest.mock('../../lib/helpers/index.js');

import { GcodeSender } from '../GcodeSender.js';
import { ConnectionManager } from '../connection/index.js';
import { CommandExecutor } from '../commands/index.js';
import { QueryManager } from '../queries/index.js';
import { FileProcessor } from '../files/index.js';
import { DiagnosticsManager } from '../diagnostics/index.js';
import { AlarmManager } from '../alarms/index.js';
import { Config } from '../config.js';
import { log } from '../../lib/logger/index.js';
import { handleResponse, parseResponse, categorizeResponse } from '../../lib/helpers/index.js';

describe('GcodeSender', () => {
  let gcodeSender;
  let mockConfig;
  let mockConnectionManager;
  let mockCommandExecutor;
  let mockQueryManager;
  let mockFileProcessor;
  let mockDiagnosticsManager;
  let mockAlarmManager;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      timeouts: {
        command: 5000,
        connection: 10000
      },
      defaultPort: '/dev/ttyUSB0',
      serialPort: {
        baudRate: 115200
      }
    };
    Config.get.mockReturnValue(mockConfig);

    // Mock module managers
    mockConnectionManager = {
      getAvailablePorts: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      isPortConnected: jest.fn(),
      getConnectionStatus: jest.fn(),
      setupDataHandler: jest.fn(),
      getPort: jest.fn()
    };
    ConnectionManager.mockImplementation(() => mockConnectionManager);

    mockCommandExecutor = {
      sendGcode: jest.fn(),
      emergencyStop: jest.fn(),
      getResponseCallbacks: jest.fn()
    };
    CommandExecutor.mockImplementation(() => mockCommandExecutor);

    mockQueryManager = {
      getStatus: jest.fn(),
      queryMachineStatus: jest.fn(),
      queryGrblSettings: jest.fn(),
      queryCoordinateSystems: jest.fn(),
      queryParserState: jest.fn(),
      getLimitsInfo: jest.fn(),
      displayLimitsInfo: jest.fn()
    };
    QueryManager.mockImplementation(() => mockQueryManager);

    mockFileProcessor = {
      executeGcodeFile: jest.fn(),
      validateGcodeFile: jest.fn(),
      getFileStats: jest.fn()
    };
    FileProcessor.mockImplementation(() => mockFileProcessor);

    mockDiagnosticsManager = {
      testSmallMovements: jest.fn(),
      generateDiagnosticReport: jest.fn(),
      analyzeHomingRequirements: jest.fn(),
      runComprehensiveDiagnostics: jest.fn(),
      calculateHealthScore: jest.fn()
    };
    DiagnosticsManager.mockImplementation(() => mockDiagnosticsManager);

    mockAlarmManager = {
      performAlarmAnalysis: jest.fn(),
      testAlarmTriggers: jest.fn(),
      analyzeAlarmDiagnostics: jest.fn(),
      generateAlarmDiagnosticReport: jest.fn(),
      executeAlarmRecovery: jest.fn()
    };
    AlarmManager.mockImplementation(() => mockAlarmManager);

    // Create GcodeSender instance
    gcodeSender = new GcodeSender();
  });

  describe('constructor', () => {
    test('should initialize all module managers with config', () => {
      expect(ConnectionManager).toHaveBeenCalledWith(mockConfig);
      expect(CommandExecutor).toHaveBeenCalledWith(mockConfig);
      expect(QueryManager).toHaveBeenCalledWith(mockConfig);
      expect(FileProcessor).toHaveBeenCalledWith(mockConfig);
      expect(DiagnosticsManager).toHaveBeenCalledWith(mockConfig);
      expect(AlarmManager).toHaveBeenCalledWith(mockConfig);
    });

    test('should initialize backward compatibility properties', () => {
      expect(gcodeSender.isConnected).toBe(false);
      expect(gcodeSender.currentPort).toBeNull();
    });

    test('should store references to all managers', () => {
      expect(gcodeSender.connectionManager).toBeDefined();
      expect(gcodeSender.commandExecutor).toBeDefined();
      expect(gcodeSender.queryManager).toBeDefined();
      expect(gcodeSender.fileProcessor).toBeDefined();
      expect(gcodeSender.diagnosticsManager).toBeDefined();
      expect(gcodeSender.alarmManager).toBeDefined();
    });
  });

  describe('log', () => {
    test('should delegate to logger service', () => {
      const message = 'Test message';
      const data = { test: 'data' };
      const level = 'error';

      gcodeSender.log(message, data, level);

      expect(log).toHaveBeenCalledWith(message, data, level);
    });

    test('should use default level when not specified', () => {
      const message = 'Test message';

      gcodeSender.log(message);

      expect(log).toHaveBeenCalledWith(message, null, 'log');
    });
  });

  describe('Connection Management', () => {
    describe('getAvailablePorts', () => {
      test('should delegate to ConnectionManager', async () => {
        const mockPorts = [{ path: '/dev/ttyUSB0', manufacturer: 'Arduino' }];
        mockConnectionManager.getAvailablePorts.mockResolvedValue(mockPorts);

        const result = await gcodeSender.getAvailablePorts();

        expect(mockConnectionManager.getAvailablePorts).toHaveBeenCalled();
        expect(result).toEqual(mockPorts);
      });
    });

    describe('connect', () => {
      test('should connect and update compatibility properties', async () => {
        const portPath = '/dev/ttyUSB0';
        const options = { baudRate: 115200 };
        const mockResult = { success: true, port: portPath };
        
        mockConnectionManager.connect.mockResolvedValue(mockResult);
        mockConnectionManager.isPortConnected.mockReturnValue(true);
        mockConnectionManager.getConnectionStatus.mockReturnValue({ port: portPath });
        mockCommandExecutor.getResponseCallbacks.mockReturnValue(new Map());

        const result = await gcodeSender.connect(portPath, options);

        expect(mockConnectionManager.connect).toHaveBeenCalledWith(portPath, options);
        expect(mockConnectionManager.setupDataHandler).toHaveBeenCalled();
        expect(gcodeSender.isConnected).toBe(true);
        expect(gcodeSender.currentPort).toBe(portPath);
        expect(result).toEqual(mockResult);
      });

      test('should setup data handler for responses', async () => {
        const portPath = '/dev/ttyUSB0';
        mockConnectionManager.connect.mockResolvedValue({ success: true });
        mockConnectionManager.isPortConnected.mockReturnValue(true);
        mockConnectionManager.getConnectionStatus.mockReturnValue({ port: portPath });
        mockCommandExecutor.getResponseCallbacks.mockReturnValue(new Map());

        await gcodeSender.connect(portPath);

        expect(mockConnectionManager.setupDataHandler).toHaveBeenCalledWith(expect.any(Function));
        
        // Test the data handler function
        const dataHandler = mockConnectionManager.setupDataHandler.mock.calls[0][0];
        const testData = 'ok';
        
        dataHandler(testData);
        
        expect(handleResponse).toHaveBeenCalledWith(
          expect.any(Map),
          log,
          expect.any(Function),
          testData
        );
      });
    });

    describe('disconnect', () => {
      test('should disconnect and reset compatibility properties', async () => {
        const mockResult = { success: true };
        mockConnectionManager.disconnect.mockResolvedValue(mockResult);

        // First connect to have something to disconnect from
        gcodeSender.isConnected = true;
        gcodeSender.currentPort = '/dev/ttyUSB0';

        const result = await gcodeSender.disconnect();

        expect(mockConnectionManager.disconnect).toHaveBeenCalled();
        expect(gcodeSender.isConnected).toBe(false);
        expect(gcodeSender.currentPort).toBeNull();
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe('Command Execution', () => {
    describe('sendGcode', () => {
      test('should delegate to CommandExecutor with connection info', async () => {
        const gcode = 'G1 X10 Y10';
        const timeout = 3000;
        const mockPort = {};
        const mockResult = { success: true, response: 'ok' };

        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockCommandExecutor.sendGcode.mockResolvedValue(mockResult);
        gcodeSender.isConnected = true;

        const result = await gcodeSender.sendGcode(gcode, timeout);

        expect(mockCommandExecutor.sendGcode).toHaveBeenCalledWith(
          mockPort,
          true,
          gcode,
          timeout
        );
        expect(result).toEqual(mockResult);
      });

      test('should use default timeout when not specified', async () => {
        const gcode = 'G1 X10 Y10';
        const mockPort = {};
        
        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockCommandExecutor.sendGcode.mockResolvedValue({ success: true });
        gcodeSender.isConnected = true;

        await gcodeSender.sendGcode(gcode);

        expect(mockCommandExecutor.sendGcode).toHaveBeenCalledWith(
          mockPort,
          true,
          gcode,
          mockConfig.timeouts.command
        );
      });
    });

    describe('emergencyStop', () => {
      test('should delegate to CommandExecutor', async () => {
        const mockPort = {};
        const mockResult = { success: true };

        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockCommandExecutor.emergencyStop.mockResolvedValue(mockResult);
        gcodeSender.isConnected = true;

        const result = await gcodeSender.emergencyStop();

        expect(mockCommandExecutor.emergencyStop).toHaveBeenCalledWith(mockPort, true);
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe('Query Operations', () => {
    describe('getStatus', () => {
      test('should delegate to QueryManager with current state', () => {
        const mockStatus = { connected: true, port: '/dev/ttyUSB0' };
        const mockCallbacks = new Map();
        
        mockCommandExecutor.getResponseCallbacks.mockReturnValue(mockCallbacks);
        mockQueryManager.getStatus.mockReturnValue(mockStatus);
        
        gcodeSender.isConnected = true;
        gcodeSender.currentPort = '/dev/ttyUSB0';

        const result = gcodeSender.getStatus();

        expect(mockQueryManager.getStatus).toHaveBeenCalledWith(
          true,
          '/dev/ttyUSB0',
          mockCallbacks
        );
        expect(result).toEqual(mockStatus);
      });
    });

    describe('queryMachineStatus', () => {
      test('should delegate to QueryManager', async () => {
        const mockStatus = { state: 'Idle', position: { x: 0, y: 0, z: 0 } };
        const mockPort = {};

        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockQueryManager.queryMachineStatus.mockResolvedValue(mockStatus);
        gcodeSender.isConnected = true;

        const result = await gcodeSender.queryMachineStatus();

        expect(mockQueryManager.queryMachineStatus).toHaveBeenCalledWith(
          mockCommandExecutor,
          mockPort,
          true
        );
        expect(result).toEqual(mockStatus);
      });
    });
  });

  describe('File Operations', () => {
    describe('executeGcodeFile', () => {
      test('should delegate to FileProcessor', async () => {
        const filePath = '/path/to/file.gcode';
        const mockResult = { success: true, linesExecuted: 100 };
        const mockPort = {};

        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockFileProcessor.executeGcodeFile.mockResolvedValue(mockResult);
        gcodeSender.isConnected = true;

        const result = await gcodeSender.executeGcodeFile(filePath);

        expect(mockFileProcessor.executeGcodeFile).toHaveBeenCalledWith(
          filePath,
          mockCommandExecutor,
          mockPort,
          true
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('validateGcodeFile', () => {
      test('should delegate to FileProcessor', () => {
        const filePath = '/path/to/file.gcode';
        const mockResult = { valid: true, lineCount: 100 };

        mockFileProcessor.validateGcodeFile.mockReturnValue(mockResult);

        const result = gcodeSender.validateGcodeFile(filePath);

        expect(mockFileProcessor.validateGcodeFile).toHaveBeenCalledWith(filePath);
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe('Diagnostics', () => {
    describe('testSmallMovements', () => {
      test('should delegate to DiagnosticsManager', async () => {
        const mockResult = { success: true, tests: [] };
        const mockPort = {};

        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockDiagnosticsManager.testSmallMovements.mockResolvedValue(mockResult);
        gcodeSender.isConnected = true;

        const result = await gcodeSender.testSmallMovements();

        expect(mockDiagnosticsManager.testSmallMovements).toHaveBeenCalledWith(
          mockCommandExecutor,
          mockPort,
          true
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('runComprehensiveDiagnostics', () => {
      test('should coordinate all diagnostic modules', async () => {
        const mockResult = { overall: 'healthy', details: {} };
        const mockPort = {};

        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockDiagnosticsManager.runComprehensiveDiagnostics.mockResolvedValue(mockResult);
        gcodeSender.isConnected = true;

        const result = await gcodeSender.runComprehensiveDiagnostics();

        expect(mockDiagnosticsManager.runComprehensiveDiagnostics).toHaveBeenCalledWith(
          mockQueryManager,
          mockCommandExecutor,
          mockPort,
          true
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('getMachineHealthScore', () => {
      test('should run diagnostics and calculate health score', async () => {
        const mockDiagnostics = { tests: [], overall: 'good' };
        const mockScore = 85;

        mockDiagnosticsManager.runComprehensiveDiagnostics.mockResolvedValue(mockDiagnostics);
        mockDiagnosticsManager.calculateHealthScore.mockReturnValue(mockScore);

        const result = await gcodeSender.getMachineHealthScore();

        expect(mockDiagnosticsManager.runComprehensiveDiagnostics).toHaveBeenCalled();
        expect(mockDiagnosticsManager.calculateHealthScore).toHaveBeenCalledWith(mockDiagnostics);
        expect(result).toBe(mockScore);
      });
    });
  });

  describe('Alarm Management', () => {
    describe('performAlarmAnalysis', () => {
      test('should delegate to AlarmManager', async () => {
        const diagnostics = { alarms: [], errors: [] };
        const mockResult = { analysis: 'no alarms detected' };

        mockAlarmManager.performAlarmAnalysis.mockResolvedValue(mockResult);

        const result = await gcodeSender.performAlarmAnalysis(diagnostics);

        expect(mockAlarmManager.performAlarmAnalysis).toHaveBeenCalledWith(diagnostics);
        expect(result).toEqual(mockResult);
      });
    });

    describe('executeAlarmRecovery', () => {
      test('should delegate to AlarmManager with connection info', async () => {
        const alarmType = 'HARD_LIMIT';
        const mockResult = { success: true, steps: [] };
        const mockPort = {};

        mockConnectionManager.getPort.mockReturnValue(mockPort);
        mockAlarmManager.executeAlarmRecovery.mockResolvedValue(mockResult);
        gcodeSender.isConnected = true;

        const result = await gcodeSender.executeAlarmRecovery(alarmType);

        expect(mockAlarmManager.executeAlarmRecovery).toHaveBeenCalledWith(
          alarmType,
          mockCommandExecutor,
          mockPort,
          true
        );
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should maintain consistency between connection state and queries', async () => {
      const portPath = '/dev/ttyUSB0';
      
      // Mock successful connection
      mockConnectionManager.connect.mockResolvedValue({ success: true });
      mockConnectionManager.isPortConnected.mockReturnValue(true);
      mockConnectionManager.getConnectionStatus.mockReturnValue({ port: portPath });
      mockCommandExecutor.getResponseCallbacks.mockReturnValue(new Map());

      await gcodeSender.connect(portPath);

      // Verify state consistency
      expect(gcodeSender.isConnected).toBe(true);
      expect(gcodeSender.currentPort).toBe(portPath);

      // Check that status query uses correct state
      const mockStatus = { connected: true, port: portPath };
      mockQueryManager.getStatus.mockReturnValue(mockStatus);

      const status = gcodeSender.getStatus();

      expect(mockQueryManager.getStatus).toHaveBeenCalledWith(
        true,
        portPath,
        expect.any(Map)
      );
    });

    test('should handle connection failure gracefully', async () => {
      const portPath = '/dev/ttyUSB0';
      const error = new Error('Connection failed');
      
      mockConnectionManager.connect.mockRejectedValue(error);

      await expect(gcodeSender.connect(portPath)).rejects.toThrow('Connection failed');

      // Verify state remains disconnected
      expect(gcodeSender.isConnected).toBe(false);
      expect(gcodeSender.currentPort).toBeNull();
    });
  });
});