/**
 * Simple unit tests for runInteractive utility
 */

import { runInteractive } from '../runInteractive.js';

describe('runInteractive', () => {
  describe('function structure', () => {
    test('should be a function', () => {
      expect(typeof runInteractive).toBe('function');
    });

    test('should accept sender parameter', () => {
      expect(runInteractive.length).toBeGreaterThanOrEqual(1);
    });

    test('should return a Promise when called with valid sender', () => {
      const mockSender = {
        getAvailablePorts: () => Promise.resolve([]),
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        sendGcode: () => Promise.resolve({ success: true }),
        isConnected: false
      };

      const result = runInteractive(mockSender);
      expect(result).toBeInstanceOf(Promise);
      
      // Clean up the promise to avoid hanging test
      result.catch(() => {});
    });
  });
});