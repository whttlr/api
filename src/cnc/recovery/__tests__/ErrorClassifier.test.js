/**
 * ErrorClassifier Test Suite
 * 
 * Tests for error classification functionality including
 * GRBL error mapping, pattern learning, and recovery strategy determination.
 */

import { ErrorClassifier } from '../ErrorClassifier.js';
import { MockErrorData } from '../__mocks__/MockErrorData.js';

describe('ErrorClassifier', () => {
  let classifier;

  beforeEach(() => {
    classifier = new ErrorClassifier({
      enableLearning: true,
      confidenceThreshold: 0.8,
      maxPatternHistory: 100,
      patternMatchingDepth: 5
    });
  });

  afterEach(() => {
    classifier.cleanup();
  });

  describe('constructor', () => {
    test('should create ErrorClassifier with default configuration', () => {
      const defaultClassifier = new ErrorClassifier();
      expect(defaultClassifier).toBeInstanceOf(ErrorClassifier);
      expect(defaultClassifier.config.enableLearning).toBe(true);
    });

    test('should apply custom configuration', () => {
      expect(classifier.config.enableLearning).toBe(true);
      expect(classifier.config.confidenceThreshold).toBe(0.8);
      expect(classifier.config.maxPatternHistory).toBe(100);
    });
  });

  describe('GRBL error classification', () => {
    test('should classify known GRBL error codes', () => {
      const result = classifier.classifyGrblError(1);

      expect(result.type).toBe('syntax_error');
      expect(result.severity).toBe('high');
      expect(result.retryable).toBe(false);
      expect(result.description).toContain('G-code words consist');
    });

    test('should classify parameter errors', () => {
      const result = classifier.classifyGrblError(4);

      expect(result.type).toBe('parameter_error');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(false);
    });

    test('should classify retryable errors', () => {
      const result = classifier.classifyGrblError(8); // Not idle

      expect(result.type).toBe('state_error');
      expect(result.retryable).toBe(true);
    });

    test('should handle unknown error codes', () => {
      const result = classifier.classifyGrblError(999);

      expect(result.type).toBe('unknown_error');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(false);
      expect(result.description).toContain('Unknown error');
    });
  });

  describe('communication error classification', () => {
    test('should classify timeout errors', () => {
      const error = new Error('Request timeout');
      const result = classifier.classifyError(error, 'communication');

      expect(result.type).toBe('timeout');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(true);
    });

    test('should classify connection errors', () => {
      const error = new Error('Connection lost');
      const result = classifier.classifyError(error, 'communication');

      expect(result.type).toBe('connection_lost');
      expect(result.severity).toBe('high');
      expect(result.retryable).toBe(true);
    });

    test('should classify buffer overflow errors', () => {
      const error = new Error('Buffer overflow');
      const result = classifier.classifyError(error, 'communication');

      expect(result.type).toBe('buffer_overflow');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(true);
    });

    test('should classify malformed response errors', () => {
      const error = new Error('Malformed response');
      const result = classifier.classifyError(error, 'communication');

      expect(result.type).toBe('protocol_error');
      expect(result.severity).toBe('medium');
      expect(result.retryable).toBe(false);
    });
  });

  describe('hardware error classification', () => {
    test('should classify limit switch errors', () => {
      const error = new Error('Hard limit triggered');
      const result = classifier.classifyError(error, 'hardware');

      expect(result.type).toBe('hard_limit');
      expect(result.severity).toBe('critical');
      expect(result.retryable).toBe(false);
    });

    test('should classify emergency stop errors', () => {
      const error = new Error('Emergency stop activated');
      const result = classifier.classifyError(error, 'hardware');

      expect(result.type).toBe('emergency_stop');
      expect(result.severity).toBe('critical');
      expect(result.retryable).toBe(false);
    });

    test('should classify probe errors', () => {
      const error = new Error('Probe failed');
      const result = classifier.classifyError(error, 'hardware');

      expect(result.type).toBe('probe_fail');
      expect(result.severity).toBe('high');
      expect(result.retryable).toBe(false);
    });
  });

  describe('pattern learning', () => {
    test('should learn error patterns from command history', () => {
      const commandHistory = [
        { command: 'G0 X100', timestamp: Date.now() - 1000 },
        { command: 'G0 Y100', timestamp: Date.now() - 500 },
        { command: 'G0 Z10', timestamp: Date.now() }
      ];

      const error = new Error('Soft limit');
      
      classifier.learnFromError(error, commandHistory);

      expect(classifier.patterns.size).toBeGreaterThan(0);
    });

    test('should identify recurring error patterns', () => {
      const commandHistory = [
        { command: 'G0 X200', timestamp: Date.now() - 1000 },
        { command: 'G0 Y200', timestamp: Date.now() - 500 }
      ];

      // Learn the same pattern multiple times
      for (let i = 0; i < 5; i++) {
        classifier.learnFromError(new Error('Soft limit'), commandHistory);
      }

      const patterns = classifier.getLearnedPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].confidence).toBeGreaterThan(0.8);
    });

    test('should predict errors based on learned patterns', () => {
      const commandHistory = [
        { command: 'G0 X200', timestamp: Date.now() - 1000 },
        { command: 'G0 Y200', timestamp: Date.now() - 500 }
      ];

      // Learn pattern
      for (let i = 0; i < 10; i++) {
        classifier.learnFromError(new Error('Soft limit'), commandHistory);
      }

      // Test prediction
      const prediction = classifier.predictError(commandHistory);
      
      expect(prediction.likelihood).toBeGreaterThan(0.8);
      expect(prediction.predictedErrorType).toBe('limit_error');
    });

    test('should limit pattern history size', () => {
      classifier.config.maxPatternHistory = 2;

      // Add patterns beyond limit
      for (let i = 0; i < 5; i++) {
        classifier.learnFromError(
          new Error(`Error ${i}`),
          [{ command: `G0 X${i}`, timestamp: Date.now() }]
        );
      }

      expect(classifier.patterns.size).toBeLessThanOrEqual(2);
    });
  });

  describe('contextual analysis', () => {
    test('should consider machine state in classification', () => {
      const error = new Error('Position error');
      const context = {
        machineState: 'ALARM',
        lastCommand: 'G0 X100',
        currentPosition: { x: 95, y: 0, z: 0 }
      };

      const result = classifier.classifyWithContext(error, context);

      expect(result.contextualFactors).toContain('machine_in_alarm');
      expect(result.severity).toBe('high'); // Elevated due to alarm state
    });

    test('should consider recent commands in classification', () => {
      const error = new Error('Feed rate error');
      const context = {
        machineState: 'IDLE',
        recentCommands: [
          'G1 X10 Y10', // No feed rate specified
          'G1 X20 Y20'  // No feed rate specified
        ]
      };

      const result = classifier.classifyWithContext(error, context);

      expect(result.contextualFactors).toContain('missing_feed_rate');
      expect(result.suggestedAction).toContain('specify feed rate');
    });

    test('should analyze command sequence patterns', () => {
      const error = new Error('Modal group violation');
      const context = {
        recentCommands: [
          'G0 X10',     // Rapid positioning
          'G1 X20 F100' // Linear interpolation - modal group conflict
        ]
      };

      const result = classifier.classifyWithContext(error, context);

      expect(result.contextualFactors).toContain('modal_group_conflict');
      expect(result.type).toBe('parameter_error');
    });
  });

  describe('recovery strategy determination', () => {
    test('should suggest recovery strategies for retryable errors', () => {
      const result = classifier.classifyGrblError(8); // Not idle
      const strategy = classifier.getRecoveryStrategy(result);

      expect(strategy.canRetry).toBe(true);
      expect(strategy.retryDelay).toBeGreaterThan(0);
      expect(strategy.maxRetries).toBeGreaterThan(0);
      expect(strategy.preRetryActions).toContain('wait_for_idle');
    });

    test('should suggest manual intervention for critical errors', () => {
      const result = classifier.classifyGrblError(1); // Syntax error
      const strategy = classifier.getRecoveryStrategy(result);

      expect(strategy.canRetry).toBe(false);
      expect(strategy.requiresManualIntervention).toBe(true);
      expect(strategy.suggestedActions).toContain('check_gcode_syntax');
    });

    test('should suggest reset for system errors', () => {
      const result = classifier.classifyGrblError(7); // EEPROM read fail
      const strategy = classifier.getRecoveryStrategy(result);

      expect(strategy.canRetry).toBe(false);
      expect(strategy.suggestedActions).toContain('reset_controller');
    });

    test('should consider error frequency in strategy', () => {
      // Simulate repeated error
      for (let i = 0; i < 5; i++) {
        classifier.recordError('timeout', Date.now() - (i * 1000));
      }

      const result = classifier.classifyError(new Error('timeout'), 'communication');
      const strategy = classifier.getRecoveryStrategy(result);

      expect(strategy.escalated).toBe(true);
      expect(strategy.retryDelay).toBeGreaterThan(1000); // Longer delay for frequent errors
    });
  });

  describe('error statistics', () => {
    test('should track error frequency by type', () => {
      classifier.recordError('timeout', Date.now());
      classifier.recordError('timeout', Date.now());
      classifier.recordError('connection_lost', Date.now());

      const stats = classifier.getErrorStatistics();

      expect(stats.errorCounts.timeout).toBe(2);
      expect(stats.errorCounts.connection_lost).toBe(1);
      expect(stats.totalErrors).toBe(3);
    });

    test('should calculate error rates over time', () => {
      const now = Date.now();
      classifier.recordError('timeout', now - 5000);  // 5 seconds ago
      classifier.recordError('timeout', now - 3000);  // 3 seconds ago
      classifier.recordError('timeout', now - 1000);  // 1 second ago

      const stats = classifier.getErrorStatistics();

      expect(stats.errorRate).toBeGreaterThan(0);
      expect(stats.recentErrorRate).toBeGreaterThan(stats.errorRate); // More recent errors
    });

    test('should identify error trends', () => {
      const now = Date.now();
      
      // Simulate increasing error frequency
      for (let i = 0; i < 10; i++) {
        classifier.recordError('timeout', now - (i * 500)); // Every 500ms
      }

      const trends = classifier.getErrorTrends();

      expect(trends.isIncreasing).toBe(true);
      expect(trends.trend).toBe('increasing');
    });
  });

  describe('error confidence scoring', () => {
    test('should calculate confidence scores for classifications', () => {
      const error = new Error('well-known error pattern');
      const result = classifier.classifyError(error, 'communication');

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    test('should lower confidence for ambiguous errors', () => {
      const error = new Error('generic error message');
      const result = classifier.classifyError(error, 'unknown');

      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should increase confidence with pattern matching', () => {
      const commandHistory = [
        { command: 'G0 X100', timestamp: Date.now() }
      ];

      // Learn pattern
      for (let i = 0; i < 10; i++) {
        classifier.learnFromError(new Error('Soft limit'), commandHistory);
      }

      // Classify similar error
      const result = classifier.classifyError(new Error('Soft limit'), 'hardware', commandHistory);

      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });

  describe('classification validation', () => {
    test('should validate classification results', () => {
      const result = classifier.classifyGrblError(1);
      const validation = classifier.validateClassification(result);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    test('should detect inconsistent classifications', () => {
      const invalidResult = {
        type: 'syntax_error',
        severity: 'low', // Inconsistent: syntax errors should be high severity
        retryable: true  // Inconsistent: syntax errors shouldn't be retryable
      };

      const validation = classifier.validateClassification(invalidResult);

      expect(validation.isValid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('machine learning integration', () => {
    test('should export training data for machine learning', () => {
      // Add some patterns
      for (let i = 0; i < 5; i++) {
        classifier.learnFromError(
          new Error(`Error ${i}`),
          [{ command: `G0 X${i * 10}`, timestamp: Date.now() }]
        );
      }

      const trainingData = classifier.exportTrainingData();

      expect(trainingData.patterns).toBeDefined();
      expect(trainingData.errorHistory).toBeDefined();
      expect(trainingData.metadata).toBeDefined();
    });

    test('should import pre-trained models', () => {
      const modelData = {
        patterns: MockErrorData.getTrainedPatterns(),
        weights: MockErrorData.getModelWeights(),
        version: '1.0'
      };

      classifier.importModel(modelData);

      const patterns = classifier.getLearnedPatterns();
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('error correlation', () => {
    test('should identify correlated errors', () => {
      const errors = [
        { type: 'timeout', timestamp: Date.now() - 1000 },
        { type: 'connection_lost', timestamp: Date.now() - 500 },
        { type: 'buffer_overflow', timestamp: Date.now() }
      ];

      const correlations = classifier.findErrorCorrelations(errors);

      expect(correlations.length).toBeGreaterThan(0);
      expect(correlations[0]).toHaveProperty('errorTypes');
      expect(correlations[0]).toHaveProperty('correlation');
    });

    test('should suggest root cause analysis for correlated errors', () => {
      const errors = [
        { type: 'timeout', count: 5 },
        { type: 'connection_lost', count: 3 },
        { type: 'buffer_overflow', count: 2 }
      ];

      const analysis = classifier.analyzeRootCause(errors);

      expect(analysis.likelyRootCause).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    test('should clean up resources', () => {
      classifier.cleanup();

      expect(classifier.listenerCount()).toBe(0);
      expect(classifier.patterns.size).toBe(0);
    });

    test('should save learned patterns before cleanup if configured', () => {
      classifier.config.persistPatterns = true;
      
      // Add some patterns
      classifier.learnFromError(
        new Error('Test error'),
        [{ command: 'G0 X10', timestamp: Date.now() }]
      );

      const saveSpy = jest.spyOn(classifier, 'savePatterns');
      classifier.cleanup();

      expect(saveSpy).toHaveBeenCalled();
    });
  });
});