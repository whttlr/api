/**
 * Settings Feature
 * 
 * Complete settings management functionality for machine configuration,
 * safety parameters, units, and display preferences.
 * 
 * @module SettingsFeature
 */

// Main component
export { SettingsScreen } from './components/SettingsScreen.jsx';

// Sub-components
export { SettingsNavigation } from './components/SettingsNavigation.jsx';
export { MachineSettings } from './components/MachineSettings.jsx';
export { SafetySettings } from './components/SafetySettings.jsx';
export { UnitsSettings } from './components/UnitsSettings.jsx';
export { DisplaySettings } from './components/DisplaySettings.jsx';

// Hooks
export { useSettingsNavigation } from './hooks/useSettingsNavigation.js';

// Services
export { 
  SettingsService,
  DEFAULT_SETTINGS,
  validateMachineSettings,
  validateSafetySettings,
  validateUnitsSettings,
  validateDisplaySettings,
  mergeWithDefaults,
  convertSettingsUnits,
  exportSettings,
  importSettings
} from './services/SettingsService.js';

// Default export
export { SettingsScreen as default } from './components/SettingsScreen.jsx';