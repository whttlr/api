/**
 * Mock Configuration Storage
 * 
 * Provides a mock implementation of ConfigurationStorage for testing
 * configuration management without real file system dependencies.
 */

export class MockConfigurationStorage {
  constructor() {
    this.mockConfigs = new Map();
    this.mockPresets = new Map();
    this.mockBackups = new Map();
    this.mockErrors = new Map();
    this.savedConfig = null;
    this.loadDelay = 0;
    this.saveDelay = 0;
    
    // Default configuration
    this.defaultConfig = {
      machine: {
        name: 'Default CNC',
        type: 'mill',
        limits: { x: 200, y: 200, z: 100 }
      },
      connection: {
        port: '/dev/ttyUSB0',
        baudRate: 115200,
        timeout: 5000
      },
      ui: {
        theme: 'light',
        units: 'mm',
        precision: 3
      }
    };
  }

  /**
   * Set mock configuration
   */
  setMockConfig(config) {
    this.mockConfigs.set('main', config);
  }

  /**
   * Set mock error for an operation
   */
  setMockError(operation, error) {
    this.mockErrors.set(operation, error);
  }

  /**
   * Set delay for operations
   */
  setLoadDelay(delay) {
    this.loadDelay = delay;
  }

  setSaveDelay(delay) {
    this.saveDelay = delay;
  }

  /**
   * Load configuration (mocked)
   */
  async loadConfiguration(configName = 'main') {
    if (this.loadDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.loadDelay));
    }

    if (this.mockErrors.has('load')) {
      throw this.mockErrors.get('load');
    }

    const config = this.mockConfigs.get(configName);
    if (config) {
      return { ...config };
    }

    // Return default configuration if no mock is set
    return { ...this.defaultConfig };
  }

  /**
   * Save configuration (mocked)
   */
  async saveConfiguration(config, configName = 'main') {
    if (this.saveDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.saveDelay));
    }

    if (this.mockErrors.has('save')) {
      throw this.mockErrors.get('save');
    }

    this.savedConfig = { ...config };
    this.mockConfigs.set(configName, { ...config });

    return {
      success: true,
      configName,
      timestamp: Date.now()
    };
  }

  /**
   * Get saved configuration
   */
  getSavedConfig() {
    return this.savedConfig ? { ...this.savedConfig } : null;
  }

  /**
   * Check if configuration exists
   */
  async configExists(configName = 'main') {
    return this.mockConfigs.has(configName);
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(configName) {
    if (this.mockErrors.has('delete')) {
      throw this.mockErrors.get('delete');
    }

    return this.mockConfigs.delete(configName);
  }

  /**
   * List available configurations
   */
  async listConfigurations() {
    return Array.from(this.mockConfigs.keys()).map(name => ({
      name,
      lastModified: Date.now() - Math.random() * 86400000, // Random time in last day
      size: JSON.stringify(this.mockConfigs.get(name)).length
    }));
  }

  /**
   * Save configuration backup
   */
  async saveBackup(config, backupId, metadata = {}) {
    if (this.mockErrors.has('backup')) {
      throw this.mockErrors.get('backup');
    }

    const backup = {
      id: backupId,
      config: { ...config },
      metadata: { ...metadata },
      timestamp: Date.now()
    };

    this.mockBackups.set(backupId, backup);
    return backup;
  }

  /**
   * Load configuration backup
   */
  async loadBackup(backupId) {
    if (this.mockErrors.has('loadBackup')) {
      throw this.mockErrors.get('loadBackup');
    }

    const backup = this.mockBackups.get(backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    return { ...backup };
  }

  /**
   * List available backups
   */
  async listBackups() {
    return Array.from(this.mockBackups.values()).map(backup => ({
      id: backup.id,
      timestamp: backup.timestamp,
      metadata: backup.metadata
    }));
  }

  /**
   * Delete backup
   */
  async deleteBackup(backupId) {
    return this.mockBackups.delete(backupId);
  }

  /**
   * Save configuration preset
   */
  async savePreset(presetName, config, metadata = {}) {
    if (this.mockErrors.has('savePreset')) {
      throw this.mockErrors.get('savePreset');
    }

    const preset = {
      name: presetName,
      config: { ...config },
      metadata: {
        ...metadata,
        createdAt: Date.now()
      }
    };

    this.mockPresets.set(presetName, preset);
    return preset;
  }

  /**
   * Load configuration preset
   */
  async loadPreset(presetName) {
    if (this.mockErrors.has('loadPreset')) {
      throw this.mockErrors.get('loadPreset');
    }

    const preset = this.mockPresets.get(presetName);
    if (!preset) {
      throw new Error(`Preset not found: ${presetName}`);
    }

    return { ...preset };
  }

  /**
   * Set mock preset for testing
   */
  setMockPreset(presetName, config, metadata = {}) {
    const preset = {
      name: presetName,
      config: { ...config },
      metadata: {
        ...metadata,
        createdAt: Date.now()
      }
    };

    this.mockPresets.set(presetName, preset);
  }

  /**
   * Get mock preset for testing
   */
  getMockPreset(presetName) {
    return this.mockPresets.get(presetName);
  }

  /**
   * List available presets
   */
  async listPresets() {
    return Array.from(this.mockPresets.values()).map(preset => ({
      name: preset.name,
      metadata: preset.metadata
    }));
  }

  /**
   * Delete preset
   */
  async deletePreset(presetName) {
    return this.mockPresets.delete(presetName);
  }

  /**
   * Export configuration data
   */
  async exportConfiguration(configName = 'main') {
    const config = this.mockConfigs.get(configName) || this.defaultConfig;
    
    return {
      config: { ...config },
      metadata: {
        exported: Date.now(),
        configName,
        version: '1.0'
      }
    };
  }

  /**
   * Import configuration data
   */
  async importConfiguration(importData, configName = 'main') {
    if (this.mockErrors.has('import')) {
      throw this.mockErrors.get('import');
    }

    if (!importData.config) {
      throw new Error('Invalid import data: missing config');
    }

    this.mockConfigs.set(configName, { ...importData.config });
    
    return {
      success: true,
      configName,
      imported: Date.now()
    };
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    return {
      configurations: this.mockConfigs.size,
      presets: this.mockPresets.size,
      backups: this.mockBackups.size,
      totalSize: this.calculateTotalSize()
    };
  }

  /**
   * Calculate total storage size
   */
  calculateTotalSize() {
    let totalSize = 0;
    
    for (const config of this.mockConfigs.values()) {
      totalSize += JSON.stringify(config).length;
    }
    
    for (const preset of this.mockPresets.values()) {
      totalSize += JSON.stringify(preset).length;
    }
    
    for (const backup of this.mockBackups.values()) {
      totalSize += JSON.stringify(backup).length;
    }
    
    return totalSize;
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoffTime = Date.now() - maxAge;
    const deletedBackups = [];
    
    for (const [backupId, backup] of this.mockBackups.entries()) {
      if (backup.timestamp < cutoffTime) {
        this.mockBackups.delete(backupId);
        deletedBackups.push(backupId);
      }
    }
    
    return deletedBackups;
  }

  /**
   * Validate storage integrity
   */
  async validateStorage() {
    const errors = [];
    
    // Check configurations
    for (const [name, config] of this.mockConfigs.entries()) {
      if (!config || typeof config !== 'object') {
        errors.push(`Invalid configuration: ${name}`);
      }
    }
    
    // Check presets
    for (const [name, preset] of this.mockPresets.entries()) {
      if (!preset.config || typeof preset.config !== 'object') {
        errors.push(`Invalid preset: ${name}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Reset mock state
   */
  reset() {
    this.mockConfigs.clear();
    this.mockPresets.clear();
    this.mockBackups.clear();
    this.mockErrors.clear();
    this.savedConfig = null;
    this.loadDelay = 0;
    this.saveDelay = 0;
  }

  /**
   * Clear mock errors
   */
  clearErrors() {
    this.mockErrors.clear();
  }

  /**
   * Get mock state for debugging
   */
  getMockState() {
    return {
      configs: Object.fromEntries(this.mockConfigs),
      presets: Object.fromEntries(this.mockPresets),
      backups: Object.fromEntries(this.mockBackups),
      savedConfig: this.savedConfig
    };
  }
}