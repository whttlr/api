/**
 * Shared Configuration Module
 * 
 * Provides a singleton config loader to eliminate duplication
 * across multiple files.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { error } from '../lib/logger/LoggerService.js';

class Config {
  static instance = null;
  static config = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new Config();
      this.loadConfig();
    }
    return this.instance;
  }

  static loadConfig() {
    if (!this.config) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      // Handle both bundled and non-bundled path resolution
      let configPath;
      if (__dirname.includes('dist')) {
        // When running from bundled dist file
        configPath = join(process.cwd(), 'config.json');
      } else {
        // When running from source
        configPath = join(__dirname, '../../config.json');
      }
      
      try {
        this.config = JSON.parse(readFileSync(configPath, 'utf8'));
      } catch (err) {
        error('Failed to load config.json', { error: err.message });
        // Provide minimal fallback config
        this.config = {
          defaultPort: '/dev/tty.usbmodem1101',
          debug: false,
          timeouts: {
            connection: 5000,
            command: 10000,
            emergency: 15000,
            initialization: 2000
          },
          // New event loop configuration
          eventLoop: {
            commandTimeout: 5000,
            queueProcessingInterval: 10,
            maxQueueSize: 100,
            maxPendingCommands: 50,
            enableRealTimeStatus: true
          },
          // New Web Serial API configuration
          webSerial: {
            enabled: typeof navigator !== 'undefined' && 'serial' in navigator,
            requestOptions: {
              filters: [
                { usbVendorId: 0x1a86 }, // CH340
                { usbVendorId: 0x0403 }, // FTDI
                { usbVendorId: 0x10c4 }, // CP210x
              ]
            },
            connectionOptions: {
              baudRate: 115200,
              dataBits: 8,
              stopBits: 1,
              parity: 'none',
              flowControl: 'none'
            }
          },
          // Enhanced serial configuration
          serialPort: {
            baudRate: 115200,
            timeout: 5000,
            autoDetect: true,
            preferredPorts: [
              '/dev/ttyUSB0',
              '/dev/ttyACM0',
              'COM3',
              'COM4'
            ]
          }
        };
      }
    }
  }

  static get() {
    if (!this.config) {
      this.getInstance();
    }
    return this.config;
  }

  static set(key, value) {
    if (!this.config) {
      this.getInstance();
    }
    this.config[key] = value;
  }

  static getDebug() {
    return this.get().debug || false;
  }

  static getDefaultPort() {
    return this.get().defaultPort || '/dev/tty.usbmodem1101';
  }

  static getTimeouts() {
    return this.get().timeouts || {
      connection: 5000,
      command: 10000,
      emergency: 15000,
      initialization: 2000
    };
  }

  static getMachineLimits() {
    return this.get().machineLimits || {
      z: { max: 40, min: -28, totalTravel: 78.5 },
      y: { max: 200, min: -30, totalTravel: 241.5 },
      x: { max: 60, min: -20, totalTravel: 86.5 }
    };
  }

  static getGrblSettings() {
    return this.get().grbl || {
      lineEnding: '\r\n',
      initCommands: ['\r\n'],
      statusCommand: '?',
      settingsCommand: '$$',
      unlockCommand: '$X',
      homeCommand: '$H',
      resetCommand: '\x18'
    };
  }

  /**
   * Get event loop configuration for EventLoopCommandManager
   */
  static getEventLoopConfig() {
    return this.get().eventLoop || {
      commandTimeout: 5000,
      queueProcessingInterval: 10,
      maxQueueSize: 100,
      maxPendingCommands: 50,
      enableRealTimeStatus: true
    };
  }

  /**
   * Get Web Serial API configuration
   */
  static getWebSerialConfig() {
    return this.get().webSerial || {
      enabled: typeof navigator !== 'undefined' && 'serial' in navigator,
      requestOptions: {
        filters: [
          { usbVendorId: 0x1a86 }, // CH340
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x10c4 }, // CP210x
        ]
      },
      connectionOptions: {
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none'
      }
    };
  }

  /**
   * Get enhanced serial port configuration
   */
  static getSerialPortConfig() {
    return this.get().serialPort || {
      baudRate: 115200,
      timeout: 5000,
      autoDetect: true,
      preferredPorts: [
        '/dev/ttyUSB0',
        '/dev/ttyACM0',
        'COM3',
        'COM4'
      ]
    };
  }

  /**
   * Check if Web Serial API is available and enabled
   */
  static isWebSerialAvailable() {
    const config = this.getWebSerialConfig();
    return config.enabled && typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Get serial interface preferences
   */
  static getSerialInterfacePreferences() {
    return {
      preferWeb: this.get().preferWebSerial || false,
      fallbackToNode: this.get().fallbackToNode !== false,
      autoDetect: this.get().autoDetectSerial !== false
    };
  }
}

// Export both the class and a convenience function
export { Config };
export const getConfig = () => Config.get();
export default Config;