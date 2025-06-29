/**
 * Mock Web Serial API for Testing
 * 
 * Provides a complete mock implementation of the Web Serial API
 * for testing WebSerialAdapter in Node.js environments.
 */

export class MockSerialPort {
  constructor(options = {}) {
    this.options = options;
    this.isOpen = false;
    this.readable = new MockReadableStream();
    this.writable = new MockWritableStream();
    this.info = {
      usbVendorId: options.usbVendorId || 0x1a86,
      usbProductId: options.usbProductId || 0x7523
    };
  }

  async open(options) {
    if (this.isOpen) {
      throw new Error('Port already open');
    }
    
    this.isOpen = true;
    this.options = { ...this.options, ...options };
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  async close() {
    if (!this.isOpen) {
      return;
    }
    
    this.isOpen = false;
    
    // Signal streams to close
    this.readable.close();
    this.writable.close();
    
    // Simulate close delay
    await new Promise(resolve => setTimeout(resolve, 5));
  }

  getInfo() {
    return { ...this.info };
  }

  // Test utilities
  simulateData(data) {
    if (this.isOpen) {
      this.readable.enqueue(data);
    }
  }

  getWrittenData() {
    return this.writable.getWrittenData();
  }

  clearWrittenData() {
    this.writable.clearWrittenData();
  }
}

class MockReadableStream {
  constructor() {
    this.reader = null;
    this.dataQueue = [];
    this.closed = false;
  }

  getReader() {
    if (this.reader) {
      throw new Error('Reader already exists');
    }
    
    this.reader = new MockReader(this);
    return this.reader;
  }

  enqueue(data) {
    if (!this.closed && this.reader) {
      this.reader.enqueue(data);
    }
  }

  close() {
    this.closed = true;
    if (this.reader) {
      this.reader.close();
    }
  }
}

class MockReader {
  constructor(stream) {
    this.stream = stream;
    this.dataQueue = [];
    this.waitingResolve = null;
    this.closed = false;
    this.cancelled = false;
  }

  async read() {
    if (this.cancelled) {
      return { done: true, value: undefined };
    }

    if (this.dataQueue.length > 0) {
      const value = this.dataQueue.shift();
      return { done: false, value };
    }

    if (this.closed) {
      return { done: true, value: undefined };
    }

    // Wait for data
    return new Promise((resolve) => {
      this.waitingResolve = resolve;
    });
  }

  async cancel() {
    this.cancelled = true;
    if (this.waitingResolve) {
      this.waitingResolve({ done: true, value: undefined });
      this.waitingResolve = null;
    }
  }

  releaseLock() {
    this.stream.reader = null;
  }

  enqueue(data) {
    if (this.cancelled || this.closed) {
      return;
    }

    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(data);

    if (this.waitingResolve) {
      this.waitingResolve({ done: false, value: uint8Array });
      this.waitingResolve = null;
    } else {
      this.dataQueue.push(uint8Array);
    }
  }

  close() {
    this.closed = true;
    if (this.waitingResolve) {
      this.waitingResolve({ done: true, value: undefined });
      this.waitingResolve = null;
    }
  }
}

class MockWritableStream {
  constructor() {
    this.writer = null;
    this.writtenData = [];
    this.closed = false;
  }

  getWriter() {
    if (this.writer) {
      throw new Error('Writer already exists');
    }
    
    this.writer = new MockWriter(this);
    return this.writer;
  }

  close() {
    this.closed = true;
  }

  getWrittenData() {
    return [...this.writtenData];
  }

  clearWrittenData() {
    this.writtenData = [];
  }
}

class MockWriter {
  constructor(stream) {
    this.stream = stream;
  }

  async write(data) {
    if (this.stream.closed) {
      throw new Error('Stream is closed');
    }

    const decoder = new TextDecoder();
    const text = decoder.decode(data);
    
    this.stream.writtenData.push({
      data: text,
      timestamp: Date.now()
    });

    // Simulate write delay
    await new Promise(resolve => setTimeout(resolve, 1));
  }

  releaseLock() {
    this.stream.writer = null;
  }
}

// Mock navigator.serial API
export const mockNavigatorSerial = {
  requestPort: async (options = {}) => {
    // Simulate user selection delay
    await new Promise(resolve => setTimeout(resolve, 10));
    
    return new MockSerialPort({
      usbVendorId: 0x1a86,
      usbProductId: 0x7523
    });
  },

  getPorts: async () => {
    // Return some mock authorized ports
    return [
      new MockSerialPort({ usbVendorId: 0x1a86, usbProductId: 0x7523 }),
      new MockSerialPort({ usbVendorId: 0x0403, usbProductId: 0x6001 })
    ];
  }
};

// Helper to mock navigator.serial in tests
export function mockWebSerial() {
  if (typeof global !== 'undefined') {
    global.navigator = global.navigator || {};
    global.navigator.serial = mockNavigatorSerial;
  }
  
  if (typeof window !== 'undefined') {
    window.navigator = window.navigator || {};
    window.navigator.serial = mockNavigatorSerial;
  }
}

// Helper to restore navigator.serial
export function restoreWebSerial() {
  if (typeof global !== 'undefined' && global.navigator) {
    delete global.navigator.serial;
  }
  
  if (typeof window !== 'undefined' && window.navigator) {
    delete window.navigator.serial;
  }
}