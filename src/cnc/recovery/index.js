/**
 * CNC Recovery Management Module
 * 
 * Provides comprehensive error handling, alarm recovery, and retry management
 * for CNC machines using intelligent recovery strategies and resilient patterns.
 */

import { AlarmRecoveryManager } from './AlarmRecoveryManager.js';
import { ErrorClassifier } from './ErrorClassifier.js';
import { RetryManager } from './RetryManager.js';

// Main recovery components
export { AlarmRecoveryManager };
export { ErrorClassifier };
export { RetryManager };

// Convenience factory functions
export function createAlarmRecoveryManager(commandManager, config = {}) {
  return new AlarmRecoveryManager(commandManager, config);
}

export function createErrorClassifier(config = {}) {
  return new ErrorClassifier(config);
}

export function createRetryManager(config = {}) {
  return new RetryManager(config);
}

// Integrated recovery system factory
export function createRecoverySystem(commandManager, config = {}) {
  const {
    alarmConfig = {},
    classifierConfig = {},
    retryConfig = {}
  } = config;

  const classifier = new ErrorClassifier(classifierConfig);
  const retryManager = new RetryManager(retryConfig);
  const alarmManager = new AlarmRecoveryManager(commandManager, alarmConfig);

  // Integrate components
  retryManager.setErrorClassifier?.(classifier);
  alarmManager.setErrorClassifier?.(classifier);

  return {
    alarmManager,
    classifier,
    retryManager,
    
    // Convenience methods
    async handleError(error, context = {}) {
      const classification = classifier.classifyError(error, context.type);
      
      if (classification.type === 'alarm') {
        return await alarmManager.recoverFromAlarm(error.code);
      } else if (classification.retryable) {
        return await retryManager.executeWithRetry(
          context.originalOperation,
          { errorType: classification.type }
        );
      }
      
      return { success: false, requiresManualIntervention: true };
    },

    cleanup() {
      alarmManager.cleanup?.();
      classifier.cleanup?.();
      retryManager.cleanup?.();
    }
  };
}

// Default export is the alarm recovery manager (most commonly used)
export default AlarmRecoveryManager;