/**
 * EventLoopCommandManager Tests
 * 
 * Tests for the event-driven command execution system
 */

import { jest } from '@jest/globals';
import { EventLoopCommandManager } from '../EventLoopCommandManager.js';
import { CommandQueue } from '../CommandQueue.js';
import { ResponseManager } from '../ResponseManager.js';
import { MockSerialInterface } from '../../serial/__mocks__/mock-serial-interface.js';

describe('EventLoopCommandManager', () => {
  let commandManager;
  let mockSerial;
  let config;

  beforeEach(() => {
    mockSerial = new MockSerialInterface();
    config = {
      commandTimeout: 1000,
      maxQueueSize: 10,
      maxPendingCommands: 5
    };
    commandManager = new EventLoopCommandManager(mockSerial, config);
  });

  afterEach(() => {
    commandManager.cleanup();
    mockSerial.cleanup();
  });

  test('should initialize with correct configuration', () => {
    expect(commandManager.config.commandTimeout).toBe(1000);
    expect(commandManager.config.maxQueueSize).toBe(10);
    expect(commandManager.config.maxPendingCommands).toBe(5);
  });

  test('should require serial interface', () => {
    expect(() => {
      new EventLoopCommandManager(null);
    }).toThrow('EventLoopCommandManager requires a serial interface');
  });

  test('should send commands successfully', async () => {
    await mockSerial.connect('/dev/ttyUSB0');
    
    const commandSentSpy = jest.fn();
    const commandResponseSpy = jest.fn();
    
    commandManager.on('commandSent', commandSentSpy);
    commandManager.on('commandResponse', commandResponseSpy);
    
    const response = await commandManager.sendCommand('G0 X10');
    
    expect(response).toMatchObject({
      type: 'ok',
      raw: 'ok'
    });
    
    expect(commandSentSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        command: 'G0 X10'
      })
    );
    
    // Wait for response event
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(commandResponseSpy).toHaveBeenCalled();
  });

  test('should handle command timeout', async () => {
    await mockSerial.connect('/dev/ttyUSB0');
    
    // Set a very long response delay to trigger timeout
    mockSerial.setResponseDelay(2000);
    
    const commandErrorSpy = jest.fn();
    commandManager.on('commandError', commandErrorSpy);
    
    await expect(
      commandManager.sendCommand('G0 X10', { timeout: 100 })
    ).rejects.toThrow('Command timeout');
  });

  test('should handle serial interface errors', async () => {
    await mockSerial.connect('/dev/ttyUSB0');
    
    const serialErrorSpy = jest.fn();
    commandManager.on('serialError', serialErrorSpy);
    
    // Simulate serial error
    mockSerial.simulateError(new Error('Serial port error'));
    
    expect(serialErrorSpy).toHaveBeenCalledWith(expect.any(Error));
  });

  test('should handle disconnection', async () => {
    await mockSerial.connect('/dev/ttyUSB0');
    
    const disconnectSpy = jest.fn();
    commandManager.on('disconnect', disconnectSpy);
    
    await mockSerial.disconnect();
    
    expect(disconnectSpy).toHaveBeenCalled();
  });

  test('should process command queue', async () => {
    await mockSerial.connect('/dev/ttyUSB0');
    
    const commandSentSpy = jest.fn();
    commandManager.on('commandSent', commandSentSpy);
    
    // Send multiple commands
    const promises = [
      commandManager.sendCommand('G0 X10'),
      commandManager.sendCommand('G0 Y20'),
      commandManager.sendCommand('G0 Z5')
    ];
    
    await Promise.all(promises);
    
    expect(commandSentSpy).toHaveBeenCalledTimes(3);
  });

  test('should generate unique command IDs', () => {
    const id1 = commandManager.generateCommandId();
    const id2 = commandManager.generateCommandId();
    
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^cmd_\d+_[a-z0-9]+$/);
  });

  test('should parse GRBL responses correctly', () => {
    const okResponse = commandManager.parseResponse('ok');
    expect(okResponse.type).toBe('ok');
    
    const errorResponse = commandManager.parseResponse('error:1');
    expect(errorResponse.type).toBe('error');
    expect(errorResponse.code).toBe(1);
    
    const statusResponse = commandManager.parseResponse('<Idle|MPos:0,0,0>');
    expect(statusResponse.type).toBe('status');
    
    const alarmResponse = commandManager.parseResponse('ALARM:1');
    expect(alarmResponse.type).toBe('alarm');
    expect(alarmResponse.code).toBe(1);
  });

  test('should provide status information', () => {
    const status = commandManager.getStatus();
    
    expect(status).toHaveProperty('queue');
    expect(status).toHaveProperty('pending');
    expect(status).toHaveProperty('processing');
    expect(status).toHaveProperty('stats');
    
    expect(status.queue).toHaveProperty('size');
    expect(status.queue).toHaveProperty('capacity');
    expect(status.queue).toHaveProperty('utilization');
    
    expect(status.stats).toHaveProperty('commandsSent');
    expect(status.stats).toHaveProperty('commandsCompleted');
    expect(status.stats).toHaveProperty('averageResponseTime');
  });

  test('should clear all commands', () => {
    const result = commandManager.clearAll();
    
    expect(result).toHaveProperty('queued');
    expect(result).toHaveProperty('pending');
  });

  test('should handle unsolicited data', async () => {
    await mockSerial.connect('/dev/ttyUSB0');
    
    const unsolicitedSpy = jest.fn();
    commandManager.on('unsolicitedData', unsolicitedSpy);
    
    // Simulate unsolicited data (no pending commands)
    mockSerial.simulateData('<Idle|MPos:0,0,0>');
    
    expect(unsolicitedSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: '<Idle|MPos:0,0,0>'
      })
    );
  });

  test('should cleanup properly', () => {
    const stopProcessingSpy = jest.spyOn(commandManager, 'stopProcessingLoop');
    const clearAllSpy = jest.spyOn(commandManager, 'clearAll');
    const removeListenersSpy = jest.spyOn(commandManager, 'removeAllListeners');
    
    commandManager.cleanup();
    
    expect(stopProcessingSpy).toHaveBeenCalled();
    expect(clearAllSpy).toHaveBeenCalled();
    expect(removeListenersSpy).toHaveBeenCalled();
  });
});

describe('CommandQueue', () => {
  let queue;

  beforeEach(() => {
    queue = new CommandQueue({ maxQueueSize: 3 });
  });

  test('should enqueue and dequeue commands', () => {
    const command1 = { id: '1', command: 'G0 X10' };
    const command2 = { id: '2', command: 'G0 Y20' };
    
    expect(queue.enqueue(command1)).toBe(true);
    expect(queue.enqueue(command2)).toBe(true);
    expect(queue.size()).toBe(2);
    
    const dequeued1 = queue.dequeue();
    expect(dequeued1.id).toBe('1');
    expect(queue.size()).toBe(1);
    
    const dequeued2 = queue.dequeue();
    expect(dequeued2.id).toBe('2');
    expect(queue.size()).toBe(0);
  });

  test('should reject commands when full', () => {
    for (let i = 0; i < 3; i++) {
      expect(queue.enqueue({ id: i.toString(), command: `G0 X${i}` })).toBe(true);
    }
    
    expect(queue.enqueue({ id: '4', command: 'G0 X40' })).toBe(false);
    expect(queue.size()).toBe(3);
  });

  test('should provide queue statistics', () => {
    queue.enqueue({ id: '1', command: 'G0 X10' });
    
    const stats = queue.getStats();
    expect(stats.size).toBe(1);
    expect(stats.capacity).toBe(3);
    expect(stats.utilization).toBeCloseTo(33.33, 1);
    expect(stats.isEmpty).toBe(false);
    expect(stats.isFull).toBe(false);
  });

  test('should clear all commands', () => {
    queue.enqueue({ id: '1', command: 'G0 X10' });
    queue.enqueue({ id: '2', command: 'G0 Y20' });
    
    const cleared = queue.clear();
    expect(cleared).toHaveLength(2);
    expect(queue.size()).toBe(0);
  });

  test('should remove commands by ID', () => {
    queue.enqueue({ id: '1', command: 'G0 X10' });
    queue.enqueue({ id: '2', command: 'G0 Y20' });
    
    const removed = queue.removeById('1');
    expect(removed.id).toBe('1');
    expect(queue.size()).toBe(1);
    
    const notFound = queue.removeById('99');
    expect(notFound).toBe(null);
  });
});

describe('ResponseManager', () => {
  let responseManager;

  beforeEach(() => {
    responseManager = new ResponseManager({ maxPendingCommands: 3 });
  });

  test('should add and resolve pending commands', () => {
    const command = {
      id: 'cmd1',
      command: 'G0 X10',
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1000
    };
    
    expect(responseManager.addPending('cmd1', command)).toBe(true);
    expect(responseManager.isPending('cmd1')).toBe(true);
    expect(responseManager.getPendingCount()).toBe(1);
    
    const response = { type: 'ok', raw: 'ok' };
    expect(responseManager.resolve('cmd1', response)).toBe(true);
    expect(responseManager.isPending('cmd1')).toBe(false);
    expect(responseManager.getPendingCount()).toBe(0);
    
    expect(command.resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ok',
        commandId: 'cmd1'
      })
    );
  });

  test('should reject pending commands', () => {
    const command = {
      id: 'cmd1',
      command: 'G0 X10',
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 1000
    };
    
    responseManager.addPending('cmd1', command);
    
    const error = new Error('Test error');
    expect(responseManager.reject('cmd1', error)).toBe(true);
    expect(responseManager.isPending('cmd1')).toBe(false);
    
    expect(command.reject).toHaveBeenCalledWith(error);
  });

  test('should handle command timeout', (done) => {
    const command = {
      id: 'cmd1',
      command: 'G0 X10',
      resolve: jest.fn(),
      reject: jest.fn(),
      timeout: 50
    };
    
    responseManager.addPending('cmd1', command);
    
    setTimeout(() => {
      expect(responseManager.isPending('cmd1')).toBe(false);
      expect(command.reject).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'COMMAND_TIMEOUT'
        })
      );
      done();
    }, 100);
  });

  test('should get oldest pending command', () => {
    const command1 = { id: 'cmd1', command: 'G0 X10', addedAt: 100 };
    const command2 = { id: 'cmd2', command: 'G0 Y20', addedAt: 200 };
    
    responseManager.pendingCommands.set('cmd1', command1);
    responseManager.pendingCommands.set('cmd2', command2);
    
    const oldest = responseManager.getOldestPending();
    expect(oldest.commandId).toBe('cmd1');
  });

  test('should clear all pending commands', () => {
    const command1 = { id: 'cmd1', reject: jest.fn() };
    const command2 = { id: 'cmd2', reject: jest.fn() };
    
    responseManager.pendingCommands.set('cmd1', command1);
    responseManager.pendingCommands.set('cmd2', command2);
    
    const cleared = responseManager.clearAll('Test reason');
    expect(cleared).toHaveLength(2);
    expect(responseManager.getPendingCount()).toBe(0);
    
    expect(command1.reject).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'COMMAND_CANCELLED'
      })
    );
  });

  test('should provide pending statistics', () => {
    responseManager.addPending('cmd1', { command: 'G0 X10' });
    
    const stats = responseManager.getStats();
    expect(stats.count).toBe(1);
    expect(stats.maxCapacity).toBe(3);
    expect(stats.utilization).toBeCloseTo(33.33, 1);
  });
});