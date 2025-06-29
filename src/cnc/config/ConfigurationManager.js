/**
 * Configuration Manager (Refactored)
 * 
 * Orchestrates machine configuration management using component-based architecture.
 * Delegates responsibilities to specialized components for storage, backup, GRBL settings, and validation.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';
import { ConfigurationStorage } from './ConfigurationStorage.js';
import { BackupManager } from './BackupManager.js';
import { GrblSettingsManager } from './GrblSettingsManager.js';
import { ConfigurationValidator } from './ConfigurationValidator.js';

export class ConfigurationManager extends EventEmitter {
  constructor(commandManager, config = {}) {
    super();
    
    if (!commandManager) {
      throw new Error('ConfigurationManager requires a command manager');
    }
    
    this.commandManager = commandManager;
    this.config = {
      configDirectory: './configs',
      backupDirectory: './backups',
      enableAutoBackup: true,
      enableValidation: true,
      enableSync: true,
      ...config
    };
    
    // Initialize component managers
    this.storage = new ConfigurationStorage(this.config);
    this.backupManager = new BackupManager(this.storage, this.config);
    this.grblManager = new GrblSettingsManager(commandManager, this.config);
    this.validator = new ConfigurationValidator(this.config);
    
    // Current configuration state
    this.configuration = this.createDefaultConfiguration();
    
    // Set up component event forwarding
    this.setupComponentEvents();
    
    this.initialize();
  }
  
  /**
   * Create default configuration structure
   */
  createDefaultConfiguration() {
    return {
      machine: {
        name: 'Unknown CNC',
        type: 'generic',
        version: '1.0',
        capabilities: [],
        limits: {
          x: { min: -200, max: 200 },
          y: { min: -200, max: 200 },
          z: { min: -100, max: 100 }
        },
        homing: {
          enabled: true,
          sequence: ['Z', 'XY'],
          speed: { seek: 1000, feed: 100 }
        },
        spindle: {
          enabled: true,
          maxSpeed: 24000,
          minSpeed: 0
        }
      },
      software: {
        version: '1.0.0',
        features: {
          streaming: true,
          monitoring: true,
          autoRecovery: true,
          retry: true
        },
        preferences: {
          units: 'mm',
          theme: 'default',
          logLevel: 'info'
        }
      },
      tools: new Map(),
      workCoordinates: new Map(),
      presets: new Map(),
      metadata: {
        created: Date.now(),
        lastModified: Date.now(),
        lastBackup: null,
        version: '1.0'
      }
    };
  }
  
  /**
   * Set up component event forwarding
   */
  setupComponentEvents() {
    // Forward GRBL settings events
    this.grblManager.on('settingsQueried', (data) => {
      this.emit('grblSettingsQueried', data);
    });
    
    this.grblManager.on('settingChanged', (data) => {
      this.emit('grblSettingChanged', data);
    });
    
    // Forward backup events
    this.backupManager.on('backupCreated', (data) => {
      this.configuration.metadata.lastBackup = Date.now();
      this.emit('backupCreated', data);
    });
    
    // Forward validation events
    this.validator.on('validationCompleted', (data) => {
      this.emit('configurationValidated', data);
    });
  }
  
  /**
   * Initialize configuration manager
   */
  async initialize() {
    try {
      // Ensure directories exist
      await this.storage.ensureDirectories();
      
      // Load existing configuration
      await this.loadConfiguration();
      
      // Start auto-backup if enabled
      if (this.config.enableAutoBackup) {
        this.backupManager.startAutoBackup();
      }
      
      debug('Configuration manager initialized');
      this.emit('initialized', { config: this.getConfiguration() });
      
    } catch (err) {
      error('Failed to initialize configuration manager', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Load configuration from storage
   */
  async loadConfiguration() {
    try {
      // Load machine configuration
      const machineConfig = await this.storage.loadMachineConfiguration();
      if (machineConfig) {
        this.configuration = { ...this.configuration, ...machineConfig };
      }
      
      // Load GRBL settings
      const grblData = await this.storage.loadGrblSettings();
      this.grblManager.importData(grblData);
      
      // Load presets
      const presets = await this.storage.loadPresets();
      this.configuration.presets = presets;
      
      this.configuration.metadata.lastModified = Date.now();
      
      info('Configuration loaded successfully');
      this.emit('configurationLoaded', { configuration: this.getConfiguration() });
      
    } catch (err) {
      warn('Failed to load configuration, using defaults', { error: err.message });
    }
  }
  
  /**
   * Save configuration to storage
   */
  async saveConfiguration() {
    try {
      // Validate configuration if enabled
      if (this.config.enableValidation) {
        const validation = this.validator.validateMachineConfiguration(this.configuration);
        if (!validation.isValid) {
          throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }
      }
      
      // Update metadata
      this.configuration.metadata.lastModified = Date.now();
      
      // Save machine configuration
      await this.storage.saveMachineConfiguration(this.configuration);
      
      // Save GRBL settings
      const grblData = this.grblManager.exportData();
      await this.storage.saveGrblSettings(grblData.settings, grblData.parameters);
      
      // Save presets
      for (const [name, preset] of this.configuration.presets.entries()) {
        await this.storage.savePreset(name, preset);
      }
      
      info('Configuration saved successfully');
      this.emit('configurationSaved', { configuration: this.getConfiguration() });
      
      return true;
      
    } catch (err) {
      error('Failed to save configuration', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Update machine configuration
   */
  async updateMachineConfiguration(updates) {
    try {
      this.configuration.machine = { ...this.configuration.machine, ...updates };
      this.configuration.metadata.lastModified = Date.now();
      
      await this.saveConfiguration();
      
      info('Machine configuration updated');
      this.emit('machineConfigurationUpdated', { updates, configuration: this.configuration.machine });
      
    } catch (err) {
      error('Failed to update machine configuration', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Sync configuration with hardware
   */
  async syncWithHardware() {
    try {
      if (!this.config.enableSync) {
        return { success: true, message: 'Hardware sync disabled' };
      }
      
      debug('Syncing configuration with hardware');
      
      // Query GRBL settings from hardware
      await this.grblManager.queryAllSettings();
      
      // Validate compatibility
      const grblData = this.grblManager.exportData();
      const compatibility = this.validator.validateGrblSettingsCompatibility(
        grblData.settings, 
        this.configuration.machine
      );
      
      if (!compatibility.isValid) {
        warn('Hardware configuration compatibility issues found', { 
          errors: compatibility.errors,
          warnings: compatibility.warnings 
        });
      }
      
      info('Hardware sync completed');
      this.emit('hardwareSynced', { compatibility, grblData });
      
      return {
        success: true,
        compatibility,
        grblSettings: grblData.settings,
        warnings: compatibility.warnings
      };
      
    } catch (err) {
      error('Hardware sync failed', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Create configuration backup
   */
  async createBackup(type = 'manual') {
    return await this.backupManager.createBackup(type);
  }
  
  /**
   * Restore configuration from backup
   */
  async restoreFromBackup(backupPath) {
    try {
      const restoredData = await this.backupManager.restoreBackup(backupPath);
      
      // Reload configuration after restore
      await this.loadConfiguration();
      
      info('Configuration restored from backup');
      this.emit('configurationRestored', { backupPath, data: restoredData });
      
      return restoredData;
      
    } catch (err) {
      error('Failed to restore from backup', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      ...this.configuration,
      grbl: this.grblManager.exportData()
    };
  }
  
  /**
   * Get configuration summary
   */
  getConfigurationSummary() {
    const validation = this.validator.getValidationSummary(this.configuration);
    const grblData = this.grblManager.exportData();
    
    return {
      machine: {
        name: this.configuration.machine.name,
        type: this.configuration.machine.type,
        version: this.configuration.machine.version
      },
      validation,
      grbl: {
        settingsCount: Object.keys(grblData.settings).length,
        parametersCount: Object.keys(grblData.parameters).length,
        lastSync: grblData.lastSync
      },
      metadata: this.configuration.metadata,
      presets: this.configuration.presets.size,
      tools: this.configuration.tools.size
    };
  }
  
  /**
   * Validate current configuration
   */
  validateConfiguration() {
    return this.validator.validateMachineConfiguration(this.configuration);
  }
  
  /**
   * Export configuration data
   */
  async exportConfiguration() {
    return await this.storage.exportAllConfigurations();
  }
  
  /**
   * Import configuration data
   */
  async importConfiguration(configData) {
    try {
      await this.storage.importAllConfigurations(configData);
      await this.loadConfiguration();
      
      info('Configuration imported successfully');
      this.emit('configurationImported', { data: configData });
      
    } catch (err) {
      error('Failed to import configuration', { error: err.message });
      throw err;
    }
  }
  
  /**
   * List available backups
   */
  async listBackups() {
    return await this.backupManager.listBackups();
  }
  
  /**
   * Get backup statistics
   */
  async getBackupStatistics() {
    return await this.backupManager.getBackupStatistics();
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    this.backupManager.cleanup();
    this.removeAllListeners();
    
    debug('Configuration manager cleaned up');
  }
}