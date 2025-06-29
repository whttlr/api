/**
 * Settings Service
 * 
 * Utilities for settings validation, conversion, and management operations.
 * 
 * @module SettingsService
 */

/**
 * Default settings configuration
 */
export const DEFAULT_SETTINGS = {
  machine: {
    limits: { x: 200, y: 200, z: 100 },
    speeds: { rapid: 3000, work: 1000, plunge: 300 },
    acceleration: { x: 500, y: 500, z: 100 },
    maxSpindle: 24000,
    units: 'metric'
  },
  safety: {
    enableLimits: true,
    enableSoftLimits: true,
    enableHardLimits: true,
    homingRequired: true,
    emergencyStopEnabled: true,
    maxJogDistance: 10,
    maxJogSpeed: 5000
  },
  units: {
    units: 'metric',
    decimalPlaces: 3,
    displayMode: 'decimal',
    coordinateSystem: 'machine'
  },
  display: {
    theme: 'dark',
    showTooltips: true,
    showGrid: true,
    showAxes: true,
    refreshRate: 100,
    logLevel: 'info',
    autoScroll: true
  }
};

/**
 * Validate machine settings
 * @param {Object} settings - Machine settings to validate
 * @returns {Object} Validation result
 */
export function validateMachineSettings(settings) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Validate limits
  if (settings.limits) {
    const { x, y, z } = settings.limits;
    if (x <= 0 || y <= 0 || z <= 0) {
      validation.isValid = false;
      validation.errors.push('All machine limits must be greater than 0');
    }
    if (x > 1000 || y > 1000 || z > 1000) {
      validation.warnings.push('Large machine limits detected - ensure values are correct');
    }
  }
  
  // Validate speeds
  if (settings.speeds) {
    const { rapid, work, plunge } = settings.speeds;
    if (rapid <= 0 || work <= 0 || plunge <= 0) {
      validation.isValid = false;
      validation.errors.push('All speeds must be greater than 0');
    }
    if (rapid > 10000 || work > 10000 || plunge > 10000) {
      validation.warnings.push('High speed settings detected - ensure machine can handle these rates');
    }
  }
  
  return validation;
}

/**
 * Validate safety settings
 * @param {Object} settings - Safety settings to validate
 * @returns {Object} Validation result
 */
export function validateSafetySettings(settings) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  // Check for dangerous configurations
  if (!settings.enableSoftLimits && !settings.enableHardLimits) {
    validation.warnings.push('Both soft and hard limits are disabled - this may be dangerous');
  }
  
  if (!settings.emergencyStopEnabled) {
    validation.warnings.push('Emergency stop is disabled - this is not recommended');
  }
  
  if (settings.maxJogDistance > 50) {
    validation.warnings.push('Large jog distance setting - ensure adequate clearance');
  }
  
  return validation;
}

/**
 * Validate units settings
 * @param {Object} settings - Units settings to validate
 * @returns {Object} Validation result
 */
export function validateUnitsSettings(settings) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (settings.decimalPlaces < 0 || settings.decimalPlaces > 6) {
    validation.isValid = false;
    validation.errors.push('Decimal places must be between 0 and 6');
  }
  
  if (!['metric', 'imperial'].includes(settings.units)) {
    validation.isValid = false;
    validation.errors.push('Units must be either "metric" or "imperial"');
  }
  
  return validation;
}

/**
 * Validate display settings
 * @param {Object} settings - Display settings to validate
 * @returns {Object} Validation result
 */
export function validateDisplaySettings(settings) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  if (settings.refreshRate < 50 || settings.refreshRate > 1000) {
    validation.isValid = false;
    validation.errors.push('Refresh rate must be between 50ms and 1000ms');
  }
  
  if (settings.refreshRate < 100) {
    validation.warnings.push('Low refresh rate may impact responsiveness');
  }
  
  if (!['debug', 'info', 'warn', 'error'].includes(settings.logLevel)) {
    validation.isValid = false;
    validation.errors.push('Invalid log level');
  }
  
  return validation;
}

/**
 * Merge settings with defaults
 * @param {Object} userSettings - User provided settings
 * @returns {Object} Merged settings with defaults
 */
export function mergeWithDefaults(userSettings) {
  const merged = { ...DEFAULT_SETTINGS };
  
  if (userSettings) {
    Object.keys(userSettings).forEach(section => {
      if (merged[section]) {
        merged[section] = { ...merged[section], ...userSettings[section] };
      }
    });
  }
  
  return merged;
}

/**
 * Convert settings between units
 * @param {Object} settings - Settings to convert
 * @param {string} fromUnits - Source units
 * @param {string} toUnits - Target units
 * @returns {Object} Converted settings
 */
export function convertSettingsUnits(settings, fromUnits, toUnits) {
  if (fromUnits === toUnits) return settings;
  
  const factor = fromUnits === 'metric' ? 0.0393701 : 25.4; // mm to inches or inches to mm
  const converted = { ...settings };
  
  // Convert machine limits
  if (converted.machine?.limits) {
    Object.keys(converted.machine.limits).forEach(axis => {
      converted.machine.limits[axis] = Math.round(converted.machine.limits[axis] * factor * 1000) / 1000;
    });
  }
  
  // Convert speeds
  if (converted.machine?.speeds) {
    Object.keys(converted.machine.speeds).forEach(type => {
      converted.machine.speeds[type] = Math.round(converted.machine.speeds[type] * factor);
    });
  }
  
  // Update units setting
  if (converted.units) {
    converted.units.units = toUnits;
  }
  if (converted.machine) {
    converted.machine.units = toUnits;
  }
  
  return converted;
}

/**
 * Export settings to JSON
 * @param {Object} settings - Settings to export
 * @returns {string} JSON string
 */
export function exportSettings(settings) {
  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings from JSON
 * @param {string} jsonString - JSON settings string
 * @returns {Object} Parsed settings object
 * @throws {Error} If JSON is invalid
 */
export function importSettings(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    return mergeWithDefaults(parsed);
  } catch (error) {
    throw new Error(`Invalid settings JSON: ${error.message}`);
  }
}

/**
 * Settings Service object
 */
export const SettingsService = {
  DEFAULT_SETTINGS,
  validateMachineSettings,
  validateSafetySettings,
  validateUnitsSettings,
  validateDisplaySettings,
  mergeWithDefaults,
  convertSettingsUnits,
  exportSettings,
  importSettings
};

export default SettingsService;