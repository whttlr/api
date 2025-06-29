/**
 * AlarmRecoveryManager Test Suite
 * 
 * Tests for automated alarm recovery functionality including
 * alarm detection, recovery sequence execution, and state restoration.
 */

import { AlarmRecoveryManager } from '../AlarmRecoveryManager.js';
import { MockCommandManager } from '../__mocks__/MockCommandManager.js';

describe('AlarmRecoveryManager', () => {
  let recoveryManager;
  let mockCommandManager;

  beforeEach(() => {
    mockCommandManager = new MockCommandManager();
    recoveryManager = new AlarmRecoveryManager(mockCommandManager, {
      enableAutoRecovery: true,
      maxRecoveryAttempts: 3,
      recoveryTimeout: 5000,
      safeHeight: 5.0,
      pauseBeforeRecovery: 100 // Short delay for testing
    });
  });

  afterEach(() => {
    recoveryManager.cleanup();
  });

  describe('constructor', () => {
    test('should create AlarmRecoveryManager with valid command manager', () => {
      expect(recoveryManager).toBeInstanceOf(AlarmRecoveryManager);
      expect(recoveryManager.commandManager).toBe(mockCommandManager);
    });

    test('should throw error without command manager', () => {
      expect(() => new AlarmRecoveryManager()).toThrow('AlarmRecoveryManager requires a command manager');
    });

    test('should apply custom configuration', () => {
      expect(recoveryManager.config.enableAutoRecovery).toBe(true);
      expect(recoveryManager.config.maxRecoveryAttempts).toBe(3);
      expect(recoveryManager.config.safeHeight).toBe(5.0);
    });

    test('should initialize with default machine state', () => {
      expect(recoveryManager.machineState.lastKnownPosition).toEqual({ x: 0, y: 0, z: 0 });
      expect(recoveryManager.machineState.isHomed).toBe(false);
    });
  });

  describe('alarm detection', () => {
    test('should detect and classify alarms', () => {
      const alarmResult = recoveryManager.classifyAlarm(2); // Soft limit alarm
      
      expect(alarmResult.name).toBe('Soft Limit');
      expect(alarmResult.severity).toBe('high');
      expect(alarmResult.autoRecoverable).toBe(true);
    });

    test('should identify non-recoverable alarms', () => {
      const alarmResult = recoveryManager.classifyAlarm(1); // Hard limit alarm
      
      expect(alarmResult.name).toBe('Hard Limit');
      expect(alarmResult.severity).toBe('critical');
      expect(alarmResult.autoRecoverable).toBe(false);
    });

    test('should handle unknown alarm codes', () => {
      const alarmResult = recoveryManager.classifyAlarm(99); // Unknown alarm
      
      expect(alarmResult.name).toBe('Unknown Alarm');
      expect(alarmResult.autoRecoverable).toBe(false);
    });
  });

  describe('recovery sequence execution', () => {
    test('should execute soft limit recovery sequence', async () => {
      const recoverySpy = jest.fn();
      recoveryManager.on('recoveryStarted', recoverySpy);

      mockCommandManager.setConnected(true);
      
      const result = await recoveryManager.recoverFromAlarm(2); // Soft limit

      expect(recoverySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmCode: 2,
          recoveryType: 'soft_limit'
        })
      );

      expect(result.success).toBe(true);
      expect(result.recoverySteps).toBeGreaterThan(0);
    });

    test('should skip recovery for non-recoverable alarms', async () => {
      const result = await recoveryManager.recoverFromAlarm(1); // Hard limit

      expect(result.success).toBe(false);
      expect(result.reason).toContain('not auto-recoverable');
    });

    test('should execute homing sequence during recovery', async () => {
      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(2); // Soft limit

      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands).toContain('$H'); // Homing command
    });

    test('should move to safe height during recovery', async () => {
      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(2);

      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands.some(cmd => cmd.includes('G0 Z5.0'))).toBe(true);
    });
  });

  describe('position and state restoration', () => {
    test('should restore machine position after recovery', async () => {
      recoveryManager.machineState.lastKnownPosition = { x: 10, y: 20, z: 3 };
      recoveryManager.config.enablePositionRestore = true;

      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(3); // Abort cycle

      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands.some(cmd => cmd.includes('G0 X10 Y20 Z3'))).toBe(true);
    });

    test('should restore work offsets', async () => {
      recoveryManager.machineState.lastKnownWorkOffset = { x: 5, y: 5, z: 0 };
      recoveryManager.machineState.coordinateSystem = 'G54';
      recoveryManager.config.enableWorkOffsetRestore = true;

      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(3);

      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands).toContain('G54');
    });

    test('should restore coolant state when enabled', async () => {
      recoveryManager.machineState.lastKnownCoolantState = true;
      recoveryManager.config.enableCoolantRestore = true;

      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(3);

      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands).toContain('M8'); // Coolant on
    });

    test('should not restore spindle state by default (safety)', async () => {
      recoveryManager.machineState.lastKnownSpindleState = { running: true, speed: 1000 };
      recoveryManager.config.enableSpindleRestore = false; // Default

      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(3);

      const sentCommands = mockCommandManager.getSentCommands();
      expect(sentCommands.some(cmd => cmd.includes('M3'))).toBe(false);
    });
  });

  describe('recovery attempt tracking', () => {
    test('should track recovery attempts per alarm type', async () => {
      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(2);
      await recoveryManager.recoverFromAlarm(2);

      expect(recoveryManager.recoveryHistory.length).toBe(2);
      expect(recoveryManager.recoveryHistory[0].alarmCode).toBe(2);
    });

    test('should prevent excessive recovery attempts', async () => {
      recoveryManager.config.maxRecoveryAttempts = 1;
      mockCommandManager.setConnected(true);

      // First attempt should succeed
      const result1 = await recoveryManager.recoverFromAlarm(2);
      expect(result1.success).toBe(true);

      // Second attempt should be blocked
      const result2 = await recoveryManager.recoverFromAlarm(2);
      expect(result2.success).toBe(false);
      expect(result2.reason).toContain('Maximum recovery attempts exceeded');
    });

    test('should reset attempt counters after successful recovery', async () => {
      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(2);
      
      // Simulate successful recovery completion
      recoveryManager.resetRecoveryAttempts(2);
      
      // Should allow recovery again
      const result = await recoveryManager.recoverFromAlarm(2);
      expect(result.success).toBe(true);
    });
  });

  describe('machine state tracking', () => {
    test('should update machine state from status reports', () => {
      const statusReport = {
        position: { x: 15, y: 25, z: 5 },
        workOffset: { x: 2, y: 3, z: 0 },
        spindle: { running: true, speed: 800 },
        coolant: true,
        coordinateSystem: 'G55'
      };

      recoveryManager.updateMachineState(statusReport);

      expect(recoveryManager.machineState.lastKnownPosition).toEqual({ x: 15, y: 25, z: 5 });
      expect(recoveryManager.machineState.lastKnownWorkOffset).toEqual({ x: 2, y: 3, z: 0 });
      expect(recoveryManager.machineState.lastKnownSpindleState).toEqual({ running: true, speed: 800 });
      expect(recoveryManager.machineState.coordinateSystem).toBe('G55');
    });

    test('should track homing status', () => {
      recoveryManager.updateHomingStatus(true);
      expect(recoveryManager.machineState.isHomed).toBe(true);

      recoveryManager.updateHomingStatus(false);
      expect(recoveryManager.machineState.isHomed).toBe(false);
    });
  });

  describe('recovery sequence validation', () => {
    test('should validate machine state before recovery', async () => {
      mockCommandManager.setConnected(false); // Not connected

      const result = await recoveryManager.recoverFromAlarm(2);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Machine not connected');
    });

    test('should verify position accuracy after recovery', async () => {
      recoveryManager.config.positionTolerance = 0.1;
      recoveryManager.machineState.lastKnownPosition = { x: 10, y: 10, z: 5 };

      mockCommandManager.setConnected(true);
      mockCommandManager.setMockResponse('?', {
        position: { x: 10.05, y: 9.98, z: 5.02 } // Within tolerance
      });

      const result = await recoveryManager.recoverFromAlarm(3);

      expect(result.success).toBe(true);
      expect(result.positionVerified).toBe(true);
    });

    test('should detect position verification failures', async () => {
      recoveryManager.config.positionTolerance = 0.1;
      recoveryManager.machineState.lastKnownPosition = { x: 10, y: 10, z: 5 };

      mockCommandManager.setConnected(true);
      mockCommandManager.setMockResponse('?', {
        position: { x: 10.5, y: 10.5, z: 5.5 } // Outside tolerance
      });

      const result = await recoveryManager.recoverFromAlarm(3);

      expect(result.positionVerified).toBe(false);
      expect(result.warnings).toContain('Position verification failed');
    });
  });

  describe('error handling', () => {
    test('should handle communication errors during recovery', async () => {
      mockCommandManager.setConnected(true);
      mockCommandManager.setMockError('$H', new Error('Communication failed'));

      const result = await recoveryManager.recoverFromAlarm(2);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Communication failed');
    });

    test('should handle recovery timeouts', async () => {
      recoveryManager.config.recoveryTimeout = 100; // Very short timeout
      mockCommandManager.setConnected(true);
      mockCommandManager.setMockDelay(200); // Longer than timeout

      const result = await recoveryManager.recoverFromAlarm(2);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Recovery timeout');
    });

    test('should emit error events for failed recoveries', async () => {
      const errorSpy = jest.fn();
      recoveryManager.on('recoveryFailed', errorSpy);

      mockCommandManager.setConnected(true);
      mockCommandManager.setMockError('$H', new Error('Homing failed'));

      await recoveryManager.recoverFromAlarm(2);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmCode: 2,
          error: expect.any(Error)
        })
      );
    });
  });

  describe('recovery statistics', () => {
    test('should track recovery success rates', async () => {
      mockCommandManager.setConnected(true);

      await recoveryManager.recoverFromAlarm(2); // Success
      await recoveryManager.recoverFromAlarm(3); // Success

      const stats = recoveryManager.getRecoveryStatistics();

      expect(stats.totalAttempts).toBe(2);
      expect(stats.successfulRecoveries).toBe(2);
      expect(stats.successRate).toBe(1.0);
    });

    test('should track recovery times', async () => {
      mockCommandManager.setConnected(true);

      const startTime = Date.now();
      await recoveryManager.recoverFromAlarm(2);
      
      const stats = recoveryManager.getRecoveryStatistics();
      expect(stats.averageRecoveryTime).toBeGreaterThan(0);
    });

    test('should provide alarm-specific statistics', async () => {
      mockCommandManager.setConnected(true);

      await recoveryManager.recoverFromAlarm(2); // Soft limit
      await recoveryManager.recoverFromAlarm(3); // Abort cycle

      const stats = recoveryManager.getRecoveryStatistics();

      expect(stats.alarmTypeStats).toHaveProperty('2');
      expect(stats.alarmTypeStats).toHaveProperty('3');
      expect(stats.alarmTypeStats['2'].attempts).toBe(1);
    });
  });

  describe('recovery workflow customization', () => {
    test('should allow custom recovery workflows', async () => {
      const customWorkflow = jest.fn().mockResolvedValue({ success: true });
      recoveryManager.setCustomRecoveryWorkflow(2, customWorkflow);

      mockCommandManager.setConnected(true);
      
      await recoveryManager.recoverFromAlarm(2);

      expect(customWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          alarmCode: 2,
          machineState: expect.any(Object)
        })
      );
    });

    test('should fall back to default workflow if custom fails', async () => {
      const failingWorkflow = jest.fn().mockRejectedValue(new Error('Custom workflow failed'));
      recoveryManager.setCustomRecoveryWorkflow(2, failingWorkflow);

      mockCommandManager.setConnected(true);
      
      const result = await recoveryManager.recoverFromAlarm(2);

      expect(failingWorkflow).toHaveBeenCalled();
      expect(result.success).toBe(true); // Should fall back to default
      expect(result.usedFallback).toBe(true);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      recoveryManager.cleanup();

      expect(recoveryManager.listenerCount()).toBe(0);
      expect(recoveryManager.currentRecovery).toBeNull();
    });

    test('should cancel ongoing recovery during cleanup', async () => {
      mockCommandManager.setConnected(true);
      mockCommandManager.setMockDelay(1000); // Long delay

      const recoveryPromise = recoveryManager.recoverFromAlarm(2);
      
      setTimeout(() => recoveryManager.cleanup(), 100);
      
      const result = await recoveryPromise;
      expect(result.success).toBe(false);
      expect(result.reason).toContain('cancelled');
    });
  });
});