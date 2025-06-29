/**
 * CNC Configuration Management Module
 * 
 * Provides comprehensive configuration management for CNC machines using component-based architecture.
 * This module exports all configuration management components and utilities.
 */

import { ConfigurationManager } from './ConfigurationManager.js';
import { ConfigurationStorage } from './ConfigurationStorage.js';
import { BackupManager } from './BackupManager.js';
import { GrblSettingsManager } from './GrblSettingsManager.js';
import { ConfigurationValidator } from './ConfigurationValidator.js';

// Main configuration manager (orchestrates all components)
export { ConfigurationManager };

// Individual component managers
export { ConfigurationStorage };
export { BackupManager };
export { GrblSettingsManager };
export { ConfigurationValidator };

// Convenience factory function
export function createConfigurationManager(commandManager, config = {}) {
  return new ConfigurationManager(commandManager, config);
}

// Default export is the main configuration manager
export default ConfigurationManager;