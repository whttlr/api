/**
 * Job Progress Feature Index
 * 
 * Exports all job progress related components, hooks, and services.
 * 
 * @module JobProgressFeature
 */

// Components
export { JobProgressScreen } from './components/JobProgressScreen.jsx';
export { ProgressDisplay } from './components/ProgressDisplay.jsx';
export { TimeTracking } from './components/TimeTracking.jsx';
export { CurrentOperation } from './components/CurrentOperation.jsx';
export { OverrideControls } from './components/OverrideControls.jsx';
export { JobControls } from './components/JobControls.jsx';

// Hooks
export { 
  useJobProgress,
  useOverrideValidation,
  useJobTiming
} from './hooks/useJobProgress.js';

// Services
export { 
  JobProgressService,
  calculateProgress,
  estimateRemainingTime,
  formatTime,
  calculateExecutionSpeed,
  analyzeJobPerformance,
  validateOverride,
  generateJobSummary,
  getJobStatus,
  isJobControllable
} from './services/JobProgressService.js';

// Default export
export { JobProgressScreen as default } from './components/JobProgressScreen.jsx';