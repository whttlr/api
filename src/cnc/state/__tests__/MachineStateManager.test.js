/**
 * MachineStateManager Test Suite
 * 
 * Tests for machine state management functionality including
 * position tracking, coordinate systems, modal groups, and tool management.
 */

import { MachineStateManager } from '../MachineStateManager.js';
import { MockStatusService } from '../__mocks__/MockStatusService.js';

describe('MachineStateManager', () => {
  let stateManager;
  let mockStatusService;

  beforeEach(() => {
    mockStatusService = new MockStatusService();
    stateManager = new MachineStateManager({
      enableStateValidation: true,
      trackMovementHistory: true,
      maxHistoryEntries: 100
    });
  });

  afterEach(() => {
    stateManager.cleanup();
  });

  describe('constructor', () => {
    test('should create MachineStateManager with default configuration', () => {
      const defaultManager = new MachineStateManager();
      expect(defaultManager).toBeInstanceOf(MachineStateManager);
      expect(defaultManager.config.enableStateValidation).toBe(true);
    });

    test('should apply custom configuration', () => {
      expect(stateManager.config.trackMovementHistory).toBe(true);
      expect(stateManager.config.maxHistoryEntries).toBe(100);
    });

    test('should initialize component managers', () => {
      expect(stateManager.positionManager).toBeDefined();
      expect(stateManager.coordinateManager).toBeDefined();
      expect(stateManager.modalManager).toBeDefined();
      expect(stateManager.toolManager).toBeDefined();
    });
  });

  describe('position management', () => {
    test('should update machine position', () => {
      const positionChangedSpy = jest.fn();
      stateManager.on('positionChanged', positionChangedSpy);

      const newPosition = { x: 10, y: 20, z: 5 };
      stateManager.updatePosition(newPosition);

      expect(positionChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          current: expect.objectContaining(newPosition)
        })
      );
    });

    test('should calculate movement distance', () => {
      stateManager.updatePosition({ x: 0, y: 0, z: 0 });
      stateManager.updatePosition({ x: 10, y: 0, z: 0 });

      const distance = stateManager.getLastMovementDistance();
      expect(distance).toBe(10);
    });

    test('should track position history', () => {
      stateManager.updatePosition({ x: 0, y: 0, z: 0 });
      stateManager.updatePosition({ x: 5, y: 5, z: 5 });
      stateManager.updatePosition({ x: 10, y: 10, z: 10 });

      const history = stateManager.getPositionHistory();
      expect(history.length).toBe(3);
      expect(history[2].position).toEqual({ x: 10, y: 10, z: 10 });
    });

    test('should validate position changes', () => {
      const invalidPosition = { x: 'invalid', y: 20, z: 5 };
      
      expect(() => {
        stateManager.updatePosition(invalidPosition);
      }).toThrow('Invalid position data');
    });
  });

  describe('coordinate system management', () => {
    test('should set work coordinate system', () => {
      const coordinateChangedSpy = jest.fn();
      stateManager.on('coordinateSystemChanged', coordinateChangedSpy);

      stateManager.setWorkCoordinateSystem('G54', { x: 100, y: 200, z: 50 });

      expect(coordinateChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          system: 'G54',
          offset: { x: 100, y: 200, z: 50 }
        })
      );
    });

    test('should get current coordinate system', () => {
      stateManager.setWorkCoordinateSystem('G55', { x: 50, y: 100, z: 25 });
      
      const currentSystem = stateManager.getCurrentCoordinateSystem();
      expect(currentSystem).toEqual({
        name: 'G55',
        offset: { x: 50, y: 100, z: 25 }
      });
    });

    test('should convert between coordinate systems', () => {
      stateManager.setWorkCoordinateSystem('G54', { x: 10, y: 20, z: 5 });
      stateManager.updatePosition({ x: 100, y: 200, z: 50 });

      const workPosition = stateManager.getWorkPosition();
      expect(workPosition).toEqual({ x: 90, y: 180, z: 45 });
    });
  });

  describe('modal group management', () => {
    test('should update modal groups', () => {
      const modalChangedSpy = jest.fn();
      stateManager.on('modalGroupChanged', modalChangedSpy);

      stateManager.updateModalGroup('motion', 'G01');

      expect(modalChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          group: 'motion',
          value: 'G01'
        })
      );
    });

    test('should get current modal state', () => {
      stateManager.updateModalGroup('motion', 'G01');
      stateManager.updateModalGroup('plane', 'G17');
      stateManager.updateModalGroup('units', 'G21');

      const modalState = stateManager.getModalState();
      expect(modalState).toEqual({
        motion: 'G01',
        plane: 'G17',
        units: 'G21'
      });
    });

    test('should validate modal group values', () => {
      expect(() => {
        stateManager.updateModalGroup('motion', 'invalid');
      }).toThrow('Invalid modal group value');
    });
  });

  describe('tool management', () => {
    test('should change active tool', () => {
      const toolChangedSpy = jest.fn();
      stateManager.on('toolChanged', toolChangedSpy);

      stateManager.changeTool(5, { length: 50, diameter: 6 });

      expect(toolChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          toolNumber: 5,
          properties: { length: 50, diameter: 6 }
        })
      );
    });

    test('should get current tool information', () => {
      stateManager.changeTool(3, { length: 30, diameter: 4 });

      const currentTool = stateManager.getCurrentTool();
      expect(currentTool).toEqual({
        number: 3,
        properties: { length: 30, diameter: 4 }
      });
    });

    test('should track tool usage', () => {
      stateManager.changeTool(1, { length: 20, diameter: 2 });
      stateManager.changeTool(2, { length: 25, diameter: 3 });
      stateManager.changeTool(1, { length: 20, diameter: 2 });

      const toolUsage = stateManager.getToolUsageStatistics();
      expect(toolUsage[1].usageCount).toBe(2);
      expect(toolUsage[2].usageCount).toBe(1);
    });
  });

  describe('state synchronization', () => {
    test('should update state from status report', () => {
      const statusReport = {
        state: 'Run',
        mpos: { x: 15, y: 25, z: 10 },
        wpos: { x: 5, y: 5, z: 5 },
        wco: { x: 10, y: 20, z: 5 },
        modal: {
          motion: 'G01',
          plane: 'G17',
          units: 'G21'
        }
      };

      stateManager.updateFromStatusReport(statusReport);

      expect(stateManager.getCurrentState()).toBe('Run');
      expect(stateManager.getMachinePosition()).toEqual({ x: 15, y: 25, z: 10 });
      expect(stateManager.getWorkPosition()).toEqual({ x: 5, y: 5, z: 5 });
    });

    test('should detect state conflicts', () => {
      const conflictSpy = jest.fn();
      stateManager.on('stateConflict', conflictSpy);

      // Set initial state
      stateManager.updatePosition({ x: 10, y: 10, z: 10 });
      
      // Simulate conflicting status report
      const conflictingReport = {
        mpos: { x: 20, y: 20, z: 20 }, // Different from internal state
        timestamp: Date.now()
      };

      stateManager.updateFromStatusReport(conflictingReport);

      expect(conflictSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'position',
          expected: { x: 10, y: 10, z: 10 },
          received: { x: 20, y: 20, z: 20 }
        })
      );
    });
  });

  describe('state validation', () => {
    test('should validate position bounds', () => {
      stateManager.setMachineLimits({
        x: { min: -100, max: 100 },
        y: { min: -100, max: 100 },
        z: { min: -50, max: 50 }
      });

      expect(() => {
        stateManager.updatePosition({ x: 150, y: 50, z: 25 });
      }).toThrow('Position exceeds machine limits');
    });

    test('should validate coordinate system offsets', () => {
      expect(() => {
        stateManager.setWorkCoordinateSystem('G99', { x: 0, y: 0, z: 0 });
      }).toThrow('Invalid coordinate system');
    });

    test('should validate tool numbers', () => {
      expect(() => {
        stateManager.changeTool(-1, { length: 10, diameter: 5 });
      }).toThrow('Invalid tool number');
    });
  });

  describe('state persistence', () => {
    test('should save state to storage', async () => {
      stateManager.updatePosition({ x: 10, y: 20, z: 5 });
      stateManager.changeTool(3, { length: 30, diameter: 4 });

      const savedState = await stateManager.saveState();
      
      expect(savedState).toHaveProperty('position');
      expect(savedState).toHaveProperty('tool');
      expect(savedState.position).toEqual({ x: 10, y: 20, z: 5 });
    });

    test('should restore state from storage', async () => {
      const stateData = {
        position: { x: 25, y: 35, z: 15 },
        tool: { number: 2, properties: { length: 25, diameter: 3 } },
        coordinateSystem: { name: 'G55', offset: { x: 5, y: 10, z: 2 } }
      };

      await stateManager.restoreState(stateData);

      expect(stateManager.getMachinePosition()).toEqual({ x: 25, y: 35, z: 15 });
      expect(stateManager.getCurrentTool().number).toBe(2);
    });
  });

  describe('event handling', () => {
    test('should emit state change events', () => {
      const stateChangedSpy = jest.fn();
      stateManager.on('stateChanged', stateChangedSpy);

      stateManager.setState('Run');

      expect(stateChangedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          previousState: 'Idle',
          currentState: 'Run'
        })
      );
    });

    test('should emit component events', () => {
      const componentEventSpy = jest.fn();
      stateManager.on('componentEvent', componentEventSpy);

      // Trigger position manager event
      stateManager.updatePosition({ x: 5, y: 10, z: 15 });

      expect(componentEventSpy).toHaveBeenCalled();
    });
  });

  describe('statistics and metrics', () => {
    test('should track movement statistics', () => {
      stateManager.updatePosition({ x: 0, y: 0, z: 0 });
      stateManager.updatePosition({ x: 10, y: 0, z: 0 });
      stateManager.updatePosition({ x: 10, y: 10, z: 0 });

      const stats = stateManager.getMovementStatistics();
      expect(stats.totalDistance).toBe(20);
      expect(stats.averageSpeed).toBeGreaterThan(0);
    });

    test('should calculate uptime', () => {
      stateManager.setState('Run');
      
      // Simulate some time passing
      jest.advanceTimersByTime(1000);
      
      const uptime = stateManager.getUptime();
      expect(uptime).toBeGreaterThan(0);
    });
  });

  describe('export and import', () => {
    test('should export complete state data', () => {
      stateManager.updatePosition({ x: 15, y: 25, z: 10 });
      stateManager.changeTool(4, { length: 40, diameter: 5 });

      const exportData = stateManager.exportData();
      
      expect(exportData).toHaveProperty('position');
      expect(exportData).toHaveProperty('tool');
      expect(exportData).toHaveProperty('coordinateSystem');
      expect(exportData).toHaveProperty('modalState');
      expect(exportData).toHaveProperty('statistics');
    });

    test('should import state data', () => {
      const importData = {
        position: { x: 30, y: 40, z: 20 },
        tool: { number: 6, properties: { length: 60, diameter: 8 } },
        coordinateSystem: { name: 'G56', offset: { x: 15, y: 25, z: 5 } }
      };

      stateManager.importData(importData);

      expect(stateManager.getMachinePosition()).toEqual({ x: 30, y: 40, z: 20 });
      expect(stateManager.getCurrentTool().number).toBe(6);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      stateManager.updatePosition({ x: 10, y: 20, z: 5 });
      
      stateManager.cleanup();

      expect(stateManager.listenerCount()).toBe(0);
    });
  });
});