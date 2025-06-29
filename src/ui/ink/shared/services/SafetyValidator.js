/**
 * Safety Validation Service
 * 
 * Provides comprehensive safety validation for G-code commands and machine movements.
 * Includes movement limit checking, command parsing, and safe movement sequence generation.
 * 
 * @module SafetyValidator
 */

/**
 * Main safety validation service
 */
export const SafetyValidator = {
  /**
   * Check if movement would exceed machine limits
   * @param {Object} currentPos - Current machine position {x, y, z}
   * @param {Object} targetPos - Target movement position {x, y, z}
   * @param {Object} machineLimits - Machine axis limits {x: {min, max}, y: {min, max}, z: {min, max}}
   * @returns {Object} Validation result with isValid, errors, warnings, recommendation
   */
  validateMovement: (currentPos, targetPos, machineLimits) => {
    const errors = [];
    const warnings = [];
    
    ['x', 'y', 'z'].forEach(axis => {
      const target = targetPos[axis];
      const limit = machineLimits[axis];
      
      if (target < -limit) {
        errors.push(`${axis.toUpperCase()}-axis target (${target.toFixed(2)}) below minimum limit (-${limit})`);
      }
      if (target > limit) {
        errors.push(`${axis.toUpperCase()}-axis target (${target.toFixed(2)}) above maximum limit (${limit})`);
      }
      
      // Warning for movements close to limits (within 5mm/0.2in)
      const warningMargin = 5;
      if (target > limit - warningMargin) {
        warnings.push(`${axis.toUpperCase()}-axis movement approaching maximum limit`);
      }
      if (target < -limit + warningMargin) {
        warnings.push(`${axis.toUpperCase()}-axis movement approaching minimum limit`);
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      recommendation: errors.length > 0 ? 'Reduce movement distance or check machine setup' : null
    };
  },
  
  /**
   * Parse G-code command to extract movement information
   * @param {string} gcode - G-code command string
   * @param {Object} currentPos - Current position {x, y, z}
   * @returns {Object|null} New position object or null if not a movement command
   */
  parseMovementCommand: (gcode, currentPos = { x: 0, y: 0, z: 0 }) => {
    const command = gcode.trim().toUpperCase();
    
    // Only check movement commands (G0, G1, G2, G3)
    if (!command.match(/^G[0-3]/)) {
      return null;
    }
    
    const newPos = { ...currentPos };
    
    // Extract coordinates from G-code
    const xMatch = command.match(/X([-+]?\d*\.?\d+)/);
    const yMatch = command.match(/Y([-+]?\d*\.?\d+)/);
    const zMatch = command.match(/Z([-+]?\d*\.?\d+)/);
    
    if (xMatch) newPos.x = parseFloat(xMatch[1]);
    if (yMatch) newPos.y = parseFloat(yMatch[1]);
    if (zMatch) newPos.z = parseFloat(zMatch[1]);
    
    return newPos;
  },
  
  /**
   * Check if G-code command is safe to execute
   * @param {string} gcode - G-code command to validate
   * @param {Object} currentPos - Current machine position
   * @param {Object} machineLimits - Machine axis limits
   * @param {Object} settings - Machine settings and preferences
   * @returns {Object} Comprehensive validation result
   */
  validateGcodeCommand: (gcode, currentPos, machineLimits, settings) => {
    const result = {
      isValid: true,
      isSafe: true,
      errors: [],
      warnings: [],
      suggestions: []
    };
    
    const targetPos = SafetyValidator.parseMovementCommand(gcode, currentPos);
    
    if (targetPos) {
      const movementCheck = SafetyValidator.validateMovement(currentPos, targetPos, machineLimits);
      
      if (!movementCheck.isValid) {
        result.isValid = false;
        result.isSafe = false;
        result.errors.push(...movementCheck.errors);
        if (movementCheck.recommendation) {
          result.suggestions.push(movementCheck.recommendation);
        }
      }
      
      if (movementCheck.warnings.length > 0) {
        result.warnings.push(...movementCheck.warnings);
        result.suggestions.push('Consider using smaller increments near machine limits');
      }
    }
    
    // Check for other safety concerns
    const command = gcode.trim().toUpperCase();
    
    // Rapid Z moves without safe height check
    if (command.startsWith('G0') && command.includes('Z') && targetPos) {
      const safeHeight = settings.machine?.safeHeight || 5;
      if (targetPos.z < safeHeight && currentPos.z < safeHeight) {
        result.warnings.push('Rapid Z movement below safe height');
        result.suggestions.push(`Consider moving to safe height (Z${safeHeight}) first`);
      }
    }
    
    // High speed movements
    const feedMatch = command.match(/F(\d+)/);
    if (feedMatch) {
      const feedRate = parseInt(feedMatch[1]);
      const maxSafeSpeed = settings.machine?.jogSpeeds?.fast || 1000;
      if (feedRate > maxSafeSpeed * 1.5) {
        result.warnings.push(`High feed rate detected: ${feedRate} mm/min`);
        result.suggestions.push('Consider reducing feed rate for safety');
      }
    }
    
    return result;
  },
  
  /**
   * Generate safe movement sequence to avoid collisions
   * @param {Object} currentPos - Current machine position
   * @param {Object} targetPos - Target position
   * @param {Object} settings - Machine settings
   * @returns {Array} Array of safe G-code commands
   */
  generateSafeMovement: (currentPos, targetPos, settings) => {
    const commands = [];
    const safeHeight = settings.machine?.safeHeight || 5;
    
    // If Z is moving down and current Z is not at safe height, move to safe height first
    if (targetPos.z < currentPos.z && currentPos.z < safeHeight) {
      commands.push(`G0 Z${safeHeight} ; Move to safe height`);
    }
    
    // Move XY at safe height
    if (targetPos.x !== currentPos.x || targetPos.y !== currentPos.y) {
      commands.push(`G0 X${targetPos.x} Y${targetPos.y} ; XY positioning`);
    }
    
    // Finally move Z to target
    if (targetPos.z !== currentPos.z) {
      commands.push(`G0 Z${targetPos.z} ; Z positioning`);
    }
    
    return commands;
  }
};

export default SafetyValidator;