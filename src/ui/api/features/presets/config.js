/**
 * Presets Feature Configuration
 * 
 * Configuration settings for preset management, storage, execution,
 * and validation. Controls preset behavior and security settings.
 */

import path from 'path';

/**
 * Presets management configuration
 */
export const presetsConfig = {
  // Storage settings
  storage: {
    // Directory for preset files
    presetsDirectory: process.env.PRESETS_DIR || './presets',
    
    // File extension for preset files
    fileExtension: '.json',
    
    // Whether to create subdirectories by category
    createCategoryDirectories: true,
    
    // Whether to backup presets before modification
    backupOnModify: true,
    
    // Backup directory
    backupDirectory: './backups/presets',
    
    // Maximum number of backups to keep
    maxBackups: 10,
    
    // Whether to compress backup files
    compressBackups: false
  },

  // Preset validation settings
  validation: {
    // Whether to validate preset structure
    validateStructure: true,
    
    // Whether to validate G-code commands
    validateCommands: true,
    
    // Validation strictness: 'strict', 'normal', 'permissive'
    strictnessLevel: 'normal',
    
    // Required preset fields
    requiredFields: ['name', 'description', 'commands'],
    
    // Optional preset fields
    optionalFields: ['category', 'metadata', 'parameters'],
    
    // Maximum preset name length
    maxNameLength: 50,
    
    // Maximum description length
    maxDescriptionLength: 200,
    
    // Maximum number of commands per preset
    maxCommands: 1000,
    
    // Whether to check for dangerous commands
    checkDangerousCommands: true,
    
    // Commands requiring special permission
    dangerousCommands: ['M05', 'M30', 'M112', 'G28', 'G30']
  },

  // Execution settings
  execution: {
    // Default execution mode: 'normal', 'dry_run', 'step'
    defaultMode: 'normal',
    
    // Whether to allow dry run execution
    allowDryRun: true,
    
    // Whether to allow step-by-step execution
    allowStepExecution: true,
    
    // Timeout for preset execution (milliseconds, 0 = no timeout)
    executionTimeout: 300000, // 5 minutes
    
    // Whether to log preset executions
    logExecutions: true,
    
    // Whether to track execution statistics
    trackStatistics: true,
    
    // Whether to validate machine state before execution
    validateMachineState: true,
    
    // Required machine states for execution
    requiredMachineStates: ['Idle', 'Hold']
  },

  // Parameter substitution settings
  parameters: {
    // Whether to enable parameter substitution
    enableSubstitution: true,
    
    // Parameter syntax: '{{param}}', '{param}', '$param'
    syntax: '{{param}}',
    
    // Whether to validate parameter types
    validateTypes: true,
    
    // Whether to require all parameters to be provided
    requireAllParameters: true,
    
    // Whether to use default values for missing parameters
    useDefaultValues: true,
    
    // Maximum parameter value length
    maxValueLength: 100,
    
    // Supported parameter types
    supportedTypes: ['string', 'number', 'boolean', 'coordinate']
  },

  // Categories and organization
  categories: {
    // Default preset categories
    defaultCategories: [
      'setup',
      'calibration', 
      'maintenance',
      'tool_change',
      'safety',
      'custom'
    ],
    
    // Whether to allow custom categories
    allowCustomCategories: true,
    
    // Maximum category name length
    maxCategoryNameLength: 30,
    
    // Whether to validate category names
    validateCategoryNames: true,
    
    // Category naming pattern (regex)
    categoryNamePattern: '^[a-z0-9_]+$'
  },

  // Security and permissions
  security: {
    // Whether to enforce permission checks
    enforcePermissions: false,
    
    // Default permission level: 'read', 'write', 'execute', 'admin'
    defaultPermissionLevel: 'execute',
    
    // Whether to allow preset modification
    allowModification: true,
    
    // Whether to allow preset deletion
    allowDeletion: true,
    
    // Whether to require confirmation for dangerous presets
    requireConfirmation: true,
    
    // Presets requiring confirmation
    confirmationRequired: ['safety', 'maintenance'],
    
    // Whether to audit preset operations
    auditOperations: true,
    
    // Maximum concurrent executions per user
    maxConcurrentExecutions: 3
  },

  // Performance and caching
  performance: {
    // Whether to cache preset data
    enableCaching: true,
    
    // Cache duration (milliseconds)
    cacheDuration: 300000, // 5 minutes
    
    // Maximum cached presets
    maxCachedPresets: 100,
    
    // Whether to preload commonly used presets
    preloadCommon: true,
    
    // Whether to optimize preset loading
    optimizeLoading: true,
    
    // Batch size for bulk operations
    batchSize: 10,
    
    // Memory limit for preset operations (bytes)
    memoryLimit: 50 * 1024 * 1024 // 50MB
  },

  // Metadata and tracking
  metadata: {
    // Whether to automatically add creation metadata
    autoAddCreationMetadata: true,
    
    // Whether to track modification history
    trackModificationHistory: true,
    
    // Whether to track usage statistics
    trackUsageStatistics: true,
    
    // Whether to add version information
    addVersionInfo: true,
    
    // Maximum metadata size (bytes)
    maxMetadataSize: 10 * 1024, // 10KB
    
    // Metadata fields to track
    trackedFields: [
      'created',
      'modified',
      'author',
      'version',
      'usage_count',
      'last_used'
    ]
  },

  // Import/Export settings
  importExport: {
    // Whether to allow preset import
    allowImport: true,
    
    // Whether to allow preset export
    allowExport: true,
    
    // Supported import formats
    supportedImportFormats: ['json'],
    
    // Supported export formats
    supportedExportFormats: ['json', 'gcode'],
    
    // Whether to validate imported presets
    validateImports: true,
    
    // Whether to backup before import
    backupBeforeImport: true,
    
    // Maximum import file size (bytes)
    maxImportFileSize: 1024 * 1024, // 1MB
    
    // Whether to merge or replace on import conflict
    conflictResolution: 'merge'
  },

  // Error handling
  errorHandling: {
    // How to handle execution errors: 'stop', 'continue', 'prompt'
    executionErrorStrategy: 'stop',
    
    // How to handle validation errors: 'reject', 'warn', 'ignore'
    validationErrorStrategy: 'reject',
    
    // Whether to log all errors
    logErrors: true,
    
    // Whether to continue with remaining commands on error
    continueOnError: false,
    
    // Maximum retry attempts for failed operations
    maxRetryAttempts: 3,
    
    // Delay between retry attempts (milliseconds)
    retryDelay: 1000
  }
};

/**
 * Get presets configuration with environment overrides
 */
export function getPresetsConfig() {
  return {
    ...presetsConfig,
    storage: {
      ...presetsConfig.storage,
      presetsDirectory: process.env.PRESETS_DIR || presetsConfig.storage.presetsDirectory,
      backupOnModify: process.env.BACKUP_ON_MODIFY !== 'false',
      maxBackups: parseInt(process.env.MAX_PRESET_BACKUPS) || presetsConfig.storage.maxBackups
    },
    validation: {
      ...presetsConfig.validation,
      validateCommands: process.env.VALIDATE_PRESET_COMMANDS !== 'false',
      strictnessLevel: process.env.PRESET_VALIDATION_STRICTNESS || presetsConfig.validation.strictnessLevel,
      checkDangerousCommands: process.env.CHECK_DANGEROUS_PRESET_COMMANDS !== 'false'
    },
    execution: {
      ...presetsConfig.execution,
      defaultMode: process.env.DEFAULT_PRESET_EXECUTION_MODE || presetsConfig.execution.defaultMode,
      executionTimeout: parseInt(process.env.PRESET_EXECUTION_TIMEOUT) || presetsConfig.execution.executionTimeout,
      allowDryRun: process.env.ALLOW_PRESET_DRY_RUN !== 'false'
    },
    security: {
      ...presetsConfig.security,
      enforcePermissions: process.env.ENFORCE_PRESET_PERMISSIONS === 'true',
      allowModification: process.env.ALLOW_PRESET_MODIFICATION !== 'false',
      allowDeletion: process.env.ALLOW_PRESET_DELETION !== 'false',
      requireConfirmation: process.env.REQUIRE_PRESET_CONFIRMATION !== 'false'
    },
    performance: {
      ...presetsConfig.performance,
      enableCaching: process.env.ENABLE_PRESET_CACHING !== 'false',
      cacheDuration: parseInt(process.env.PRESET_CACHE_DURATION) || presetsConfig.performance.cacheDuration
    }
  };
}

/**
 * Validate presets configuration
 */
export function validatePresetsConfig(config = presetsConfig) {
  const errors = [];

  // Validate storage settings
  if (!config.storage.presetsDirectory) {
    errors.push('Presets directory must be specified');
  }

  if (config.storage.maxBackups < 0) {
    errors.push('Maximum backups cannot be negative');
  }

  // Validate validation settings
  if (config.validation.maxNameLength <= 0) {
    errors.push('Maximum name length must be greater than 0');
  }

  if (config.validation.maxDescriptionLength <= 0) {
    errors.push('Maximum description length must be greater than 0');
  }

  if (config.validation.maxCommands <= 0) {
    errors.push('Maximum commands must be greater than 0');
  }

  // Validate execution settings
  if (config.execution.executionTimeout < 0) {
    errors.push('Execution timeout cannot be negative');
  }

  // Validate parameter settings
  const validSyntaxOptions = ['{{param}}', '{param}', '$param'];
  if (!validSyntaxOptions.includes(config.parameters.syntax)) {
    errors.push(`Parameter syntax must be one of: ${validSyntaxOptions.join(', ')}`);
  }

  // Validate performance settings
  if (config.performance.maxCachedPresets <= 0) {
    errors.push('Maximum cached presets must be greater than 0');
  }

  if (config.performance.batchSize <= 0) {
    errors.push('Batch size must be greater than 0');
  }

  // Validate import/export settings
  if (config.importExport.maxImportFileSize <= 0) {
    errors.push('Maximum import file size must be greater than 0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default presetsConfig;