/**
 * Shared Contexts Index
 * 
 * Exports all context providers and hooks for the CNC UI application.
 * 
 * @module SharedContexts
 */

// Toast Context
export { 
  ToastProvider, 
  useToast,
  default as ToastContext 
} from './ToastContext.jsx';

// App State Context
export { 
  AppStateProvider, 
  useAppState,
  useNavigation,
  useErrorHandling,
  useLoadingState,
  appStateReducer,
  initialAppState,
  default as AppStateContext 
} from './AppStateContext.jsx';

// CNC Context
export { 
  CNCProvider, 
  useCNC,
  useConnection,
  useCommands,
  useFiles,
  useJobControl,
  cncStateReducer,
  initialCNCState,
  default as CNCContext 
} from './CNCContext.jsx';

// Settings Context
export { 
  SettingsProvider, 
  useSettings,
  useUserSettings,
  useMachineSettings,
  useUnits,
  initialSettingsState,
  loadSettingsFromStorage,
  saveSettingsToStorage,
  default as SettingsContext 
} from './SettingsContext.jsx';