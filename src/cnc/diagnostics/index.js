/**
 * Diagnostics Module Public API
 * 
 * Exports the public interface for movement testing and machine diagnostics.
 */

export { DiagnosticsManager } from './DiagnosticsManager.js';

// Re-export diagnostics-related constants
export const DIAGNOSTIC_TYPES = {
  MOVEMENT_TEST: 'movement_test',
  HOMING_ANALYSIS: 'homing_analysis',
  COMPREHENSIVE: 'comprehensive',
  HEALTH_CHECK: 'health_check'
};

export const HEALTH_SCORES = {
  EXCELLENT: { min: 90, max: 100, label: 'Excellent' },
  GOOD: { min: 75, max: 89, label: 'Good' },
  FAIR: { min: 50, max: 74, label: 'Fair' },
  POOR: { min: 25, max: 49, label: 'Poor' },
  CRITICAL: { min: 0, max: 24, label: 'Critical' }
};

export const TEST_RESULTS = {
  PASS: 'pass',
  FAIL: 'fail',
  WARNING: 'warning',
  SKIP: 'skip'
};