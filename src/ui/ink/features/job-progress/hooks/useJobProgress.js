/**
 * Job Progress Hook
 * 
 * Manages job progress state, override controls, and job actions
 * with real-time monitoring capabilities.
 * 
 * @module useJobProgress
 */

import { useState, useCallback } from 'react';
import { useCNC } from '../../../shared/contexts/index.js';

/**
 * Job progress management hook
 * @returns {Object} Job progress state and actions
 */
export function useJobProgress() {
  const { state, pauseJob, resumeJob, cancelJob, setFeedOverride, setSpindleOverride } = useCNC();
  
  // Control state
  const [selectedControl, setSelectedControl] = useState(0);
  const [editingOverride, setEditingOverride] = useState(null); // 'feed' or 'spindle'
  
  // Override input state
  const [feedOverrideInput, setFeedOverrideInput] = useState('100');
  const [spindleOverrideInput, setSpindleOverrideInput] = useState('100');

  /**
   * Format time duration for display
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  const formatTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Get job status color based on current state
   * @returns {string} Color name for status display
   */
  const getJobStatusColor = useCallback(() => {
    const job = state.job || {};
    if (job.error) return 'red';
    if (job.isPaused) return 'yellow';
    if (job.isRunning) return 'green';
    return 'gray';
  }, [state.job]);

  /**
   * Get job status text based on current state
   * @returns {string} Status text description
   */
  const getJobStatusText = useCallback(() => {
    const job = state.job || {};
    if (job.error) return 'Error';
    if (job.isPaused) return 'Paused';
    if (job.isRunning) return 'Running';
    return 'Stopped';
  }, [state.job]);

  /**
   * Calculate job progress statistics
   * @returns {Object} Progress statistics
   */
  const getProgressStats = useCallback(() => {
    const job = state.job || {};
    return {
      completionPercentage: job.progress || 0,
      linesCompleted: job.currentLine || 0,
      totalLines: job.totalLines || 0,
      elapsedTime: job.elapsedTime || 0,
      remainingTime: job.estimatedTimeRemaining || 0,
      isActive: job.isRunning || job.isPaused,
      hasError: !!job.error
    };
  }, [state.job]);

  /**
   * Check if job can be controlled
   * @returns {boolean} Whether job controls are available
   */
  const canControlJob = useCallback(() => {
    const job = state.job || {};
    return !!(job.fileName && (job.isRunning || job.isPaused));
  }, [state.job]);

  /**
   * Job action handlers
   */
  const jobActions = {
    pauseJob: useCallback(async () => {
      try {
        await pauseJob();
      } catch (err) {
        console.error('Failed to pause job:', err);
      }
    }, [pauseJob]),

    resumeJob: useCallback(async () => {
      try {
        await resumeJob();
      } catch (err) {
        console.error('Failed to resume job:', err);
      }
    }, [resumeJob]),

    cancelJob: useCallback(async () => {
      try {
        await cancelJob();
      } catch (err) {
        console.error('Failed to cancel job:', err);
      }
    }, [cancelJob]),

    setFeedOverride: useCallback(async (value) => {
      try {
        await setFeedOverride(value);
      } catch (err) {
        console.error('Failed to set feed override:', err);
      }
    }, [setFeedOverride]),

    setSpindleOverride: useCallback(async (value) => {
      try {
        await setSpindleOverride(value);
      } catch (err) {
        console.error('Failed to set spindle override:', err);
      }
    }, [setSpindleOverride])
  };

  return {
    // Control state
    selectedControl,
    setSelectedControl,
    editingOverride,
    setEditingOverride,
    
    // Override inputs
    feedOverrideInput,
    setFeedOverrideInput,
    spindleOverrideInput,
    setSpindleOverrideInput,
    
    // Job actions
    jobActions,
    
    // Utility functions
    formatTime,
    getJobStatusColor,
    getJobStatusText,
    getProgressStats,
    canControlJob,
    
    // Computed state
    job: state.job || {},
    isJobActive: canControlJob(),
    progressStats: getProgressStats()
  };
}

/**
 * Override input validation hook
 * @param {string} type - Override type ('feed' or 'spindle')
 * @param {string} input - Input value
 * @returns {Object} Validation result
 */
export function useOverrideValidation(type, input) {
  const validateInput = useCallback((value) => {
    const num = parseInt(value);
    const validation = {
      isValid: true,
      value: num,
      errors: [],
      warnings: []
    };

    if (isNaN(num)) {
      validation.isValid = false;
      validation.errors.push('Must be a number');
      return validation;
    }

    if (num < 10) {
      validation.isValid = false;
      validation.errors.push('Minimum value is 10%');
    } else if (num > 200) {
      validation.isValid = false;
      validation.errors.push('Maximum value is 200%');
    } else if (num < 50) {
      validation.warnings.push('Very low override - machine will run slowly');
    } else if (num > 150) {
      validation.warnings.push('High override - ensure machine can handle this speed');
    }

    return validation;
  }, []);

  return validateInput(input);
}

/**
 * Job timing utilities hook
 * @param {Object} job - Job object
 * @returns {Object} Timing utilities
 */
export function useJobTiming(job = {}) {
  const calculateETA = useCallback(() => {
    if (!job.estimatedTimeRemaining) return null;
    const now = new Date();
    const eta = new Date(now.getTime() + job.estimatedTimeRemaining * 1000);
    return eta;
  }, [job.estimatedTimeRemaining]);

  const calculateAverageSpeed = useCallback(() => {
    if (!job.elapsedTime || !job.currentLine) return 0;
    return job.currentLine / job.elapsedTime; // lines per second
  }, [job.elapsedTime, job.currentLine]);

  const getTimeRemaining = useCallback(() => {
    return job.estimatedTimeRemaining || 0;
  }, [job.estimatedTimeRemaining]);

  return {
    eta: calculateETA(),
    averageSpeed: calculateAverageSpeed(),
    timeRemaining: getTimeRemaining(),
    hasEstimates: !!(job.estimatedTimeRemaining && job.elapsedTime)
  };
}

// Default export
export default useJobProgress;