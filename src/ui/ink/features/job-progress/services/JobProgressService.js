/**
 * Job Progress Service
 * 
 * Utilities for job progress calculations, time formatting, and status analysis.
 * 
 * @module JobProgressService
 */

/**
 * Calculate job completion percentage
 * @param {number} currentLine - Current line number
 * @param {number} totalLines - Total lines in job
 * @returns {number} Completion percentage (0-100)
 */
export function calculateProgress(currentLine, totalLines) {
  if (!totalLines || totalLines === 0) return 0;
  return Math.min(100, Math.max(0, Math.round((currentLine / totalLines) * 100)));
}

/**
 * Estimate remaining time based on current progress
 * @param {number} elapsedTime - Time elapsed in seconds
 * @param {number} progress - Progress percentage (0-100)
 * @returns {number} Estimated remaining time in seconds
 */
export function estimateRemainingTime(elapsedTime, progress) {
  if (!elapsedTime || !progress || progress === 0) return 0;
  
  const totalEstimatedTime = (elapsedTime / progress) * 100;
  return Math.max(0, Math.round(totalEstimatedTime - elapsedTime));
}

/**
 * Format time duration for display
 * @param {number} seconds - Time in seconds
 * @param {boolean} includeHours - Whether to include hours
 * @returns {string} Formatted time string
 */
export function formatTime(seconds, includeHours = true) {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (includeHours && hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate average execution speed
 * @param {number} linesCompleted - Number of lines completed
 * @param {number} elapsedTime - Time elapsed in seconds
 * @returns {number} Lines per second
 */
export function calculateExecutionSpeed(linesCompleted, elapsedTime) {
  if (!elapsedTime || elapsedTime === 0) return 0;
  return linesCompleted / elapsedTime;
}

/**
 * Analyze job performance
 * @param {Object} job - Job object with progress information
 * @returns {Object} Performance analysis
 */
export function analyzeJobPerformance(job) {
  const analysis = {
    efficiency: 'unknown',
    speed: 0,
    issues: [],
    recommendations: []
  };

  if (!job.elapsedTime || !job.currentLine) {
    return analysis;
  }

  analysis.speed = calculateExecutionSpeed(job.currentLine, job.elapsedTime);

  // Determine efficiency rating
  if (analysis.speed > 5) {
    analysis.efficiency = 'excellent';
  } else if (analysis.speed > 2) {
    analysis.efficiency = 'good';
  } else if (analysis.speed > 0.5) {
    analysis.efficiency = 'moderate';
  } else {
    analysis.efficiency = 'slow';
    analysis.issues.push('Very slow execution speed');
    analysis.recommendations.push('Check for connection issues or machine problems');
  }

  // Check for stalling
  if (job.isPaused) {
    analysis.issues.push('Job is currently paused');
  }

  if (job.error) {
    analysis.efficiency = 'error';
    analysis.issues.push(`Job error: ${job.error}`);
    analysis.recommendations.push('Resolve error before continuing');
  }

  // Check override values for performance impact
  if (job.feedOverride && job.feedOverride < 50) {
    analysis.issues.push('Feed rate override is very low');
    analysis.recommendations.push('Consider increasing feed rate override for faster execution');
  }

  if (job.spindleOverride && job.spindleOverride < 50) {
    analysis.issues.push('Spindle speed override is very low');
  }

  return analysis;
}

/**
 * Validate override value
 * @param {number} value - Override value to validate
 * @param {string} type - Override type ('feed' or 'spindle')
 * @returns {Object} Validation result
 */
export function validateOverride(value, type = 'feed') {
  const validation = {
    isValid: true,
    value: Math.round(value),
    warnings: [],
    errors: []
  };

  if (isNaN(value)) {
    validation.isValid = false;
    validation.errors.push('Override value must be a number');
    return validation;
  }

  if (value < 10) {
    validation.isValid = false;
    validation.errors.push('Minimum override value is 10%');
  } else if (value > 200) {
    validation.isValid = false;
    validation.errors.push('Maximum override value is 200%');
  } else if (value < 25) {
    validation.warnings.push('Very low override - machine will run very slowly');
  } else if (value > 150) {
    validation.warnings.push(`High ${type} override - ensure machine can handle this speed`);
  }

  return validation;
}

/**
 * Generate job summary report
 * @param {Object} job - Job object
 * @returns {Object} Job summary
 */
export function generateJobSummary(job) {
  return {
    fileName: job.fileName || 'Unknown',
    status: getJobStatus(job),
    progress: {
      percentage: job.progress || 0,
      currentLine: job.currentLine || 0,
      totalLines: job.totalLines || 0
    },
    timing: {
      elapsed: job.elapsedTime || 0,
      remaining: job.estimatedTimeRemaining || 0,
      total: (job.elapsedTime || 0) + (job.estimatedTimeRemaining || 0)
    },
    performance: analyzeJobPerformance(job),
    overrides: {
      feed: job.feedOverride || 100,
      spindle: job.spindleOverride || 100
    },
    currentCommand: job.currentCommand || null,
    error: job.error || null
  };
}

/**
 * Get job status description
 * @param {Object} job - Job object
 * @returns {string} Status description
 */
export function getJobStatus(job) {
  if (job.error) return 'Error';
  if (job.isPaused) return 'Paused';
  if (job.isRunning) return 'Running';
  if (job.fileName) return 'Stopped';
  return 'No Job';
}

/**
 * Check if job is in a controllable state
 * @param {Object} job - Job object
 * @returns {boolean} Whether job can be controlled
 */
export function isJobControllable(job) {
  return !!(job.fileName && (job.isRunning || job.isPaused) && !job.error);
}

/**
 * Job Progress Service object
 */
export const JobProgressService = {
  calculateProgress,
  estimateRemainingTime,
  formatTime,
  calculateExecutionSpeed,
  analyzeJobPerformance,
  validateOverride,
  generateJobSummary,
  getJobStatus,
  isJobControllable
};

// Default export
export default JobProgressService;