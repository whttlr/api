/**
 * Shared Components
 * 
 * Standardized UI components for consistent patterns across the application.
 */

// Import components for use in objects
import { SelectableList } from './interactive/index.js';
import { 
  ValidationDisplay, 
  createValidationResult, 
  ValidationBuilder,
  ProgressIndicator, 
  useProgressAnimation 
} from './feedback/index.js';
import { 
  StandardInput, 
  InputValidators,
  Button,
  ButtonVariants,
  SelectionItem,
  MenuItem,
  IconButton,
  ToggleButton,
  ProgressButton
} from './input/index.js';
import { ConfirmationModal, ConfirmationModals } from './modal/index.js';

// Re-export components individually
export { SelectableList } from './interactive/index.js';

// Feedback components  
export { 
  ValidationDisplay, 
  createValidationResult, 
  ValidationBuilder,
  ProgressIndicator, 
  useProgressAnimation 
} from './feedback/index.js';

// Input components
export { 
  StandardInput, 
  InputValidators,
  Button,
  ButtonVariants,
  SelectionItem,
  MenuItem,
  IconButton,
  ToggleButton,
  ProgressButton
} from './input/index.js';

// Modal components
export { 
  ConfirmationModal, 
  ConfirmationModals 
} from './modal/index.js';

// Legacy components (from existing shared folder)
export { LoadingSpinner } from './feedback/LoadingSpinner.jsx';
export { StatusBar } from './layout/StatusBar.jsx';
export { EmergencyStopModal } from './modals/EmergencyStopModal.jsx';
export { ConnectionIndicator } from './connection/ConnectionIndicator.jsx';

// Component categories for easier imports
export const Interactive = {
  SelectableList: SelectableList
};

export const Feedback = {
  ValidationDisplay,
  createValidationResult,
  ValidationBuilder,
  ProgressIndicator,
  useProgressAnimation
};

export const Input = {
  StandardInput,
  InputValidators,
  Button,
  ButtonVariants,
  SelectionItem,
  MenuItem,
  IconButton,
  ToggleButton,
  ProgressButton
};

export const Modal = {
  ConfirmationModal,
  ConfirmationModals
};