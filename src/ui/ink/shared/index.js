/**
 * Shared Infrastructure Index
 * 
 * Central export point for all shared utilities, services, contexts, and components
 * used throughout the CNC UI application.
 * 
 * @module SharedInfrastructure
 */

// Services
export * from './services/index.js';

// Contexts
export * from './contexts/index.js';

// Components
export * from './components/index.js';

// Re-export commonly used items for convenience
export { 
  // Services
  SafetyValidator,
  translateError,
  ErrorMessages,
  formatPosition,
  getDisplayUnit,
  getDisplayValue,
  
  // Contexts
  useToast,
  useAppState,
  useCNC,
  useSettings,
  
  // Components
  StatusBar,
  LoadingOverlay,
  ToastNotifications,
  Button,
  EmergencyStopModal
} from './index.js';