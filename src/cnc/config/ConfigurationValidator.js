/**
 * Configuration Validator
 * 
 * Handles validation of machine configurations, settings compatibility,
 * and configuration synchronization with hardware capabilities.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class ConfigurationValidator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enableValidation: true,
      enableCompatibilityChecks: true,
      enableRangeValidation: true,
      strictMode: false,
      ...config
    };
    
    // Validation rules and schemas
    this.validationRules = this.createValidationRules();
    this.compatibilityMatrix = this.createCompatibilityMatrix();
  }
  
  /**
   * Validate complete machine configuration
   */
  validateMachineConfiguration(configuration) {
    const errors = [];
    const warnings = [];
    
    if (!this.config.enableValidation) {
      return { isValid: true, errors: [], warnings: [] };
    }
    
    try {
      // Validate machine section
      if (configuration.machine) {
        const machineValidation = this.validateMachineSection(configuration.machine);
        errors.push(...machineValidation.errors);
        warnings.push(...machineValidation.warnings);
      }
      
      // Validate spindle section
      if (configuration.spindle) {
        const spindleValidation = this.validateSpindleSection(configuration.spindle);
        errors.push(...spindleValidation.errors);
        warnings.push(...spindleValidation.warnings);
      }
      
      // Validate homing section
      if (configuration.homing) {
        const homingValidation = this.validateHomingSection(configuration.homing);
        errors.push(...homingValidation.errors);
        warnings.push(...homingValidation.warnings);
      }
      
      // Validate limits section
      if (configuration.limits) {
        const limitsValidation = this.validateLimitsSection(configuration.limits);
        errors.push(...limitsValidation.errors);
        warnings.push(...limitsValidation.warnings);
      }
      
      // Cross-validation checks
      if (configuration.machine && configuration.limits) {
        const crossValidation = this.validateCrossConfiguration(configuration);
        errors.push(...crossValidation.errors);
        warnings.push(...crossValidation.warnings);
      }
      
      const isValid = errors.length === 0;
      
      debug('Machine configuration validation completed', {
        isValid,
        errorCount: errors.length,
        warningCount: warnings.length
      });
      
      return { isValid, errors, warnings };
      
    } catch (err) {
      error('Configuration validation failed', { error: err.message });
      return {
        isValid: false,
        errors: [`Validation error: ${err.message}`],
        warnings: []
      };
    }
  }
  
  /**
   * Validate machine section
   */
  validateMachineSection(machine) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    if (!machine.name || typeof machine.name !== 'string') {
      errors.push('Machine name is required and must be a string');
    }
    
    if (!machine.type || typeof machine.type !== 'string') {
      errors.push('Machine type is required and must be a string');
    }
    
    // Validate machine type
    const validTypes = ['mill', 'lathe', 'router', 'plasma', 'laser', 'generic'];
    if (machine.type && !validTypes.includes(machine.type)) {
      warnings.push(`Unknown machine type: ${machine.type}. Known types: ${validTypes.join(', ')}`);
    }
    
    // Validate capabilities
    if (machine.capabilities && !Array.isArray(machine.capabilities)) {
      errors.push('Machine capabilities must be an array');
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate spindle section
   */
  validateSpindleSection(spindle) {
    const errors = [];
    const warnings = [];
    
    // Validate spindle type
    const validTypes = ['brushed', 'brushless', 'vfd', 'servo', 'stepper'];
    if (spindle.type && !validTypes.includes(spindle.type)) {
      warnings.push(`Unknown spindle type: ${spindle.type}`);
    }
    
    // Validate speed ranges
    if (spindle.minSpeed !== undefined && spindle.maxSpeed !== undefined) {
      if (spindle.minSpeed >= spindle.maxSpeed) {
        errors.push('Spindle minimum speed must be less than maximum speed');
      }
      
      if (spindle.minSpeed < 0) {
        errors.push('Spindle minimum speed cannot be negative');
      }
      
      if (spindle.maxSpeed <= 0) {
        errors.push('Spindle maximum speed must be positive');
      }
    }
    
    // Validate power range
    if (spindle.power !== undefined) {
      if (spindle.power <= 0) {
        errors.push('Spindle power must be positive');
      }
      
      if (spindle.power > 50000) { // 50kW seems reasonable upper limit
        warnings.push('Spindle power seems unusually high (>50kW)');
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate homing section
   */
  validateHomingSection(homing) {
    const errors = [];
    const warnings = [];
    
    // Validate homing sequence
    if (homing.sequence && !Array.isArray(homing.sequence)) {
      errors.push('Homing sequence must be an array');
    } else if (homing.sequence) {
      const validAxes = ['x', 'y', 'z', 'a', 'b', 'c'];
      for (const axis of homing.sequence) {
        if (!validAxes.includes(axis.toLowerCase())) {
          errors.push(`Invalid axis in homing sequence: ${axis}`);
        }
      }
    }
    
    // Validate feed rates
    if (homing.seekRate !== undefined && homing.seekRate <= 0) {
      errors.push('Homing seek rate must be positive');
    }
    
    if (homing.feedRate !== undefined && homing.feedRate <= 0) {
      errors.push('Homing feed rate must be positive');
    }
    
    if (homing.seekRate && homing.feedRate && homing.seekRate <= homing.feedRate) {
      warnings.push('Homing seek rate should typically be higher than feed rate');
    }
    
    // Validate pull-off distance
    if (homing.pullOff !== undefined && homing.pullOff < 0) {
      errors.push('Homing pull-off distance cannot be negative');
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate limits section
   */
  validateLimitsSection(limits) {
    const errors = [];
    const warnings = [];
    
    const axes = ['x', 'y', 'z'];
    
    for (const axis of axes) {
      if (limits[axis]) {
        const axisLimits = limits[axis];
        
        // Validate min/max values
        if (axisLimits.min !== undefined && axisLimits.max !== undefined) {
          if (axisLimits.min >= axisLimits.max) {
            errors.push(`${axis.toUpperCase()}-axis minimum must be less than maximum`);
          }
          
          const travel = axisLimits.max - axisLimits.min;
          if (travel <= 0) {
            errors.push(`${axis.toUpperCase()}-axis travel distance must be positive`);
          }
          
          if (travel > 10000) { // 10m seems reasonable upper limit
            warnings.push(`${axis.toUpperCase()}-axis travel distance seems unusually large (>${travel}mm)`);
          }
        }
        
        // Validate rates
        if (axisLimits.maxRate !== undefined && axisLimits.maxRate <= 0) {
          errors.push(`${axis.toUpperCase()}-axis maximum rate must be positive`);
        }
        
        if (axisLimits.acceleration !== undefined && axisLimits.acceleration <= 0) {
          errors.push(`${axis.toUpperCase()}-axis acceleration must be positive`);
        }
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Cross-validation between configuration sections
   */
  validateCrossConfiguration(configuration) {
    const errors = [];
    const warnings = [];
    
    // Check spindle speed vs machine type
    if (configuration.machine?.type === 'laser' && configuration.spindle?.maxSpeed > 0) {
      warnings.push('Laser machines typically do not have spindle speed settings');
    }
    
    // Check homing vs limits compatibility
    if (configuration.homing?.enabled && !configuration.limits?.hard?.enabled) {
      warnings.push('Homing is enabled but hard limits are disabled - this may be unsafe');
    }
    
    // Check work envelope vs machine limits
    if (configuration.workEnvelope && configuration.limits) {
      const axes = ['x', 'y', 'z'];
      
      for (const axis of axes) {
        const workSize = configuration.workEnvelope[axis];
        const machineTravel = configuration.limits[axis];
        
        if (workSize && machineTravel && workSize > (machineTravel.max - machineTravel.min)) {
          warnings.push(`Work envelope ${axis.toUpperCase()}-axis (${workSize}mm) exceeds machine travel (${machineTravel.max - machineTravel.min}mm)`);
        }
      }
    }
    
    return { errors, warnings };
  }
  
  /**
   * Validate GRBL settings compatibility
   */
  validateGrblSettingsCompatibility(settings, machineConfig) {
    const errors = [];
    const warnings = [];
    
    if (!this.config.enableCompatibilityChecks) {
      return { isValid: true, errors: [], warnings: [] };
    }
    
    // Check if settings match machine configuration
    
    // Check steps per unit vs machine type
    const stepsPerUnit = {
      x: settings[100],
      y: settings[101],
      z: settings[102]
    };
    
    Object.entries(stepsPerUnit).forEach(([axis, steps]) => {
      if (steps !== undefined) {
        if (steps < 1 || steps > 10000) {
          warnings.push(`${axis.toUpperCase()}-axis steps per unit (${steps}) seems unusual`);
        }
      }
    });
    
    // Check homing settings vs configuration
    const homingEnabled = settings[22] === 1;
    if (machineConfig?.homing?.enabled !== homingEnabled) {
      warnings.push('GRBL homing setting does not match machine configuration');
    }
    
    // Check soft limits vs machine limits
    const softLimitsEnabled = settings[20] === 1;
    if (softLimitsEnabled && machineConfig?.limits) {
      const maxTravel = {
        x: settings[130],
        y: settings[131],
        z: settings[132]
      };
      
      Object.entries(maxTravel).forEach(([axis, travel]) => {
        const configTravel = machineConfig.limits[axis];
        if (travel && configTravel) {
          const configTravelDistance = configTravel.max - configTravel.min;
          if (Math.abs(travel - configTravelDistance) > 1) { // 1mm tolerance
            warnings.push(`GRBL ${axis.toUpperCase()}-axis max travel (${travel}mm) differs from config (${configTravelDistance}mm)`);
          }
        }
      });
    }
    
    const isValid = errors.length === 0;
    
    return { isValid, errors, warnings };
  }
  
  /**
   * Validate configuration consistency
   */
  validateConfigurationConsistency(config1, config2) {
    const differences = [];
    
    this.compareObjectRecursive(config1, config2, '', differences);
    
    return {
      isConsistent: differences.length === 0,
      differences
    };
  }
  
  /**
   * Compare objects recursively
   */
  compareObjectRecursive(obj1, obj2, path, differences) {
    const keys1 = Object.keys(obj1 || {});
    const keys2 = Object.keys(obj2 || {});
    const allKeys = new Set([...keys1, ...keys2]);
    
    for (const key of allKeys) {
      const currentPath = path ? `${path}.${key}` : key;
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];
      
      if (val1 === undefined && val2 !== undefined) {
        differences.push({ path: currentPath, type: 'missing_in_first', value2: val2 });
      } else if (val1 !== undefined && val2 === undefined) {
        differences.push({ path: currentPath, type: 'missing_in_second', value1: val1 });
      } else if (typeof val1 === 'object' && typeof val2 === 'object' && val1 !== null && val2 !== null) {
        this.compareObjectRecursive(val1, val2, currentPath, differences);
      } else if (val1 !== val2) {
        differences.push({ path: currentPath, type: 'different_values', value1: val1, value2: val2 });
      }
    }
  }
  
  /**
   * Create validation rules
   */
  createValidationRules() {
    return {
      machine: {
        name: { required: true, type: 'string', minLength: 1, maxLength: 100 },
        type: { required: true, type: 'string', enum: ['mill', 'lathe', 'router', 'plasma', 'laser', 'generic'] },
        version: { required: false, type: 'string' },
        capabilities: { required: false, type: 'array' }
      },
      spindle: {
        type: { required: false, type: 'string', enum: ['brushed', 'brushless', 'vfd', 'servo', 'stepper'] },
        minSpeed: { required: false, type: 'number', min: 0 },
        maxSpeed: { required: false, type: 'number', min: 1 },
        power: { required: false, type: 'number', min: 0.1 }
      },
      homing: {
        enabled: { required: false, type: 'boolean' },
        sequence: { required: false, type: 'array' },
        seekRate: { required: false, type: 'number', min: 1 },
        feedRate: { required: false, type: 'number', min: 1 },
        pullOff: { required: false, type: 'number', min: 0 }
      }
    };
  }
  
  /**
   * Create compatibility matrix
   */
  createCompatibilityMatrix() {
    return {
      machineTypes: {
        mill: { typical_spindle: ['brushed', 'brushless', 'vfd'], homing_required: true },
        lathe: { typical_spindle: ['brushed', 'brushless', 'vfd'], homing_required: true },
        router: { typical_spindle: ['brushed', 'brushless'], homing_required: false },
        plasma: { typical_spindle: [], homing_required: false },
        laser: { typical_spindle: [], homing_required: false },
        generic: { typical_spindle: ['brushed', 'brushless', 'vfd'], homing_required: false }
      }
    };
  }
  
  /**
   * Get validation summary
   */
  getValidationSummary(configuration) {
    const validation = this.validateMachineConfiguration(configuration);
    
    return {
      isValid: validation.isValid,
      score: this.calculateValidationScore(validation),
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
      criticalIssues: validation.errors.filter(error => error.includes('required')),
      recommendations: this.generateRecommendations(validation)
    };
  }
  
  /**
   * Calculate validation score (0-100)
   */
  calculateValidationScore(validation) {
    const maxPoints = 100;
    const errorPenalty = 20;
    const warningPenalty = 5;
    
    const deductions = (validation.errors.length * errorPenalty) + (validation.warnings.length * warningPenalty);
    return Math.max(0, maxPoints - deductions);
  }
  
  /**
   * Generate recommendations based on validation results
   */
  generateRecommendations(validation) {
    const recommendations = [];
    
    if (validation.errors.length > 0) {
      recommendations.push('Fix configuration errors before proceeding');
    }
    
    if (validation.warnings.length > 5) {
      recommendations.push('Consider reviewing configuration warnings to improve setup');
    }
    
    return recommendations;
  }
}