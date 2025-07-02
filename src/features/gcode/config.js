/**
 * G-code Feature Configuration
 * 
 * Configuration settings for G-code command execution, file processing,
 * and queue management. Controls execution behavior and safety settings.
 */

/**
 * G-code execution configuration
 */
export const gcodeConfig = {
  // Command execution settings
  execution: {
    // Timeout for single command execution (milliseconds)
    commandTimeout: 30000,
    
    // Timeout for file execution (milliseconds, 0 = no timeout)
    fileTimeout: 0,
    
    // Whether to wait for machine response before next command
    waitForResponse: true,
    
    // Maximum time to wait for machine response (milliseconds)
    responseTimeout: 10000,
    
    // Whether to validate commands before execution
    validateBeforeExecution: true,
    
    // Whether to log all executed commands
    logCommands: true
  },

  // Queue management settings
  queue: {
    // Maximum number of commands in queue
    maxQueueSize: 1000,
    
    // Whether to enable command queuing
    enableQueuing: true,
    
    // Queue processing strategy: 'fifo', 'priority', 'adaptive'
    processingStrategy: 'fifo',
    
    // Time between queue processing cycles (milliseconds)
    processingInterval: 100,
    
    // Whether to pause queue on errors
    pauseOnError: true,
    
    // Maximum queue idle time before auto-clear (milliseconds)
    maxIdleTime: 300000 // 5 minutes
  },

  // File processing settings
  fileProcessing: {
    // Whether to preprocess files before execution
    preprocessFiles: true,
    
    // Whether to optimize G-code sequences
    optimizeSequences: false,
    
    // Whether to remove comments before execution
    removeComments: false,
    
    // Whether to normalize coordinates
    normalizeCoordinates: false,
    
    // Line ending style: 'lf', 'crlf', 'auto'
    lineEndings: 'auto',
    
    // Whether to validate file syntax before execution
    validateSyntax: true
  },

  // Safety and validation settings
  safety: {
    // Whether to enforce machine limits
    enforceLimits: true,
    
    // Whether to check for dangerous commands
    checkDangerousCommands: true,
    
    // Commands that require confirmation
    dangerousCommands: [
      'M05',  // Spindle stop
      'M30',  // Program end
      'M112', // Emergency stop
      'G28',  // Return to home
      'G30'   // Return to secondary home
    ],
    
    // Whether to require confirmation for dangerous commands
    requireConfirmation: false,
    
    // Maximum safe feed rate (mm/min)
    maxSafeFeedRate: 5000,
    
    // Maximum safe spindle speed (RPM)
    maxSafeSpindleSpeed: 24000,
    
    // Whether to check coordinate bounds
    checkBounds: true
  },

  // Execution modes
  modes: {
    // Default execution mode: 'normal', 'dry_run', 'step'
    defaultMode: 'normal',
    
    // Whether dry run mode is available
    allowDryRun: true,
    
    // Whether step-by-step mode is available
    allowStepMode: true,
    
    // Whether to simulate execution in dry run
    simulateExecution: true,
    
    // Step mode confirmation timeout (milliseconds)
    stepConfirmationTimeout: 30000
  },

  // Progress tracking settings
  progress: {
    // Whether to track execution progress
    enableTracking: true,
    
    // How often to update progress (milliseconds)
    updateInterval: 1000,
    
    // Whether to estimate remaining time
    estimateTimeRemaining: true,
    
    // Whether to calculate completion percentage
    calculatePercentage: true,
    
    // Whether to track execution statistics
    trackStatistics: true,
    
    // Maximum number of progress history entries
    maxHistoryEntries: 1000
  },

  // Error handling settings
  errorHandling: {
    // How to handle execution errors: 'stop', 'continue', 'prompt'
    errorStrategy: 'stop',
    
    // Maximum number of retry attempts
    maxRetries: 3,
    
    // Delay between retry attempts (milliseconds)
    retryDelay: 2000,
    
    // Whether to log all errors
    logErrors: true,
    
    // Whether to clear queue on critical errors
    clearQueueOnCriticalError: true,
    
    // Commands that are considered critical errors
    criticalErrorCommands: ['M112', 'ALARM'],
    
    // Whether to attempt error recovery
    attemptRecovery: true
  },

  // Performance settings
  performance: {
    // Buffer size for command processing
    commandBufferSize: 100,
    
    // Whether to use command batching
    enableBatching: false,
    
    // Maximum batch size
    maxBatchSize: 10,
    
    // Whether to optimize command ordering
    optimizeOrdering: false,
    
    // Memory limit for file processing (bytes)
    memoryLimit: 100 * 1024 * 1024, // 100MB
    
    // Whether to use streaming for large files
    useStreamingForLargeFiles: true,
    
    // Threshold for streaming (bytes)
    streamingThreshold: 10 * 1024 * 1024 // 10MB
  }
};

/**
 * Get G-code configuration with environment overrides
 */
export function getGcodeConfig() {
  return {
    ...gcodeConfig,
    execution: {
      ...gcodeConfig.execution,
      commandTimeout: parseInt(process.env.GCODE_COMMAND_TIMEOUT) || gcodeConfig.execution.commandTimeout,
      validateBeforeExecution: process.env.VALIDATE_BEFORE_EXECUTION !== 'false'
    },
    queue: {
      ...gcodeConfig.queue,
      maxQueueSize: parseInt(process.env.MAX_QUEUE_SIZE) || gcodeConfig.queue.maxQueueSize,
      enableQueuing: process.env.ENABLE_QUEUING !== 'false'
    },
    safety: {
      ...gcodeConfig.safety,
      enforceLimits: process.env.ENFORCE_LIMITS !== 'false',
      checkDangerousCommands: process.env.CHECK_DANGEROUS_COMMANDS !== 'false',
      maxSafeFeedRate: parseInt(process.env.MAX_SAFE_FEED_RATE) || gcodeConfig.safety.maxSafeFeedRate
    },
    modes: {
      ...gcodeConfig.modes,
      defaultMode: process.env.DEFAULT_EXECUTION_MODE || gcodeConfig.modes.defaultMode,
      allowDryRun: process.env.ALLOW_DRY_RUN !== 'false'
    }
  };
}

/**
 * Validate G-code configuration
 */
export function validateGcodeConfig(config = gcodeConfig) {
  const errors = [];

  // Validate timeouts
  if (config.execution.commandTimeout <= 0) {
    errors.push('Command timeout must be greater than 0');
  }

  if (config.execution.responseTimeout <= 0) {
    errors.push('Response timeout must be greater than 0');
  }

  // Validate queue settings
  if (config.queue.maxQueueSize <= 0) {
    errors.push('Maximum queue size must be greater than 0');
  }

  if (config.queue.processingInterval <= 0) {
    errors.push('Processing interval must be greater than 0');
  }

  // Validate safety settings
  if (config.safety.maxSafeFeedRate <= 0) {
    errors.push('Maximum safe feed rate must be greater than 0');
  }

  if (config.safety.maxSafeSpindleSpeed <= 0) {
    errors.push('Maximum safe spindle speed must be greater than 0');
  }

  // Validate execution modes
  const validModes = ['normal', 'dry_run', 'step'];
  if (!validModes.includes(config.modes.defaultMode)) {
    errors.push(`Default mode must be one of: ${validModes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default gcodeConfig;