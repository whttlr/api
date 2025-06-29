/**
 * Mock Serial Port for Testing
 */

export class MockSerialPort {
  constructor(options) {
    this.path = options.path;
    this.isOpen = false;
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => callback(data));
    }
  }

  open() {
    setTimeout(() => {
      this.isOpen = true;
      this.emit('open');
    }, 10);
  }

  close(callback) {
    this.isOpen = false;
    this.emit('close');
    if (callback) callback();
  }

  pipe(parser) {
    parser.emit = (event, data) => {
      if (event === 'data') {
        // Simulate cleaned data
      }
    };
    return parser;
  }

  static async list() {
    return [
      { path: '/dev/ttyUSB0', manufacturer: 'Mock Manufacturer' },
      { path: '/dev/ttyUSB1', manufacturer: 'Test Device' }
    ];
  }
}