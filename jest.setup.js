// Jest setup file for globals
import { jest } from '@jest/globals';

// Make jest available globally
global.jest = jest;

// Global mocks for commonly used modules
jest.unstable_mockModule('./src/i18n.js', () => ({
  default: {
    t: jest.fn((key, params) => params ? `${key}_${JSON.stringify(params)}` : key)
  }
}));