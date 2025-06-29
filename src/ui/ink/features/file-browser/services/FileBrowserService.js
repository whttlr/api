/**
 * File Browser Service
 * 
 * Utility functions for file management, formatting, and G-code file operations.
 * 
 * @module FileBrowserService
 */

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format time duration for display
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
}

/**
 * Get file icon based on extension
 * @param {string} extension - File extension
 * @returns {string} Unicode icon for file type
 */
export function getFileIcon(extension) {
  const iconMap = {
    '.gcode': '⚙️',
    '.nc': '🔧',
    '.ngc': '🔧', 
    '.cnc': '⚙️',
    '.tap': '🔩',
    '.g': '⚙️',
    '.prg': '📋',
    '.txt': '📄',
    '.min': '📐',
    '.eia': '🔧',
    '.fan': '💨',
    '.fgc': '⚙️',
    '.gc': '⚙️',
    '.ncc': '🔧',
    '.din': '📏',
    '.hnc': '🔧'
  };
  return iconMap[extension] || '📄';
}

/**
 * Check if file extension is supported G-code format
 * @param {string} extension - File extension to check
 * @returns {boolean} Whether extension is supported
 */
export function isSupportedGcodeFile(extension) {
  const supportedExtensions = [
    '.gcode', '.nc', '.ngc', '.cnc', '.tap', '.g', '.prg', 
    '.txt', '.min', '.eia', '.fan', '.fgc', '.gc', '.ncc', 
    '.din', '.hnc'
  ];
  return supportedExtensions.includes(extension.toLowerCase());
}

/**
 * Analyze G-code file content to extract statistics
 * @param {string} content - File content
 * @returns {Object} File analysis statistics
 */
export function analyzeGcodeFile(content) {
  const lines = content.split('\n');
  const totalLines = lines.length;
  
  // Count actual G-code lines (not comments or empty)
  const codeLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith(';') && !trimmed.startsWith('(');
  }).length;
  
  // Estimate execution time (very rough approximation)
  // Based on typical feed rates and movement commands
  const movementLines = lines.filter(line => 
    line.trim().match(/^G[01]/i)
  ).length;
  
  const estimatedTime = Math.ceil(movementLines * 2); // 2 seconds per movement line (rough)
  
  return {
    totalLines,
    codeLines,
    estimatedTime,
    size: content.length,
    hasMovements: movementLines > 0,
    hasSpindleCommands: content.includes('M3') || content.includes('M4'),
    hasCoolantCommands: content.includes('M7') || content.includes('M8')
  };
}

/**
 * Extract file metadata from file object
 * @param {Object} file - File system object
 * @returns {Object} Enhanced file metadata
 */
export function extractFileMetadata(file) {
  return {
    ...file,
    isGcodeFile: isSupportedGcodeFile(file.extension || ''),
    icon: getFileIcon(file.extension || ''),
    formattedSize: formatFileSize(file.size || 0),
    formattedModified: file.modified ? new Date(file.modified).toLocaleDateString() : 'Unknown'
  };
}

/**
 * Sort files for optimal display
 * @param {Array} files - Array of file objects
 * @returns {Array} Sorted file array
 */
export function sortFilesForDisplay(files) {
  return files.sort((a, b) => {
    // Directories first
    if (a.type !== b.type) {
      if (a.type === 'directory') return -1;
      if (b.type === 'directory') return 1;
    }
    
    // Parent directory always first among directories
    if (a.type === 'directory' && b.type === 'directory') {
      if (a.isParent) return -1;
      if (b.isParent) return 1;
    }
    
    // Alphabetical for same types
    return a.name.localeCompare(b.name);
  });
}

/**
 * Validate file for G-code execution
 * @param {Object} file - File object to validate
 * @returns {Object} Validation result
 */
export function validateGcodeFileForExecution(file) {
  const validation = {
    isValid: true,
    warnings: [],
    errors: []
  };
  
  if (!file) {
    validation.isValid = false;
    validation.errors.push('No file selected');
    return validation;
  }
  
  if (file.type !== 'file') {
    validation.isValid = false;
    validation.errors.push('Selected item is not a file');
    return validation;
  }
  
  if (!isSupportedGcodeFile(file.extension || '')) {
    validation.warnings.push('File extension not recognized as G-code format');
  }
  
  if ((file.size || 0) > 10 * 1024 * 1024) { // 10MB
    validation.warnings.push('Large file size may take time to process');
  }
  
  if ((file.size || 0) === 0) {
    validation.isValid = false;
    validation.errors.push('File appears to be empty');
  }
  
  return validation;
}

/**
 * File Browser Service object
 */
export const FileBrowserService = {
  formatFileSize,
  formatTime,
  getFileIcon,
  isSupportedGcodeFile,
  analyzeGcodeFile,
  extractFileMetadata,
  sortFilesForDisplay,
  validateGcodeFileForExecution
};

// Default export
export default FileBrowserService;