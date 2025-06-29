/**
 * Files Feature Configuration
 * 
 * Configuration settings for file upload, validation, storage, and management.
 * Controls file handling behavior, security settings, and processing options.
 */

import path from 'path';

/**
 * File upload and storage configuration
 */
export const filesConfig = {
  // Upload settings
  upload: {
    // Maximum file size in bytes (50MB default)
    maxFileSize: 50 * 1024 * 1024,
    
    // Allowed file extensions
    allowedExtensions: ['.gcode', '.nc', '.txt', '.tap', '.cnc'],
    
    // Allowed MIME types
    allowedMimeTypes: [
      'text/plain',
      'application/octet-stream',
      'text/x-gcode'
    ],
    
    // Upload directory (relative to project root)
    uploadDirectory: process.env.UPLOAD_DIR || './uploads',
    
    // Whether to preserve original filenames
    preserveFilenames: true,
    
    // File naming strategy: 'original', 'timestamp', 'uuid'
    namingStrategy: 'original',
    
    // Whether to overwrite existing files
    allowOverwrite: false
  },

  // File validation settings
  validation: {
    // Whether to perform syntax validation on upload
    validateSyntax: true,
    
    // Validation strictness level: 'strict', 'normal', 'permissive'
    strictnessLevel: 'normal',
    
    // Maximum number of lines to validate (0 = no limit)
    maxLinesToValidate: 10000,
    
    // Whether to validate coordinate bounds
    validateBounds: true,
    
    // Whether to check for dangerous commands
    checkDangerousCommands: true,
    
    // Commands considered dangerous
    dangerousCommands: ['M05', 'M30', 'M112'],
    
    // Maximum coordinate values
    maxCoordinates: {
      x: 1000,
      y: 1000,
      z: 100
    }
  },

  // File processing settings
  processing: {
    // Whether to analyze files on upload
    analyzeOnUpload: true,
    
    // Whether to generate file statistics
    generateStats: true,
    
    // Whether to estimate execution time
    estimateExecutionTime: true,
    
    // Default feed rate for time estimation (mm/min)
    defaultFeedRate: 1000,
    
    // Whether to extract coordinate bounds
    extractBounds: true,
    
    // Whether to identify tool changes
    identifyToolChanges: true
  },

  // Storage and cleanup settings
  storage: {
    // How long to keep uploaded files (hours, 0 = forever)
    retentionPeriod: 24,
    
    // Whether to enable automatic cleanup
    autoCleanup: true,
    
    // How often to run cleanup (hours)
    cleanupInterval: 6,
    
    // Whether to create backup copies
    createBackups: false,
    
    // Backup directory
    backupDirectory: './backups/uploads',
    
    // Maximum storage size (bytes, 0 = no limit)
    maxStorageSize: 1024 * 1024 * 1024, // 1GB
    
    // Whether to compress stored files
    compressFiles: false
  },

  // Security settings
  security: {
    // Whether to scan for malicious content
    scanForMalware: false,
    
    // Whether to validate file headers
    validateHeaders: true,
    
    // Whether to strip comments from files
    stripComments: false,
    
    // Whether to normalize line endings
    normalizeLineEndings: true,
    
    // Maximum nesting depth for includes/macros
    maxNestingDepth: 10,
    
    // Whether to allow external references
    allowExternalReferences: false
  },

  // Performance settings
  performance: {
    // Buffer size for file reading (bytes)
    readBufferSize: 64 * 1024,
    
    // Whether to use streaming for large files
    useStreaming: true,
    
    // Threshold for streaming (bytes)
    streamingThreshold: 1024 * 1024, // 1MB
    
    // Number of concurrent file operations
    maxConcurrentOperations: 3,
    
    // Whether to cache file analysis results
    cacheAnalysis: true,
    
    // Cache duration (milliseconds)
    cacheDuration: 300000 // 5 minutes
  },

  // API response settings
  response: {
    // Whether to include file content in responses
    includeContent: false,
    
    // Whether to include full file analysis
    includeAnalysis: true,
    
    // Whether to include file statistics
    includeStats: true,
    
    // Maximum content length in responses
    maxContentLength: 1000,
    
    // Whether to compress large responses
    compressResponses: true
  }
};

/**
 * Get files configuration with environment overrides
 */
export function getFilesConfig() {
  return {
    ...filesConfig,
    upload: {
      ...filesConfig.upload,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || filesConfig.upload.maxFileSize,
      uploadDirectory: process.env.UPLOAD_DIR || filesConfig.upload.uploadDirectory,
      allowOverwrite: process.env.ALLOW_OVERWRITE === 'true'
    },
    validation: {
      ...filesConfig.validation,
      validateSyntax: process.env.VALIDATE_SYNTAX !== 'false',
      strictnessLevel: process.env.VALIDATION_STRICTNESS || filesConfig.validation.strictnessLevel
    },
    storage: {
      ...filesConfig.storage,
      retentionPeriod: parseInt(process.env.FILE_RETENTION_HOURS) || filesConfig.storage.retentionPeriod,
      autoCleanup: process.env.AUTO_CLEANUP !== 'false'
    }
  };
}

/**
 * Validate file configuration
 */
export function validateFilesConfig(config = filesConfig) {
  const errors = [];

  // Validate upload directory
  if (!config.upload.uploadDirectory) {
    errors.push('Upload directory must be specified');
  }

  // Validate file size limits
  if (config.upload.maxFileSize <= 0) {
    errors.push('Maximum file size must be greater than 0');
  }

  // Validate allowed extensions
  if (!Array.isArray(config.upload.allowedExtensions) || config.upload.allowedExtensions.length === 0) {
    errors.push('At least one allowed file extension must be specified');
  }

  // Validate retention period
  if (config.storage.retentionPeriod < 0) {
    errors.push('Retention period cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default filesConfig;