/**
 * StatusPoller Test Suite
 * 
 * Tests for live status polling system functionality including
 * adaptive polling, state change detection, and performance metrics.
 */

import { StatusPoller } from '../StatusPoller.js';
import { MockCommandManager } from '../__mocks__/MockCommandManager.js';

describe('StatusPoller', () => {
  let statusPoller;
  let mockCommandManager;

  beforeEach(() => {
    mockCommandManager = new MockCommandManager();
    statusPoller = new StatusPoller(mockCommandManager, {
      pollInterval: 100,
      enableAdaptivePolling: true,
      enableStateChangeDetection: true,
      enablePositionTracking: true
    });
  });

  afterEach(() => {
    if (statusPoller.isPolling) {
      statusPoller.stopPolling();
    }
    statusPoller.cleanup();
  });

  describe('constructor', () => {
    test('should create StatusPoller with valid command manager', () => {
      expect(statusPoller).toBeInstanceOf(StatusPoller);
      expect(statusPoller.commandManager).toBe(mockCommandManager);
      expect(statusPoller.isPolling).toBe(false);
    });

    test('should throw error without command manager', () => {
      expect(() => new StatusPoller()).toThrow('StatusPoller requires a command manager');
    });

    test('should apply default configuration', () => {
      const defaultPoller = new StatusPoller(mockCommandManager);
      expect(defaultPoller.config.pollInterval).toBe(250);
      expect(defaultPoller.config.enableAdaptivePolling).toBe(true);
    });

    test('should override default configuration', () => {
      expect(statusPoller.config.pollInterval).toBe(100);
    });
  });

  describe('startPolling', () => {
    test('should start polling successfully', async () => {
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 0, y: 0, z: 0 } });
      
      await statusPoller.startPolling();
      
      expect(statusPoller.isPolling).toBe(true);
      expect(statusPoller.pollTimer).not.toBeNull();
    });

    test('should not start polling if already polling', async () => {
      await statusPoller.startPolling();
      const firstTimer = statusPoller.pollTimer;
      
      await statusPoller.startPolling();
      
      expect(statusPoller.pollTimer).toBe(firstTimer);
    });

    test('should emit polling started event', async () => {
      const startedSpy = jest.fn();
      statusPoller.on('pollingStarted', startedSpy);
      
      await statusPoller.startPolling();
      
      expect(startedSpy).toHaveBeenCalledWith({
        interval: statusPoller.config.pollInterval,
        adaptivePolling: statusPoller.config.enableAdaptivePolling
      });
    });
  });

  describe('stopPolling', () => {
    test('should stop polling successfully', async () => {
      await statusPoller.startPolling();
      
      statusPoller.stopPolling();
      
      expect(statusPoller.isPolling).toBe(false);
      expect(statusPoller.pollTimer).toBeNull();
    });

    test('should emit polling stopped event', async () => {
      const stoppedSpy = jest.fn();
      statusPoller.on('pollingStopped', stoppedSpy);
      
      await statusPoller.startPolling();
      statusPoller.stopPolling();
      
      expect(stoppedSpy).toHaveBeenCalled();
    });
  });

  describe('status polling', () => {
    test('should poll status at configured interval', async () => {
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 0, y: 0, z: 0 } });
      
      await statusPoller.startPolling();
      
      // Wait for at least one poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(mockCommandManager.getCallCount('?')).toBeGreaterThan(0);
    });

    test('should detect state changes', async () => {
      const stateChangeSpy = jest.fn();
      statusPoller.on('stateChanged', stateChangeSpy);
      
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 0, y: 0, z: 0 } });
      await statusPoller.startPolling();
      
      // Wait for initial poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Change state
      mockCommandManager.setMockResponse('?', { state: 'Run', position: { x: 0, y: 0, z: 0 } });
      
      // Wait for state change detection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(stateChangeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          previousState: 'Idle',
          currentState: 'Run'
        })
      );
    });

    test('should detect position changes', async () => {
      const positionChangeSpy = jest.fn();
      statusPoller.on('positionChanged', positionChangeSpy);
      
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 0, y: 0, z: 0 } });
      await statusPoller.startPolling();
      
      // Wait for initial poll
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Change position
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 10, y: 5, z: 2 } });
      
      // Wait for position change detection
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(positionChangeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          previousPosition: { x: 0, y: 0, z: 0 },
          currentPosition: { x: 10, y: 5, z: 2 }
        })
      );
    });
  });

  describe('adaptive polling', () => {
    test('should use fast polling when machine is active', async () => {
      statusPoller.config.enableAdaptivePolling = true;
      statusPoller.config.fastPollInterval = 50;
      
      mockCommandManager.setMockResponse('?', { state: 'Run', position: { x: 0, y: 0, z: 0 } });
      await statusPoller.startPolling();
      
      // Wait for polling to adapt
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(statusPoller.currentPollInterval).toBe(50);
    });

    test('should use slow polling when machine is idle', async () => {
      statusPoller.config.enableAdaptivePolling = true;
      statusPoller.config.slowPollInterval = 500;
      
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 0, y: 0, z: 0 } });
      await statusPoller.startPolling();
      
      // Wait for polling to adapt
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(statusPoller.currentPollInterval).toBe(500);
    });
  });

  describe('error handling', () => {
    test('should handle poll timeout', async () => {
      const errorSpy = jest.fn();
      statusPoller.on('pollError', errorSpy);
      
      mockCommandManager.setMockDelay(3000); // Longer than timeout
      mockCommandManager.setMockResponse('?', { state: 'Idle' });
      
      await statusPoller.startPolling();
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'timeout'
        })
      );
    });

    test('should track missed polls', async () => {
      mockCommandManager.setMockError('?', new Error('Connection lost'));
      
      await statusPoller.startPolling();
      
      // Wait for multiple poll attempts
      await new Promise(resolve => setTimeout(resolve, 600));
      
      expect(statusPoller.missedPolls).toBeGreaterThan(0);
    });

    test('should emit error when max missed polls exceeded', async () => {
      const errorSpy = jest.fn();
      statusPoller.on('pollError', errorSpy);
      statusPoller.config.maxMissedPolls = 2;
      
      mockCommandManager.setMockError('?', new Error('Connection lost'));
      
      await statusPoller.startPolling();
      
      // Wait for max missed polls to be exceeded
      await new Promise(resolve => setTimeout(resolve, 400));
      
      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'max_missed_polls'
        })
      );
    });
  });

  describe('metrics', () => {
    test('should track polling metrics', async () => {
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 0, y: 0, z: 0 } });
      
      await statusPoller.startPolling();
      
      // Wait for some polls
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const metrics = statusPoller.getMetrics();
      expect(metrics.totalPolls).toBeGreaterThan(0);
      expect(metrics.successfulPolls).toBeGreaterThan(0);
      expect(metrics.averageResponseTime).toBeGreaterThan(0);
    });

    test('should calculate poll success rate', async () => {
      mockCommandManager.setMockResponse('?', { state: 'Idle' });
      
      await statusPoller.startPolling();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const metrics = statusPoller.getMetrics();
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(100);
    });
  });

  describe('status history', () => {
    test('should maintain status history', async () => {
      mockCommandManager.setMockResponse('?', { state: 'Idle', position: { x: 0, y: 0, z: 0 } });
      
      await statusPoller.startPolling();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const history = statusPoller.getStatusHistory();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[0]).toHaveProperty('status');
    });

    test('should limit status history size', async () => {
      statusPoller.config.maxStatusHistory = 5;
      mockCommandManager.setMockResponse('?', { state: 'Idle' });
      
      await statusPoller.startPolling();
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const history = statusPoller.getStatusHistory();
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', async () => {
      await statusPoller.startPolling();
      
      statusPoller.cleanup();
      
      expect(statusPoller.isPolling).toBe(false);
      expect(statusPoller.pollTimer).toBeNull();
      expect(statusPoller.listenerCount()).toBe(0);
    });
  });
});