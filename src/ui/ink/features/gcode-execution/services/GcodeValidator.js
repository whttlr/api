/**
 * G-Code Validator Service
 * 
 * Comprehensive validation and analysis of G-code commands for safety,
 * syntax correctness, and operational warnings.
 * 
 * @module GCodeValidator
 */

/**
 * Validate G-code command for safety and syntax
 * @param {string} command - G-code command to validate
 * @returns {Object} Validation result object
 */
export function validateGcodeCommand(command) {
  const validation = {
    isValid: true,
    warnings: [],
    errors: [],
    suggestions: []
  };

  const trimmedCommand = command.trim().toUpperCase();
  
  // Check for empty command
  if (!trimmedCommand) {
    validation.isValid = false;
    validation.errors.push('Command cannot be empty');
    return validation;
  }

  // Check command length
  if (trimmedCommand.length > 256) {
    validation.isValid = false;
    validation.errors.push('Command too long (max 256 characters)');
  }

  // Basic G-code format validation
  const gcodePattern = /^[GMT$\?!~%]\d*\.?\d*/;
  const systemPattern = /^(\$[A-Z0-9]+|\?|\!|~|%)/;
  
  if (!gcodePattern.test(trimmedCommand) && !systemPattern.test(trimmedCommand)) {
    validation.warnings.push('Command does not start with valid G-code prefix (G, M, T, $, ?, !, ~, %)');
  }

  // Check for dangerous commands
  const dangerousCommands = ['$RST', '$CLEAR', '!', '~'];
  if (dangerousCommands.some(dangerous => trimmedCommand.startsWith(dangerous))) {
    validation.warnings.push('⚠️ This is a system command that could reset or stop the machine');
  }

  // Check for movement commands without coordinates
  if (trimmedCommand.match(/^G[01]\s*$/)) {
    validation.warnings.push('Movement command without coordinates - this will move to origin (0,0,0)');
  }

  // Check for valid coordinate format
  const coordinatePattern = /[XYZ](-?\d+\.?\d*)/g;
  const coordinateMatches = trimmedCommand.match(coordinatePattern);
  if (coordinateMatches) {
    coordinateMatches.forEach(coord => {
      const value = parseFloat(coord.substring(1));
      if (Math.abs(value) > 1000) {
        validation.warnings.push(`Large coordinate value detected: ${coord} - ensure this is intended`);
      }
    });
  }

  // Check for feed rate
  const feedPattern = /F(\d+\.?\d*)/;
  const feedMatch = trimmedCommand.match(feedPattern);
  if (feedMatch) {
    const feedRate = parseFloat(feedMatch[1]);
    if (feedRate > 5000) {
      validation.warnings.push(`High feed rate: F${feedRate} - ensure machine can handle this speed`);
    } else if (feedRate < 1) {
      validation.warnings.push(`Very low feed rate: F${feedRate} - this will be very slow`);
    }
  }

  // Check for spindle speed
  const spindlePattern = /S(\d+\.?\d*)/;
  const spindleMatch = trimmedCommand.match(spindlePattern);
  if (spindleMatch) {
    const spindleSpeed = parseFloat(spindleMatch[1]);
    if (spindleSpeed > 24000) {
      validation.warnings.push(`High spindle speed: S${spindleSpeed} - ensure this is safe for your material`);
    }
  }

  // Common command suggestions
  const commonCommands = {
    'G0': 'Rapid positioning (no cutting)',
    'G1': 'Linear interpolation (cutting)',
    'G28': 'Return to home position',
    'M3': 'Start spindle clockwise',
    'M5': 'Stop spindle',
    '$H': 'Home all axes',
    '?': 'Get current status',
    '$G': 'Get parser state',
    '$#': 'Get coordinate systems'
  };

  if (commonCommands[trimmedCommand]) {
    validation.suggestions.push(`✓ ${commonCommands[trimmedCommand]}`);
  }

  return validation;
}

/**
 * G-Code Validator service object
 */
export const GCodeValidator = {
  validateGcodeCommand
};

// Default export
export default GCodeValidator;