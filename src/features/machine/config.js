/**
 * Machine Feature Configuration
 * 
 * Configuration settings for machine control, status monitoring, diagnostics,
 * and safety operations. Controls machine behavior and safety parameters.
 */

/**
 * Machine control configuration
 */
export const machineConfig = {
  // Status monitoring settings
  status: {
    // How often to query machine status (milliseconds)
    queryInterval: 1000,
    
    // Timeout for status queries (milliseconds)
    queryTimeout: 5000,
    
    // Whether to cache status data
    cacheStatus: true,
    
    // Cache duration (milliseconds)
    cacheDuration: 500,
    
    // Maximum number of status history entries
    maxHistoryEntries: 1000,
    
    // Whether to track position changes
    trackPositionChanges: true
  },

  // Limits and boundaries
  limits: {
    // Whether to enforce software limits
    enforceSoftLimits: true,
    
    // Default machine travel limits (mm)
    defaultLimits: {
      x: { min: 0, max: 400 },
      y: { min: 0, max: 400 },
      z: { min: -100, max: 0 }
    },
    
    // Safety margin from limits (mm)
    safetyMargin: 5,
    
    // Whether to check limits before movement
    checkBeforeMovement: true,
    
    // Whether to query limits from machine
    queryMachineLimits: true,
    
    // Timeout for limits query (milliseconds)
    limitsQueryTimeout: 10000
  },

  // Diagnostic settings
  diagnostics: {
    // Whether to enable diagnostics
    enabled: true,
    
    // Default diagnostic sequence
    sequence: [
      { command: '?', description: 'Status query test' },
      { command: 'G91 G01 X1 F100', description: 'Small X movement' },
      { command: 'G91 G01 X-1', description: 'Return X movement' },
      { command: 'G91 G01 Y1 F100', description: 'Small Y movement' },
      { command: 'G91 G01 Y-1', description: 'Return Y movement' }
    ],
    
    // Diagnostic timeout (milliseconds)
    timeout: 30000,
    
    // Whether to return to original position
    returnToOrigin: true,
    
    // Movement distance for tests (mm)
    testMovementDistance: 1,
    
    // Test feed rate (mm/min)
    testFeedRate: 100,
    
    // Whether to save diagnostic results
    saveResults: true,
    
    // Maximum number of diagnostic history entries
    maxHistoryEntries: 100
  },

  // Safety operations
  safety: {
    // Emergency stop settings
    emergencyStop: {
      // Commands to send for emergency stop
      commands: ['!', 'M112'],
      
      // Whether to disable steppers after stop
      disableSteppers: true,
      
      // Whether to turn off spindle
      turnOffSpindle: true,
      
      // Timeout for emergency stop (milliseconds)
      timeout: 1000
    },

    // Home operation settings
    homing: {
      // Default homing command
      command: '$H',
      
      // Timeout for homing operation (milliseconds)
      timeout: 60000,
      
      // Whether to verify home position after homing
      verifyPosition: true,
      
      // Whether to set work coordinates after homing
      setWorkCoordinates: false,
      
      // Feed rate for homing movements (mm/min)
      feedRate: 500
    },

    // Unlock operation settings
    unlock: {
      // Command to unlock machine
      command: '$X',
      
      // Timeout for unlock operation (milliseconds)
      timeout: 5000,
      
      // Whether to verify unlock success
      verifyUnlock: true,
      
      // Whether to query status after unlock
      queryStatusAfter: true
    },

    // Reset operation settings
    reset: {
      // Soft reset command
      command: '\x18', // Ctrl-X
      
      // Timeout for reset operation (milliseconds)
      timeout: 10000,
      
      // Whether to wait for reset confirmation
      waitForConfirmation: true,
      
      // Whether to reinitialize after reset
      reinitializeAfter: true,
      
      // Delay before reinitializing (milliseconds)
      reinitializeDelay: 2000
    }
  },

  // Machine health monitoring
  health: {
    // Whether to enable health monitoring
    enabled: true,
    
    // Health check interval (milliseconds)
    checkInterval: 30000,
    
    // Health check timeout (milliseconds)
    checkTimeout: 5000,
    
    // Response time thresholds
    responseTime: {
      // Warning threshold (milliseconds)
      warning: 2000,
      
      // Critical threshold (milliseconds)
      critical: 10000
    },
    
    // Communication health
    communication: {
      // Maximum acceptable error rate (percentage)
      maxErrorRate: 5,
      
      // Time window for error rate calculation (milliseconds)
      errorRateWindow: 300000, // 5 minutes
      
      // Number of consecutive failures before unhealthy
      failureThreshold: 3
    },
    
    // Whether to include position tracking in health
    includePositionTracking: true,
    
    // Whether to include alarm status in health
    includeAlarmStatus: true
  },

  // Control operation settings
  control: {
    // Default feed rate for manual movements (mm/min)
    defaultFeedRate: 1000,
    
    // Default spindle speed (RPM)
    defaultSpindleSpeed: 1000,
    
    // Movement precision (decimal places)
    movementPrecision: 3,
    
    // Whether to confirm dangerous operations
    confirmDangerousOperations: true,
    
    // Operations requiring confirmation
    dangerousOperations: ['home', 'reset', 'emergencyStop'],
    
    // Maximum safe feed rate (mm/min)
    maxSafeFeedRate: 5000,
    
    // Maximum safe spindle speed (RPM)
    maxSafeSpindleSpeed: 24000
  },

  // Coordinate system settings
  coordinates: {
    // Default coordinate system
    defaultSystem: 'G54',
    
    // Available coordinate systems
    availableSystems: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
    
    // Whether to track multiple coordinate systems
    trackMultipleSystems: true,
    
    // Coordinate display precision
    displayPrecision: 3,
    
    // Whether to show machine coordinates
    showMachineCoordinates: true,
    
    // Whether to show work coordinates
    showWorkCoordinates: true
  },

  // Performance monitoring
  performance: {
    // Whether to track command execution times
    trackExecutionTimes: true,
    
    // Whether to track movement accuracy
    trackMovementAccuracy: false,
    
    // Whether to monitor communication performance
    monitorCommunication: true,
    
    // Sample size for performance averaging
    sampleSize: 100,
    
    // Performance data retention period (hours)
    retentionPeriod: 24
  }
};

/**
 * Get machine configuration with environment overrides
 */
export function getMachineConfig() {
  return {
    ...machineConfig,
    status: {
      ...machineConfig.status,
      queryInterval: parseInt(process.env.STATUS_QUERY_INTERVAL) || machineConfig.status.queryInterval,
      queryTimeout: parseInt(process.env.STATUS_QUERY_TIMEOUT) || machineConfig.status.queryTimeout
    },
    limits: {
      ...machineConfig.limits,
      enforceSoftLimits: process.env.ENFORCE_SOFT_LIMITS !== 'false',
      safetyMargin: parseFloat(process.env.SAFETY_MARGIN) || machineConfig.limits.safetyMargin
    },
    diagnostics: {
      ...machineConfig.diagnostics,
      enabled: process.env.DIAGNOSTICS_ENABLED !== 'false',
      timeout: parseInt(process.env.DIAGNOSTICS_TIMEOUT) || machineConfig.diagnostics.timeout
    },
    safety: {
      ...machineConfig.safety,
      emergencyStop: {
        ...machineConfig.safety.emergencyStop,
        timeout: parseInt(process.env.EMERGENCY_STOP_TIMEOUT) || machineConfig.safety.emergencyStop.timeout
      },
      homing: {
        ...machineConfig.safety.homing,
        timeout: parseInt(process.env.HOMING_TIMEOUT) || machineConfig.safety.homing.timeout,
        feedRate: parseInt(process.env.HOMING_FEED_RATE) || machineConfig.safety.homing.feedRate
      }
    },
    control: {
      ...machineConfig.control,
      defaultFeedRate: parseInt(process.env.DEFAULT_FEED_RATE) || machineConfig.control.defaultFeedRate,
      maxSafeFeedRate: parseInt(process.env.MAX_SAFE_FEED_RATE) || machineConfig.control.maxSafeFeedRate,
      maxSafeSpindleSpeed: parseInt(process.env.MAX_SAFE_SPINDLE_SPEED) || machineConfig.control.maxSafeSpindleSpeed
    }
  };
}

/**
 * Validate machine configuration
 */
export function validateMachineConfig(config = machineConfig) {
  const errors = [];

  // Validate status settings
  if (config.status.queryInterval <= 0) {
    errors.push('Status query interval must be greater than 0');
  }

  if (config.status.queryTimeout <= 0) {
    errors.push('Status query timeout must be greater than 0');
  }

  // Validate limits
  if (config.limits.safetyMargin < 0) {
    errors.push('Safety margin cannot be negative');
  }

  // Validate diagnostic settings
  if (config.diagnostics.timeout <= 0) {
    errors.push('Diagnostics timeout must be greater than 0');
  }

  if (config.diagnostics.testMovementDistance <= 0) {
    errors.push('Test movement distance must be greater than 0');
  }

  // Validate safety timeouts
  if (config.safety.emergencyStop.timeout <= 0) {
    errors.push('Emergency stop timeout must be greater than 0');
  }

  if (config.safety.homing.timeout <= 0) {
    errors.push('Homing timeout must be greater than 0');
  }

  // Validate control settings
  if (config.control.maxSafeFeedRate <= 0) {
    errors.push('Maximum safe feed rate must be greater than 0');
  }

  if (config.control.maxSafeSpindleSpeed <= 0) {
    errors.push('Maximum safe spindle speed must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default machineConfig;