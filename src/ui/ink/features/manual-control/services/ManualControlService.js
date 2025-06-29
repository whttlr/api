/**
 * Manual Control Service
 * 
 * Utilities for manual control operations, coordinate formatting, and jog commands.
 * 
 * @module ManualControlService
 */

/**
 * Format position value for display
 * @param {number} value - Position value
 * @param {string} units - Units ('metric' or 'imperial')
 * @returns {string} Formatted position
 */
export function formatPosition(value, units = 'metric') {
  if (typeof value !== 'number') return '0.000';
  
  if (units === 'imperial') {
    return value.toFixed(3);
  }
  return value.toFixed(2);
}

/**
 * Get display unit string
 * @param {string} units - Units ('metric' or 'imperial')
 * @returns {string} Unit display string
 */
export function getDisplayUnit(units = 'metric') {
  return units === 'imperial' ? 'in' : 'mm';
}

/**
 * Build jog command string
 * @param {string} direction - Direction (X+, X-, Y+, Y-, Z+, Z-)
 * @param {number} distance - Distance to jog
 * @param {number} speed - Feed rate
 * @returns {string} G-code jog command
 */
export function buildJogCommand(direction, distance, speed) {
  const axis = direction.charAt(0);
  const sign = direction.charAt(1) === '+' ? '' : '-';
  return `G91 G0 ${axis}${sign}${distance} F${speed}`;
}

/**
 * Parse direction from input
 * @param {string} input - User input character
 * @param {Object} key - Key event object
 * @returns {string|null} Direction string or null
 */
export function parseDirection(input, key) {
  // Arrow keys
  if (key.upArrow) return 'Y+';
  if (key.downArrow) return 'Y-';
  if (key.leftArrow) return 'X-';
  if (key.rightArrow) return 'X+';
  
  // WASD keys
  if (input === 'w') return 'Y+';
  if (input === 's') return 'Y-';
  if (input === 'a') return 'X-';
  if (input === 'd') return 'X+';
  
  // Z-axis keys
  if (input === 'q') return 'Z+';
  if (input === 'e') return 'Z-';
  
  return null;
}

/**
 * Validate jog parameters
 * @param {number} distance - Jog distance
 * @param {number} speed - Jog speed
 * @returns {Object} Validation result
 */
export function validateJogParameters(distance, speed) {
  const validation = {
    isValid: true,
    errors: [],
    warnings: []
  };

  if (distance <= 0) {
    validation.isValid = false;
    validation.errors.push('Distance must be greater than 0');
  }

  if (distance > 100) {
    validation.warnings.push('Large jog distance - ensure adequate clearance');
  }

  if (speed <= 0) {
    validation.isValid = false;
    validation.errors.push('Speed must be greater than 0');
  }

  if (speed > 5000) {
    validation.warnings.push('High jog speed - ensure machine can handle this rate');
  }

  return validation;
}

/**
 * Calculate work position from machine position and offset
 * @param {Object} machinePos - Machine position {x, y, z}
 * @param {Object} workOffset - Work offset {x, y, z}
 * @returns {Object} Work position {x, y, z}
 */
export function calculateWorkPosition(machinePos, workOffset) {
  return {
    x: machinePos.x - workOffset.x,
    y: machinePos.y - workOffset.y,
    z: machinePos.z - workOffset.z
  };
}

/**
 * Get jog speed presets
 * @returns {Object} Speed presets object
 */
export function getJogSpeeds() {
  return {
    slow: 300,
    medium: 1000,
    fast: 3000
  };
}

/**
 * Manual Control Service object
 */
export const ManualControlService = {
  formatPosition,
  getDisplayUnit,
  buildJogCommand,
  parseDirection,
  validateJogParameters,
  calculateWorkPosition,
  getJogSpeeds
};

export default ManualControlService;