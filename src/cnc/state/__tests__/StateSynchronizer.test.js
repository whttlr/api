/**
 * StateSynchronizer Test Suite
 * 
 * Tests for state synchronization functionality including
 * hardware/software state monitoring, conflict resolution, and query management.
 */

import { StateSynchronizer } from '../StateSynchronizer.js';
import { MockMachineStateManager } from '../__mocks__/MockMachineStateManager.js';
import { MockCommandManager } from '../__mocks__/MockCommandManager.js';

describe('StateSynchronizer', () => {
  let synchronizer;
  let mockStateManager;
  let mockCommandManager;

  beforeEach(() => {
    mockStateManager = new MockMachineStateManager();
    mockCommandManager = new MockCommandManager();
    
    synchronizer = new StateSynchronizer(mockStateManager, mockCommandManager, {
      enableAutomaticSync: true,
      syncInterval: 100,
      conflictResolutionStrategy: 'hardware_priority',
      enableQueryOptimization: true
    });
  });

  afterEach(() => {
    synchronizer.cleanup();
  });

  describe('constructor', () => {
    test('should create StateSynchronizer with valid dependencies', () => {
      expect(synchronizer).toBeInstanceOf(StateSynchronizer);
      expect(synchronizer.stateManager).toBe(mockStateManager);
      expect(synchronizer.commandManager).toBe(mockCommandManager);
    });

    test('should throw error without state manager', () => {
      expect(() => new StateSynchronizer(null, mockCommandManager)).toThrow();
    });

    test('should throw error without command manager', () => {
      expect(() => new StateSynchronizer(mockStateManager, null)).toThrow();
    });

    test('should initialize component managers', () => {
      expect(synchronizer.monitor).toBeDefined();
      expect(synchronizer.queryManager).toBeDefined();
      expect(synchronizer.comparator).toBeDefined();
      expect(synchronizer.resolver).toBeDefined();
    });
  });

  describe('synchronization control', () => {
    test('should start synchronization', () => {
      const startedSpy = jest.fn();
      synchronizer.on('synchronizationStarted', startedSpy);

      synchronizer.startSynchronization();

      expect(synchronizer.isSynchronizing).toBe(true);
      expect(startedSpy).toHaveBeenCalled();
    });

    test('should stop synchronization', () => {
      const stoppedSpy = jest.fn();
      synchronizer.on('synchronizationStopped', stoppedSpy);

      synchronizer.startSynchronization();
      synchronizer.stopSynchronization();

      expect(synchronizer.isSynchronizing).toBe(false);
      expect(stoppedSpy).toHaveBeenCalled();
    });

    test('should not start if already synchronizing', () => {
      synchronizer.startSynchronization();
      const firstTimer = synchronizer.syncTimer;

      synchronizer.startSynchronization();

      expect(synchronizer.syncTimer).toBe(firstTimer);
    });
  });

  describe('state monitoring', () => {
    test('should detect state differences', async () => {
      const conflictSpy = jest.fn();
      synchronizer.on('stateConflict', conflictSpy);

      // Set different states
      mockStateManager.setMockState({ position: { x: 10, y: 20, z: 5 } });
      mockCommandManager.setMockResponse('?', { 
        mpos: { x: 15, y: 25, z: 10 } 
      });

      synchronizer.startSynchronization();

      // Wait for sync cycle
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(conflictSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'position',
          software: { x: 10, y: 20, z: 5 },
          hardware: { x: 15, y: 25, z: 10 }
        })
      );
    });

    test('should perform periodic synchronization checks', async () => {
      mockCommandManager.setMockResponse('?', { 
        state: 'Idle',
        mpos: { x: 0, y: 0, z: 0 } 
      });

      synchronizer.startSynchronization();

      // Wait for multiple sync cycles
      await new Promise(resolve => setTimeout(resolve, 250));

      expect(mockCommandManager.getCallCount('?')).toBeGreaterThan(1);
    });

    test('should handle query failures gracefully', async () => {
      const errorSpy = jest.fn();
      synchronizer.on('syncError', errorSpy);

      mockCommandManager.setMockError('?', new Error('Communication timeout'));

      synchronizer.startSynchronization();

      // Wait for sync attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Communication timeout'
        })
      );
    });
  });

  describe('conflict resolution', () => {
    test('should resolve conflicts with hardware priority', async () => {
      synchronizer.config.conflictResolutionStrategy = 'hardware_priority';

      const resolvedSpy = jest.fn();
      synchronizer.on('conflictResolved', resolvedSpy);

      // Create conflict
      mockStateManager.setMockState({ position: { x: 5, y: 10, z: 2 } });
      mockCommandManager.setMockResponse('?', { 
        mpos: { x: 10, y: 15, z: 5 } 
      });

      await synchronizer.resolveStateConflict({
        type: 'position',
        software: { x: 5, y: 10, z: 2 },
        hardware: { x: 10, y: 15, z: 5 }
      });

      expect(resolvedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'hardware_priority',
          resolvedValue: { x: 10, y: 15, z: 5 }
        })
      );
    });

    test('should resolve conflicts with software priority', async () => {
      synchronizer.config.conflictResolutionStrategy = 'software_priority';

      const resolvedSpy = jest.fn();
      synchronizer.on('conflictResolved', resolvedSpy);

      await synchronizer.resolveStateConflict({
        type: 'modal',
        software: { motion: 'G01' },
        hardware: { motion: 'G00' }
      });

      expect(resolvedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: 'software_priority',
          resolvedValue: { motion: 'G01' }
        })
      );
    });

    test('should use manual resolution for critical conflicts', async () => {
      synchronizer.config.conflictResolutionStrategy = 'manual';

      const manualResolutionSpy = jest.fn();
      synchronizer.on('manualResolutionRequired', manualResolutionSpy);

      await synchronizer.resolveStateConflict({
        type: 'position',
        software: { x: 0, y: 0, z: 0 },
        hardware: { x: 100, y: 100, z: 100 },
        severity: 'critical'
      });

      expect(manualResolutionSpy).toHaveBeenCalled();
    });
  });

  describe('query optimization', () => {
    test('should optimize query frequency based on activity', async () => {
      synchronizer.config.enableQueryOptimization = true;

      mockCommandManager.setMockResponse('?', { 
        state: 'Run',
        mpos: { x: 0, y: 0, z: 0 } 
      });

      synchronizer.startSynchronization();

      // Simulate machine activity
      mockStateManager.setState('Run');

      await new Promise(resolve => setTimeout(resolve, 200));

      // Should increase query frequency during activity
      const metrics = synchronizer.getQueryMetrics();
      expect(metrics.adaptiveInterval).toBeLessThan(synchronizer.config.syncInterval);
    });

    test('should reduce query frequency during idle periods', async () => {
      mockCommandManager.setMockResponse('?', { 
        state: 'Idle',
        mpos: { x: 10, y: 10, z: 10 } 
      });

      synchronizer.startSynchronization();

      // Simulate idle period
      await new Promise(resolve => setTimeout(resolve, 300));

      const metrics = synchronizer.getQueryMetrics();
      expect(metrics.adaptiveInterval).toBeGreaterThan(synchronizer.config.syncInterval);
    });
  });

  describe('state comparison', () => {
    test('should detect position differences', () => {
      const software = { position: { x: 10, y: 20, z: 5 } };
      const hardware = { mpos: { x: 11, y: 21, z: 6 } };

      const differences = synchronizer.compareStates(software, hardware);

      expect(differences).toContainEqual(
        expect.objectContaining({
          type: 'position',
          field: 'x',
          softwareValue: 10,
          hardwareValue: 11
        })
      );
    });

    test('should detect modal group differences', () => {
      const software = { modal: { motion: 'G01', units: 'G21' } };
      const hardware = { modal: { motion: 'G00', units: 'G21' } };

      const differences = synchronizer.compareStates(software, hardware);

      expect(differences).toContainEqual(
        expect.objectContaining({
          type: 'modal',
          field: 'motion',
          softwareValue: 'G01',
          hardwareValue: 'G00'
        })
      );
    });

    test('should ignore minor position differences within tolerance', () => {
      synchronizer.config.positionTolerance = 0.1;

      const software = { position: { x: 10.05, y: 20.03, z: 5.02 } };
      const hardware = { mpos: { x: 10.04, y: 20.04, z: 5.01 } };

      const differences = synchronizer.compareStates(software, hardware);

      expect(differences).toHaveLength(0);
    });
  });

  describe('synchronization metrics', () => {
    test('should track sync success rate', async () => {
      mockCommandManager.setMockResponse('?', { 
        state: 'Idle',
        mpos: { x: 0, y: 0, z: 0 } 
      });

      synchronizer.startSynchronization();
      await new Promise(resolve => setTimeout(resolve, 250));

      const metrics = synchronizer.getSyncMetrics();
      expect(metrics.successRate).toBeGreaterThan(0);
      expect(metrics.totalSyncs).toBeGreaterThan(0);
    });

    test('should track conflict resolution statistics', async () => {
      // Create and resolve a conflict
      await synchronizer.resolveStateConflict({
        type: 'position',
        software: { x: 5, y: 10, z: 2 },
        hardware: { x: 10, y: 15, z: 5 }
      });

      const metrics = synchronizer.getConflictMetrics();
      expect(metrics.totalConflicts).toBe(1);
      expect(metrics.resolvedConflicts).toBe(1);
    });

    test('should calculate average sync time', async () => {
      mockCommandManager.setMockDelay(50);
      mockCommandManager.setMockResponse('?', { state: 'Idle' });

      synchronizer.startSynchronization();
      await new Promise(resolve => setTimeout(resolve, 200));

      const metrics = synchronizer.getSyncMetrics();
      expect(metrics.averageSyncTime).toBeGreaterThan(40);
    });
  });

  describe('error handling', () => {
    test('should handle communication timeouts', async () => {
      const timeoutSpy = jest.fn();
      synchronizer.on('syncTimeout', timeoutSpy);

      mockCommandManager.setMockDelay(5000); // Longer than timeout
      mockCommandManager.setMockResponse('?', { state: 'Idle' });

      synchronizer.startSynchronization();

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 2500));

      expect(timeoutSpy).toHaveBeenCalled();
    });

    test('should recover from temporary communication failures', async () => {
      const recoveredSpy = jest.fn();
      synchronizer.on('syncRecovered', recoveredSpy);

      // Start with failure
      mockCommandManager.setMockError('?', new Error('Connection lost'));
      synchronizer.startSynchronization();

      await new Promise(resolve => setTimeout(resolve, 150));

      // Restore communication
      mockCommandManager.clearMockError('?');
      mockCommandManager.setMockResponse('?', { state: 'Idle' });

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(recoveredSpy).toHaveBeenCalled();
    });
  });

  describe('state validation', () => {
    test('should validate received state data', async () => {
      const validationSpy = jest.fn();
      synchronizer.on('validationError', validationSpy);

      // Send invalid state data
      mockCommandManager.setMockResponse('?', { 
        mpos: { x: 'invalid', y: 20, z: 5 } 
      });

      synchronizer.startSynchronization();
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(validationSpy).toHaveBeenCalled();
    });

    test('should reject out-of-bounds position data', async () => {
      synchronizer.setMachineLimits({
        x: { min: -100, max: 100 },
        y: { min: -100, max: 100 },
        z: { min: -50, max: 50 }
      });

      const boundsErrorSpy = jest.fn();
      synchronizer.on('boundsError', boundsErrorSpy);

      mockCommandManager.setMockResponse('?', { 
        mpos: { x: 200, y: 50, z: 25 } // X exceeds bounds
      });

      synchronizer.startSynchronization();
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(boundsErrorSpy).toHaveBeenCalled();
    });
  });

  describe('manual synchronization', () => {
    test('should perform immediate sync on demand', async () => {
      mockCommandManager.setMockResponse('?', { 
        state: 'Run',
        mpos: { x: 25, y: 35, z: 15 } 
      });

      const result = await synchronizer.performImmediateSync();

      expect(result.success).toBe(true);
      expect(result.state).toEqual({
        state: 'Run',
        mpos: { x: 25, y: 35, z: 15 }
      });
    });

    test('should force state update from hardware', async () => {
      mockCommandManager.setMockResponse('?', { 
        mpos: { x: 50, y: 60, z: 30 } 
      });

      await synchronizer.forceHardwareSync();

      // Should update software state to match hardware
      expect(mockStateManager.position).toEqual({ x: 50, y: 60, z: 30 });
    });
  });

  describe('data export', () => {
    test('should export synchronization data', async () => {
      synchronizer.startSynchronization();
      await new Promise(resolve => setTimeout(resolve, 150));

      const exportData = synchronizer.exportData();

      expect(exportData).toHaveProperty('syncMetrics');
      expect(exportData).toHaveProperty('conflictMetrics');
      expect(exportData).toHaveProperty('queryMetrics');
      expect(exportData).toHaveProperty('config');
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      synchronizer.startSynchronization();
      
      synchronizer.cleanup();

      expect(synchronizer.isSynchronizing).toBe(false);
      expect(synchronizer.listenerCount()).toBe(0);
    });
  });
});