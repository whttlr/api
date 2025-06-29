/**
 * Feedback Components
 * 
 * Standardized feedback components for validation, progress, and status display.
 */

import { 
  ValidationDisplay, 
  createValidationResult, 
  ValidationBuilder 
} from './ValidationDisplay.jsx';

import { 
  ProgressIndicator, 
  useProgressAnimation 
} from './ProgressIndicator.jsx';

export { 
  ValidationDisplay, 
  createValidationResult, 
  ValidationBuilder 
};

export { 
  ProgressIndicator, 
  useProgressAnimation 
};

export default {
  ValidationDisplay,
  createValidationResult,
  ValidationBuilder,
  ProgressIndicator,
  useProgressAnimation
};