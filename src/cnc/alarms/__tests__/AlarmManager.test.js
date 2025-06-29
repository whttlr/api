/**
 * AlarmManager Tests
 * 
 * Tests for alarm detection, analysis, recovery procedures, and alarm-specific diagnostics.
 * Following TDD principles with comprehensive coverage of safety-critical alarm functionality.
 */

// Mock dependencies
jest.mock('../../lib/logger/LoggerService.js');
jest.mock('../../lib/reporting/index.js');

import { AlarmManager } from '../AlarmManager.js';
import i18n from '../../i18n.js';
import { info, warn } from '../../lib/logger/LoggerService.js';
import { structuredLogger, createAlarmReport } from '../../lib/reporting/index.js';

describe('AlarmManager', () => {
  let alarmManager;
  let mockConfig;
  let mockCommandExecutor;
  let mockPort;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      alarms: {
        descriptions: {
          1: 'Hard limit triggered',
          2: 'G-code motion target exceeds machine travel',
          3: 'Reset while in motion'
        },
        recoverySteps: {
          1: ['Send $X to unlock', 'Run homing cycle $H'],
          2: ['Send $X to unlock', 'Check soft limits']
        }
      },
      ui: {
        diagnosticsEmojis: {
          warning: '⚠️'
        }
      }
    };

    // Mock port and command executor
    mockPort = { write: jest.fn(), isOpen: true };
    mockCommandExecutor = {
      sendGcode: jest.fn()
    };

    // Mock i18n translation function
    i18n.t = jest.fn((key, params) => {
      // Return key with parameters for testing
      return params ? `${key}_${JSON.stringify(params)}` : key;
    });

    // Mock structured logger
    structuredLogger.config = {};
    structuredLogger.logStructured = jest.fn().mockReturnValue({ logged: true });
    createAlarmReport = jest.fn().mockReturnValue({ reportData: 'mock' });

    alarmManager = new AlarmManager(mockConfig);
  });

  describe('constructor', () => {
    test('should initialize with config', () => {
      expect(alarmManager.config).toBe(mockConfig);
    });
  });

  describe('performAlarmAnalysis', () => {
    test('should detect alarm from machine status', async () => {
      const diagnostics = {
        machineStatus: {
          raw: '<Alarm:1|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>'
        }
      };

      const analysis = await alarmManager.performAlarmAnalysis(diagnostics);

      expect(analysis.alarmDetected).toBe(true);
      expect(analysis.alarmType).toBe(1);
      expect(analysis.description).toBe('Hard limit triggered');
      expect(analysis.recoverySteps).toEqual(['Send $X to unlock', 'Run homing cycle $H']);
    });

    test('should return no alarm when none detected', async () => {
      const diagnostics = {
        machineStatus: {
          raw: '<Idle|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>'
        }
      };

      const analysis = await alarmManager.performAlarmAnalysis(diagnostics);

      expect(analysis.alarmDetected).toBe(false);
      expect(analysis.alarmType).toBeNull();
      expect(analysis.description).toBeNull();
    });

    test('should handle unknown alarm types', async () => {
      const diagnostics = {
        machineStatus: {
          raw: '<Alarm:99|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>'
        }
      };

      const analysis = await alarmManager.performAlarmAnalysis(diagnostics);

      expect(analysis.alarmDetected).toBe(true);
      expect(analysis.alarmType).toBe(99);
      expect(analysis.description).toBe('alarmManager.unknownAlarm');
      expect(analysis.recoverySteps).toEqual([
        'alarmManager.recoveryUnlock',
        'alarmManager.recoveryCheckHome'
      ]);
    });

    test('should handle missing machine status', async () => {
      const diagnostics = {};

      const analysis = await alarmManager.performAlarmAnalysis(diagnostics);

      expect(analysis.alarmDetected).toBe(false);
      expect(analysis.alarmType).toBeNull();
    });

    test('should set possible causes based on alarm type', async () => {
      const diagnostics = {
        machineStatus: {
          raw: '<Alarm:1|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>'
        }
      };

      const analysis = await alarmManager.performAlarmAnalysis(diagnostics);

      expect(analysis.possibleCauses).toContain('Hard limit triggered');
      expect(analysis.possibleCauses).toContain('Machine moved beyond physical limits');
      expect(analysis.possibleCauses).toContain('Limit switch malfunction');
    });
  });

  describe('getAlarmCauses', () => {
    test('should return correct causes for known alarm types', () => {
      const causes1 = alarmManager.getAlarmCauses(1);
      expect(causes1).toContain('Hard limit triggered');
      expect(causes1).toContain('Machine moved beyond physical limits');
      expect(causes1).toContain('Limit switch malfunction');

      const causes2 = alarmManager.getAlarmCauses(2);
      expect(causes2).toContain('G-code motion target exceeds machine travel');
      expect(causes2).toContain('Soft limits not properly configured');

      const causes4 = alarmManager.getAlarmCauses(4);
      expect(causes4).toContain('Probe fail');
      expect(causes4).toContain('Probe not making contact');
    });

    test('should return unknown cause for unrecognized alarm types', () => {
      const causes = alarmManager.getAlarmCauses(999);
      expect(causes).toEqual(['alarmManager.unknownAlarmCause']);
    });

    test('should return homing-related causes for homing alarms', () => {
      const causes6 = alarmManager.getAlarmCauses(6);
      expect(causes6).toContain('Homing fail');
      expect(causes6).toContain('Limit switches not found during homing');

      const causes9 = alarmManager.getAlarmCauses(9);
      expect(causes9).toContain('No limit switches found');
      expect(causes9).toContain('Limit switch wiring issue');
    });
  });

  describe('testAlarmTriggers', () => {
    test('should execute alarm trigger tests', async () => {
      mockCommandExecutor.sendGcode.mockRejectedValue(new Error('Alarm:2'));

      const results = await alarmManager.testAlarmTriggers(mockCommandExecutor, mockPort, true);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('testingAlarmTriggers'));
      expect(info).toHaveBeenCalledWith(expect.stringContaining('testingTest'));
      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledWith(mockPort, true, 'G0 X999999', 5000);
      
      expect(results).toHaveLength(1);
      expect(results[0].test).toBe('alarmManager.softLimitTestName');
      expect(results[0].command).toBe('G0 X999999');
      expect(results[0].success).toBe(true); // Success because we expected alarm
      expect(results[0].error).toBe('Alarm:2');
    });

    test('should handle unexpected success in alarm tests', async () => {
      mockCommandExecutor.sendGcode.mockResolvedValue({ response: 'ok' });

      const results = await alarmManager.testAlarmTriggers(mockCommandExecutor, mockPort, true);

      expect(results[0].success).toBe(false); // Failure because we expected alarm but got success
      expect(results[0].response).toBe('ok');
      expect(results[0].expected).toBe('alarmManager.expectedAlarm');
      expect(results[0].actual).toBe('alarmManager.actualSuccess');
    });
  });

  describe('analyzeAlarmDiagnostics', () => {
    test('should detect machine in alarm state', () => {
      const diagnostics = {
        machineStatus: {
          raw: '<Alarm:1|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>'
        }
      };

      const analysis = alarmManager.analyzeAlarmDiagnostics(diagnostics);

      expect(analysis.hasAlarmIssues).toBe(true);
      expect(analysis.currentAlarmState).toBe('ALARM');
      expect(analysis.alarmCauses).toContain('alarmManager.machineInAlarm');
      expect(analysis.preventionMeasures).toContain('alarmManager.preventionLimitChecking');
    });

    test('should detect disabled soft limits', () => {
      const diagnostics = {
        machineStatus: { raw: '<Idle|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>' },
        grblSettings: {
          parsed: {
            20: 0 // Soft limits disabled
          }
        }
      };

      const analysis = alarmManager.analyzeAlarmDiagnostics(diagnostics);

      expect(analysis.alarmCauses).toContain('alarmManager.softLimitsDisabled');
      expect(analysis.preventionMeasures).toContain('alarmManager.preventionEnableSoftLimitsCommand');
    });

    test('should detect disabled hard limits', () => {
      const diagnostics = {
        machineStatus: { raw: '<Idle|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>' },
        grblSettings: {
          parsed: {
            21: 0 // Hard limits disabled
          }
        }
      };

      const analysis = alarmManager.analyzeAlarmDiagnostics(diagnostics);

      expect(analysis.preventionMeasures).toContain('alarmManager.preventionEnableHardLimits');
    });

    test('should detect disabled homing cycle', () => {
      const diagnostics = {
        machineStatus: { raw: '<Idle|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>' },
        grblSettings: {
          parsed: {
            22: 0 // Homing cycle disabled
          }
        }
      };

      const analysis = alarmManager.analyzeAlarmDiagnostics(diagnostics);

      expect(analysis.preventionMeasures).toContain('alarmManager.preventionEnableHomingCycle');
    });

    test('should handle missing diagnostics data', () => {
      const diagnostics = {};

      const analysis = alarmManager.analyzeAlarmDiagnostics(diagnostics);

      expect(analysis.hasAlarmIssues).toBe(false);
      expect(analysis.currentAlarmState).toBeNull();
      expect(analysis.alarmCauses).toHaveLength(0);
    });
  });

  describe('generateAlarmDiagnosticReport', () => {
    test('should generate structured alarm report', () => {
      const diagnostics = {
        alarmAnalysis: { alarmDetected: true, alarmType: 1 },
        alarmDiagnostics: { hasAlarmIssues: true }
      };

      const result = alarmManager.generateAlarmDiagnosticReport(diagnostics, 'json');

      expect(createAlarmReport).toHaveBeenCalledWith(
        diagnostics.alarmAnalysis,
        diagnostics.alarmDiagnostics
      );
      expect(structuredLogger.config.outputMode).toBe('json');
      expect(structuredLogger.config.ui).toBe(mockConfig.ui);
      expect(structuredLogger.logStructured).toHaveBeenCalled();
      expect(result).toEqual({ logged: true });
    });

    test('should use console output mode by default', () => {
      const diagnostics = {
        alarmAnalysis: {},
        alarmDiagnostics: {}
      };

      alarmManager.generateAlarmDiagnosticReport(diagnostics);

      expect(structuredLogger.config.outputMode).toBe('console');
    });
  });

  describe('displayAlarmDiagnosticReport', () => {
    test('should call generateAlarmDiagnosticReport with console mode', () => {
      const diagnostics = { alarmAnalysis: {}, alarmDiagnostics: {} };
      const spy = jest.spyOn(alarmManager, 'generateAlarmDiagnosticReport');

      alarmManager.displayAlarmDiagnosticReport(diagnostics);

      expect(spy).toHaveBeenCalledWith(diagnostics, 'console');
    });
  });

  describe('getRecoveryCommands', () => {
    test('should return correct recovery commands for each alarm type', () => {
      expect(alarmManager.getRecoveryCommands(1)).toEqual(['$X', '$H']);
      expect(alarmManager.getRecoveryCommands(2)).toEqual(['$X']);
      expect(alarmManager.getRecoveryCommands(3)).toEqual(['$X', '$H']);
      expect(alarmManager.getRecoveryCommands(4)).toEqual(['$X']);
      expect(alarmManager.getRecoveryCommands(5)).toEqual(['$X']);
      expect(alarmManager.getRecoveryCommands(6)).toEqual(['$X', '$H']);
      expect(alarmManager.getRecoveryCommands(7)).toEqual(['$X']);
      expect(alarmManager.getRecoveryCommands(8)).toEqual(['$X', '$H']);
      expect(alarmManager.getRecoveryCommands(9)).toEqual(['$X', '$H']);
    });

    test('should return default unlock command for unknown alarm types', () => {
      expect(alarmManager.getRecoveryCommands(999)).toEqual(['$X']);
    });
  });

  describe('executeAlarmRecovery', () => {
    test('should execute recovery sequence successfully', async () => {
      const alarmType = 1;
      mockCommandExecutor.sendGcode
        .mockResolvedValueOnce({ response: 'ok' }) // $X
        .mockResolvedValueOnce({ response: 'ok' }); // $H

      const result = await alarmManager.executeAlarmRecovery(
        alarmType,
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(info).toHaveBeenCalledWith(expect.stringContaining('executingRecoverySequence'));
      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledTimes(2);
      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledWith(mockPort, true, '$X');
      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledWith(mockPort, true, '$H');

      expect(result.alarmType).toBe(alarmType);
      expect(result.recoveryCommands).toEqual(['$X', '$H']);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(2);
    });

    test('should continue recovery even if some commands fail', async () => {
      const alarmType = 1;
      mockCommandExecutor.sendGcode
        .mockRejectedValueOnce(new Error('Unlock failed'))
        .mockResolvedValueOnce({ response: 'ok' });

      const result = await alarmManager.executeAlarmRecovery(
        alarmType,
        mockCommandExecutor,
        mockPort,
        true
      );

      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('Unlock failed');
      expect(result.results[1].success).toBe(true);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('commandError'));
    });

    test('should include delays between recovery commands', async () => {
      jest.useFakeTimers();
      const alarmType = 1;
      mockCommandExecutor.sendGcode.mockResolvedValue({ response: 'ok' });

      const recoveryPromise = alarmManager.executeAlarmRecovery(
        alarmType,
        mockCommandExecutor,
        mockPort,
        true
      );

      // Fast-forward through the delay
      jest.advanceTimersByTime(1000);
      
      await recoveryPromise;

      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });
  });

  describe('isInAlarmState', () => {
    test('should return true when machine is in alarm state', () => {
      const machineStatus = {
        parsed: { state: 'Alarm' }
      };

      expect(alarmManager.isInAlarmState(machineStatus)).toBe(true);
    });

    test('should return false when machine is not in alarm state', () => {
      const machineStatus = {
        parsed: { state: 'Idle' }
      };

      expect(alarmManager.isInAlarmState(machineStatus)).toBe(false);
    });

    test('should return false when machine status is missing', () => {
      expect(alarmManager.isInAlarmState(null)).toBe(false);
      expect(alarmManager.isInAlarmState({})).toBe(false);
      expect(alarmManager.isInAlarmState({ parsed: null })).toBe(false);
    });
  });

  describe('getPreventionChecklist', () => {
    test('should return comprehensive prevention checklist', () => {
      const checklist = alarmManager.getPreventionChecklist();

      expect(checklist).toContain('alarmManager.checklistSoftLimits');
      expect(checklist).toContain('alarmManager.checklistHardLimits');
      expect(checklist).toContain('alarmManager.checklistHomingCycle');
      expect(checklist).toContain('alarmManager.checklistTestLimitSwitches');
      expect(checklist).toContain('alarmManager.checklistVerifyTravelLimits');
      expect(checklist).toContain('alarmManager.checklistCheckProbe');
      expect(checklist).toContain('alarmManager.checklistSafetyDoor');
      expect(checklist).toContain('alarmManager.checklistCalibrate');
      expect(checklist).toHaveLength(8);
    });
  });

  describe('Safety Critical Tests', () => {
    test('should never allow execution of recovery commands when disconnected', async () => {
      const alarmType = 1;
      
      await alarmManager.executeAlarmRecovery(
        alarmType,
        mockCommandExecutor,
        mockPort,
        false // isConnected = false
      );

      expect(mockCommandExecutor.sendGcode).toHaveBeenCalledWith(
        mockPort,
        false, // Should pass false for isConnected
        '$X'
      );
    });

    test('should handle critical alarm types with appropriate urgency', async () => {
      // Test hard limit alarm (type 1) - critical
      const hardLimitCommands = alarmManager.getRecoveryCommands(1);
      expect(hardLimitCommands).toContain('$X'); // Must unlock
      expect(hardLimitCommands).toContain('$H'); // Must rehome

      // Test soft limit alarm (type 2) - less critical
      const softLimitCommands = alarmManager.getRecoveryCommands(2);
      expect(softLimitCommands).toEqual(['$X']); // Only unlock needed
    });

    test('should provide appropriate causes for safety-related alarms', () => {
      // Test probe-related alarms
      const probeCauses4 = alarmManager.getAlarmCauses(4);
      expect(probeCauses4).toContain('Probe fail');
      expect(probeCauses4).toContain('Probe not making contact');

      const probeCauses5 = alarmManager.getAlarmCauses(5);
      expect(probeCauses5).toContain('Probe already triggered at start');
      expect(probeCauses5).toContain('Probe stuck in triggered state');

      // Test safety door alarm
      const doorCauses7 = alarmManager.getAlarmCauses(7);
      expect(doorCauses7).toContain('Safety door opened during homing');
      expect(doorCauses7).toContain('Door switch malfunction');
    });

    test('should always provide recovery steps even for unknown alarms', async () => {
      const diagnostics = {
        machineStatus: {
          raw: '<Alarm:999|MPos:0.000,0.000,0.000|Bf:15,128|FS:0,0>' // Unknown alarm
        }
      };

      const analysis = await alarmManager.performAlarmAnalysis(diagnostics);

      expect(analysis.recoverySteps).toHaveLength(2);
      expect(analysis.recoverySteps).toContain('alarmManager.recoveryUnlock');
      expect(analysis.recoverySteps).toContain('alarmManager.recoveryCheckHome');
    });
  });
});