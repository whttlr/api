/**
 * RetryManager Test Suite
 * 
 * Tests for retry management functionality including
 * exponential backoff, circuit breaker patterns, and retry strategies.
 */

import { RetryManager } from '../RetryManager.js';
import { MockCommandManager } from '../__mocks__/MockCommandManager.js';

describe('RetryManager', () => {
  let retryManager;
  let mockCommandManager;

  beforeEach(() => {
    mockCommandManager = new MockCommandManager();
    retryManager = new RetryManager({
      maxRetries: 3,
      initialDelay: 100,
      maxDelay: 1000,
      backoffMultiplier: 2,
      jitterMax: 10,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3
    });
  });

  afterEach(() => {
    retryManager.cleanup();
  });

  describe('constructor', () => {
    test('should create RetryManager with default configuration', () => {
      const defaultManager = new RetryManager();
      expect(defaultManager).toBeInstanceOf(RetryManager);
      expect(defaultManager.config.maxRetries).toBe(3);
    });

    test('should apply custom configuration', () => {
      expect(retryManager.config.maxRetries).toBe(3);
      expect(retryManager.config.initialDelay).toBe(100);
      expect(retryManager.config.backoffMultiplier).toBe(2);
    });

    test('should initialize with default retry strategies', () => {
      expect(retryManager.config.retryStrategies.movement.maxRetries).toBe(2);
      expect(retryManager.config.retryStrategies.probe.maxRetries).toBe(0);
    });
  });

  describe('basic retry functionality', () => {
    test('should execute function successfully without retries', async () => {
      const successfulFunction = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(
        successfulFunction,
        { commandType: 'movement' }
      );

      expect(result).toBe('success');
      expect(successfulFunction).toHaveBeenCalledTimes(1);
    });

    test('should retry failed function up to max attempts', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement', errorType: 'timeout' }
      );

      expect(result).toBe('success');
      expect(failingFunction).toHaveBeenCalledTimes(3);
    });

    test('should fail after max retries exceeded', async () => {
      const alwaysFailingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      await expect(
        retryManager.executeWithRetry(
          alwaysFailingFunction,
          { commandType: 'movement', errorType: 'timeout' }
        )
      ).rejects.toThrow('Max retries exceeded');

      expect(alwaysFailingFunction).toHaveBeenCalledTimes(4); // Original + 3 retries
    });

    test('should not retry non-retryable errors', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('syntax_error'));

      await expect(
        retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'movement', errorType: 'syntax_error' }
        )
      ).rejects.toThrow('syntax_error');

      expect(failingFunction).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('exponential backoff', () => {
    test('should apply exponential backoff between retries', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      await retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement', errorType: 'timeout' }
      );

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Should have waited at least for first two backoff periods
      // First retry: 100ms, Second retry: 200ms = 300ms minimum
      expect(totalTime).toBeGreaterThan(250); // Allow some tolerance
    });

    test('should respect maximum delay limit', async () => {
      retryManager.config.maxDelay = 200;
      retryManager.config.backoffMultiplier = 10; // Very high multiplier

      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      const startTime = Date.now();
      
      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'movement', errorType: 'timeout' }
        );
      } catch (err) {
        // Expected to fail
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // With maxDelay=200, total time should be reasonable
      expect(totalTime).toBeLessThan(1000);
    });

    test('should apply jitter to retry delays', async () => {
      retryManager.config.jitterMax = 50;
      
      const delays = [];
      const originalDelay = retryManager.calculateDelay;
      retryManager.calculateDelay = jest.fn((attempt) => {
        const delay = originalDelay.call(retryManager, attempt);
        delays.push(delay);
        return delay;
      });

      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'movement', errorType: 'timeout' }
        );
      } catch (err) {
        // Expected to fail
      }

      // Delays should vary due to jitter
      expect(delays.length).toBeGreaterThan(1);
      expect(delays[0]).not.toBe(delays[1]); // Jitter should make them different
    });
  });

  describe('command-specific retry strategies', () => {
    test('should use movement-specific retry strategy', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'movement', errorType: 'timeout' }
        );
      } catch (err) {
        // Expected to fail
      }

      // Movement strategy allows max 2 retries
      expect(failingFunction).toHaveBeenCalledTimes(3); // Original + 2 retries
    });

    test('should not retry probe commands', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      await expect(
        retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'probe', errorType: 'timeout' }
        )
      ).rejects.toThrow('timeout');

      // Probe strategy allows 0 retries
      expect(failingFunction).toHaveBeenCalledTimes(1);
    });

    test('should use homing-specific retry strategy', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'homing', errorType: 'timeout' }
        );
      } catch (err) {
        // Expected to fail
      }

      // Homing strategy allows max 1 retry
      expect(failingFunction).toHaveBeenCalledTimes(2); // Original + 1 retry
    });

    test('should override strategy with custom options', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { 
            commandType: 'movement', 
            errorType: 'timeout',
            maxRetries: 5, // Override movement strategy
            initialDelay: 50
          }
        );
      } catch (err) {
        // Expected to fail
      }

      expect(failingFunction).toHaveBeenCalledTimes(6); // Original + 5 retries
    });
  });

  describe('circuit breaker pattern', () => {
    test('should open circuit after threshold failures', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      // Execute enough failures to trigger circuit breaker
      for (let i = 0; i < 3; i++) {
        try {
          await retryManager.executeWithRetry(
            failingFunction,
            { commandType: 'movement', errorType: 'timeout' }
          );
        } catch (err) {
          // Expected to fail
        }
      }

      expect(retryManager.circuitBreakerState).toBe('open');
    });

    test('should reject immediately when circuit is open', async () => {
      // Force circuit breaker open
      retryManager.openCircuitBreaker();

      const functionSpy = jest.fn();

      await expect(
        retryManager.executeWithRetry(
          functionSpy,
          { commandType: 'movement', errorType: 'timeout' }
        )
      ).rejects.toThrow('Circuit breaker is open');

      expect(functionSpy).not.toHaveBeenCalled();
    });

    test('should transition to half-open after timeout', async () => {
      retryManager.config.circuitBreakerTimeout = 100; // Short timeout for testing
      
      // Open circuit breaker
      retryManager.openCircuitBreaker();
      expect(retryManager.circuitBreakerState).toBe('open');

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(retryManager.circuitBreakerState).toBe('half-open');
    });

    test('should close circuit after successful execution in half-open state', async () => {
      retryManager.circuitBreakerState = 'half-open';

      const successfulFunction = jest.fn().mockResolvedValue('success');

      await retryManager.executeWithRetry(
        successfulFunction,
        { commandType: 'movement' }
      );

      expect(retryManager.circuitBreakerState).toBe('closed');
    });

    test('should reopen circuit if failure occurs in half-open state', async () => {
      retryManager.circuitBreakerState = 'half-open';

      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'movement', errorType: 'timeout' }
        );
      } catch (err) {
        // Expected to fail
      }

      expect(retryManager.circuitBreakerState).toBe('open');
    });
  });

  describe('retry statistics', () => {
    test('should track retry statistics', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      await retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement', errorType: 'timeout' }
      );

      const stats = retryManager.getRetryStatistics();

      expect(stats.totalRetries).toBe(1);
      expect(stats.totalExecutions).toBe(1);
      expect(stats.successRate).toBeGreaterThan(0);
    });

    test('should track failure statistics', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'movement', errorType: 'timeout' }
        );
      } catch (err) {
        // Expected to fail
      }

      const stats = retryManager.getRetryStatistics();

      expect(stats.totalFailures).toBe(1);
      expect(stats.failuresByErrorType.timeout).toBe(1);
    });

    test('should track command type statistics', async () => {
      const movementFunction = jest.fn().mockResolvedValue('success');
      const homingFunction = jest.fn().mockResolvedValue('success');

      await retryManager.executeWithRetry(
        movementFunction,
        { commandType: 'movement' }
      );

      await retryManager.executeWithRetry(
        homingFunction,
        { commandType: 'homing' }
      );

      const stats = retryManager.getRetryStatistics();

      expect(stats.commandTypeStats.movement.executions).toBe(1);
      expect(stats.commandTypeStats.homing.executions).toBe(1);
    });
  });

  describe('retry history', () => {
    test('should maintain retry history', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue('success');

      await retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement', errorType: 'timeout' }
      );

      const history = retryManager.getRetryHistory();

      expect(history.length).toBe(1);
      expect(history[0]).toHaveProperty('attempts');
      expect(history[0]).toHaveProperty('finalResult');
      expect(history[0]).toHaveProperty('totalTime');
    });

    test('should limit retry history size', async () => {
      retryManager.config.maxHistorySize = 2;

      const successfulFunction = jest.fn().mockResolvedValue('success');

      // Execute more operations than history limit
      for (let i = 0; i < 5; i++) {
        await retryManager.executeWithRetry(
          successfulFunction,
          { commandType: 'movement' }
        );
      }

      const history = retryManager.getRetryHistory();
      expect(history.length).toBe(2);
    });
  });

  describe('error classification integration', () => {
    test('should classify errors before determining retry strategy', async () => {
      const classifySpy = jest.spyOn(retryManager, 'classifyError');
      
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('Connection timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'movement' }
        );
      } catch (err) {
        // Expected to fail
      }

      expect(classifySpy).toHaveBeenCalled();
    });

    test('should use classified error type for retry decisions', async () => {
      retryManager.setErrorClassifier((error) => ({
        type: 'temporary_error',
        retryable: true,
        severity: 'low'
      }));

      const failingFunction = jest.fn()
        .mockRejectedValueOnce(new Error('Unknown error'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement' }
      );

      expect(result).toBe('success');
      expect(failingFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe('custom retry strategies', () => {
    test('should allow custom retry strategies', async () => {
      const customStrategy = {
        maxRetries: 5,
        initialDelay: 50,
        backoffMultiplier: 1.5
      };

      retryManager.setCustomStrategy('custom_command', customStrategy);

      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      try {
        await retryManager.executeWithRetry(
          failingFunction,
          { commandType: 'custom_command', errorType: 'timeout' }
        );
      } catch (err) {
        // Expected to fail
      }

      expect(failingFunction).toHaveBeenCalledTimes(6); // Original + 5 retries
    });

    test('should support conditional retry strategies', async () => {
      retryManager.setConditionalStrategy('movement', (error, context) => {
        if (context.machineState === 'ALARM') {
          return { maxRetries: 0 }; // Don't retry in alarm state
        }
        return { maxRetries: 3 }; // Normal retry
      });

      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      await expect(
        retryManager.executeWithRetry(
          failingFunction,
          { 
            commandType: 'movement',
            errorType: 'timeout',
            machineState: 'ALARM'
          }
        )
      ).rejects.toThrow('timeout');

      expect(failingFunction).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('retry cancellation', () => {
    test('should support retry cancellation', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      const retryPromise = retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement', errorType: 'timeout' }
      );

      // Cancel after short delay
      setTimeout(() => retryManager.cancelCurrentRetry(), 50);

      await expect(retryPromise).rejects.toThrow('Retry cancelled');
    });

    test('should clean up cancelled retries', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      const retryPromise = retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement', errorType: 'timeout' }
      );

      setTimeout(() => retryManager.cancelCurrentRetry(), 50);

      try {
        await retryPromise;
      } catch (err) {
        // Expected to be cancelled
      }

      expect(retryManager.activeRetries.size).toBe(0);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      retryManager.cleanup();

      expect(retryManager.listenerCount()).toBe(0);
      expect(retryManager.activeRetries.size).toBe(0);
    });

    test('should cancel active retries during cleanup', async () => {
      const failingFunction = jest.fn()
        .mockRejectedValue(new Error('timeout'));

      const retryPromise = retryManager.executeWithRetry(
        failingFunction,
        { commandType: 'movement', errorType: 'timeout' }
      );

      setTimeout(() => retryManager.cleanup(), 50);

      await expect(retryPromise).rejects.toThrow('Retry cancelled');
    });
  });
});