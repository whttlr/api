/**
 * Serial Interface Tests
 * 
 * Tests for the serial interface abstraction layer
 * including NodeSerialAdapter and WebSerialAdapter
 */

import { jest } from '@jest/globals';
import { SerialInterface } from '../SerialInterface.js';
import { NodeSerialAdapter } from '../NodeSerialAdapter.js';
import { WebSerialAdapter } from '../WebSerialAdapter.js';
import { createSerialInterface, getAvailableInterfaces } from '../index.js';
import { MockSerialInterface } from '../__mocks__/mock-serial-interface.js';
import { mockWebSerial, restoreWebSerial } from '../__mocks__/mock-web-serial.js';

describe('SerialInterface Base Class', () => {
  let serialInterface;

  beforeEach(() => {
    serialInterface = new SerialInterface();
  });

  test('should be an EventEmitter', () => {
    expect(serialInterface.on).toBeDefined();
    expect(serialInterface.emit).toBeDefined();
  });

  test('should throw error for unimplemented methods', async () => {
    await expect(serialInterface.connect()).rejects.toThrow('Not implemented');
    await expect(serialInterface.disconnect()).rejects.toThrow('Not implemented');
    await expect(serialInterface.write()).rejects.toThrow('Not implemented');
    await expect(serialInterface.listPorts()).rejects.toThrow('Not implemented');
  });

  test('should provide event handler methods', () => {
    const dataCallback = jest.fn();
    const errorCallback = jest.fn();
    const disconnectCallback = jest.fn();
    const connectCallback = jest.fn();

    serialInterface.onData(dataCallback);
    serialInterface.onError(errorCallback);
    serialInterface.onDisconnect(disconnectCallback);
    serialInterface.onConnect(connectCallback);

    serialInterface.emit('data', 'test');
    serialInterface.emit('error', new Error('test'));
    serialInterface.emit('disconnect');
    serialInterface.emit('connect');

    expect(dataCallback).toHaveBeenCalledWith('test');
    expect(errorCallback).toHaveBeenCalledWith(expect.any(Error));
    expect(disconnectCallback).toHaveBeenCalled();
    expect(connectCallback).toHaveBeenCalled();
  });

  test('should provide connection status', () => {
    const status = serialInterface.getConnectionStatus();
    expect(status).toHaveProperty('connected', false);
    expect(status).toHaveProperty('connectionInfo', null);
  });

  test('should cleanup properly', () => {
    const listenerSpy = jest.spyOn(serialInterface, 'removeAllListeners');
    
    serialInterface.cleanup();
    
    expect(listenerSpy).toHaveBeenCalled();
    expect(serialInterface.isConnected).toBe(false);
    expect(serialInterface.connectionInfo).toBe(null);
  });
});

describe('createSerialInterface Factory', () => {
  afterEach(() => {
    restoreWebSerial();
  });

  test('should create NodeSerialAdapter in Node.js environment', () => {
    const serialInterface = createSerialInterface();
    expect(serialInterface).toBeInstanceOf(NodeSerialAdapter);
  });

  test('should create WebSerialAdapter when forced', () => {
    mockWebSerial();
    
    const serialInterface = createSerialInterface({ forceAdapter: 'web' });
    expect(serialInterface).toBeInstanceOf(WebSerialAdapter);
  });

  test('should create NodeSerialAdapter when forced', () => {
    const serialInterface = createSerialInterface({ forceAdapter: 'node' });
    expect(serialInterface).toBeInstanceOf(NodeSerialAdapter);
  });

  test('should throw error for unknown adapter', () => {
    expect(() => {
      createSerialInterface({ forceAdapter: 'unknown' });
    }).toThrow('Unknown serial adapter: unknown');
  });

  test('should throw error when no compatible interface available', () => {
    const originalProcess = global.process;
    const originalWindow = global.window;
    
    delete global.process;
    delete global.window;
    
    expect(() => {
      createSerialInterface();
    }).toThrow('No compatible serial interface available');
    
    global.process = originalProcess;
    global.window = originalWindow;
  });
});

describe('getAvailableInterfaces', () => {
  afterEach(() => {
    restoreWebSerial();
  });

  test('should detect Node.js environment', () => {
    const interfaces = getAvailableInterfaces();
    
    expect(interfaces.environment.isNode).toBe(true);
    expect(interfaces.available.nodeSerial).toBe(true);
    expect(interfaces.recommended).toBe('NodeSerialAdapter');
  });

  test('should detect Web Serial API when available', () => {
    mockWebSerial();
    
    const interfaces = getAvailableInterfaces();
    
    expect(interfaces.environment.hasWebSerial).toBe(true);
    expect(interfaces.available.webSerial).toBe(false); // Still false in Node.js test environment
  });
});

describe('MockSerialInterface', () => {
  let mockInterface;

  beforeEach(() => {
    mockInterface = new MockSerialInterface();
  });

  afterEach(() => {
    mockInterface.cleanup();
  });

  test('should connect and disconnect successfully', async () => {
    const connectSpy = jest.fn();
    const disconnectSpy = jest.fn();
    
    mockInterface.on('connect', connectSpy);
    mockInterface.on('disconnect', disconnectSpy);

    await mockInterface.connect('/dev/ttyUSB0', 115200);
    expect(mockInterface.isConnected).toBe(true);
    expect(mockInterface.connectionInfo).toMatchObject({
      portPath: '/dev/ttyUSB0',
      baudRate: 115200
    });

    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async events
    expect(connectSpy).toHaveBeenCalled();

    await mockInterface.disconnect();
    expect(mockInterface.isConnected).toBe(false);

    await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async events
    expect(disconnectSpy).toHaveBeenCalled();
  });

  test('should write data and track it', async () => {
    await mockInterface.connect('/dev/ttyUSB0');
    
    await mockInterface.write('G0 X10');
    await mockInterface.write('G0 Y20');
    
    const writtenData = mockInterface.getWrittenData();
    expect(writtenData).toHaveLength(2);
    expect(writtenData[0].data).toBe('G0 X10');
    expect(writtenData[1].data).toBe('G0 Y20');
  });

  test('should simulate responses automatically', async () => {
    const dataSpy = jest.fn();
    mockInterface.on('data', dataSpy);
    
    await mockInterface.connect('/dev/ttyUSB0');
    await mockInterface.write('?');
    
    await new Promise(resolve => setTimeout(resolve, 20)); // Wait for mock response
    
    expect(dataSpy).toHaveBeenCalledWith('<Idle|MPos:0.000,0.000,0.000|FS:0,0>');
  });

  test('should use mock responses when provided', async () => {
    const dataSpy = jest.fn();
    mockInterface.on('data', dataSpy);
    
    mockInterface.addMockResponse('custom response');
    
    await mockInterface.connect('/dev/ttyUSB0');
    await mockInterface.write('test command');
    
    await new Promise(resolve => setTimeout(resolve, 20)); // Wait for mock response
    
    expect(dataSpy).toHaveBeenCalledWith('custom response');
  });

  test('should simulate connection failures', async () => {
    mockInterface.setConnectionFailure(true);
    
    await expect(mockInterface.connect('/dev/ttyUSB0')).rejects.toThrow('Mock connection failure');
  });

  test('should simulate write failures', async () => {
    await mockInterface.connect('/dev/ttyUSB0');
    mockInterface.setWriteFailure(true);
    
    await expect(mockInterface.write('test')).rejects.toThrow('Mock write failure');
  });

  test('should list mock ports', async () => {
    const ports = await mockInterface.listPorts();
    
    expect(ports).toHaveLength(2);
    expect(ports[0]).toMatchObject({
      path: '/dev/ttyUSB0',
      manufacturer: 'Test Manufacturer'
    });
  });

  test('should reset to initial state', () => {
    mockInterface.isConnected = true;
    mockInterface.writtenData = ['test'];
    mockInterface.addMockResponse('test');
    
    mockInterface.reset();
    
    expect(mockInterface.isConnected).toBe(false);
    expect(mockInterface.writtenData).toHaveLength(0);
    expect(mockInterface.mockResponses).toHaveLength(0);
  });
});