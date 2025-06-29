/**
 * Configuration Storage Manager
 * 
 * Handles loading, saving, and file operations for machine configurations.
 * Manages the configuration directory structure and file I/O operations.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class ConfigurationStorage {
  constructor(config = {}) {
    this.config = {
      configDirectory: './configs',
      configFile: 'machine-config.json',
      settingsFile: 'grbl-settings.json',
      presetsDirectory: 'presets',
      enableVersioning: true,
      ...config
    };
  }
  
  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [
      this.config.configDirectory,
      join(this.config.configDirectory, this.config.presetsDirectory)
    ];
    
    for (const dir of dirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        debug('Directory ensured', { directory: dir });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          error('Failed to create directory', { directory: dir, error: err.message });
          throw err;
        }
      }
    }
  }
  
  /**
   * Load machine configuration
   */
  async loadMachineConfiguration() {
    try {
      const configPath = join(this.config.configDirectory, this.config.configFile);
      
      if (await this.fileExists(configPath)) {
        const configData = await fs.readFile(configPath, 'utf-8');
        const parsedConfig = JSON.parse(configData);
        
        debug('Machine configuration loaded', { path: configPath });
        return parsedConfig;
      }
      
      debug('No machine configuration file found, using defaults');
      return null;
      
    } catch (err) {
      warn('Failed to load machine configuration', { error: err.message });
      return null;
    }
  }
  
  /**
   * Save machine configuration
   */
  async saveMachineConfiguration(configuration) {
    try {
      const configPath = join(this.config.configDirectory, this.config.configFile);
      
      // Create versioned backup if enabled
      if (this.config.enableVersioning && await this.fileExists(configPath)) {
        await this.createVersionedBackup(configPath, 'machine-config');
      }
      
      const configData = JSON.stringify(configuration, null, 2);
      await fs.writeFile(configPath, configData);
      
      info('Machine configuration saved', { path: configPath });
      return true;
      
    } catch (err) {
      error('Failed to save machine configuration', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Load GRBL settings
   */
  async loadGrblSettings() {
    try {
      const settingsPath = join(this.config.configDirectory, this.config.settingsFile);
      
      if (await this.fileExists(settingsPath)) {
        const settingsData = await fs.readFile(settingsPath, 'utf-8');
        const parsedSettings = JSON.parse(settingsData);
        
        const result = {};
        if (parsedSettings.settings) {
          result.settings = new Map(parsedSettings.settings);
        }
        if (parsedSettings.parameters) {
          result.parameters = new Map(parsedSettings.parameters);
        }
        
        debug('GRBL settings loaded', { path: settingsPath });
        return result;
      }
      
      debug('No GRBL settings file found');
      return { settings: new Map(), parameters: new Map() };
      
    } catch (err) {
      warn('Failed to load GRBL settings', { error: err.message });
      return { settings: new Map(), parameters: new Map() };
    }
  }
  
  /**
   * Save GRBL settings
   */
  async saveGrblSettings(settings, parameters) {
    try {
      const settingsPath = join(this.config.configDirectory, this.config.settingsFile);
      
      // Create versioned backup if enabled
      if (this.config.enableVersioning && await this.fileExists(settingsPath)) {
        await this.createVersionedBackup(settingsPath, 'grbl-settings');
      }
      
      const settingsData = {
        settings: Array.from(settings.entries()),
        parameters: Array.from(parameters.entries()),
        savedAt: Date.now(),
        version: '1.0'
      };
      
      await fs.writeFile(settingsPath, JSON.stringify(settingsData, null, 2));
      
      info('GRBL settings saved', { path: settingsPath });
      return true;
      
    } catch (err) {
      error('Failed to save GRBL settings', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Load preset files
   */
  async loadPresets() {
    try {
      const presetsDir = join(this.config.configDirectory, this.config.presetsDirectory);
      const presets = new Map();
      
      if (await this.directoryExists(presetsDir)) {
        const files = await fs.readdir(presetsDir);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            try {
              const presetPath = join(presetsDir, file);
              const presetData = await fs.readFile(presetPath, 'utf-8');
              const preset = JSON.parse(presetData);
              
              const presetName = file.replace('.json', '');
              presets.set(presetName, preset);
              
            } catch (err) {
              warn('Failed to load preset', { file, error: err.message });
            }
          }
        }
      }
      
      debug('Presets loaded', { count: presets.size });
      return presets;
      
    } catch (err) {
      warn('Failed to load presets', { error: err.message });
      return new Map();
    }
  }
  
  /**
   * Save preset
   */
  async savePreset(name, preset) {
    try {
      const presetsDir = join(this.config.configDirectory, this.config.presetsDirectory);
      const presetPath = join(presetsDir, `${name}.json`);
      
      // Ensure presets directory exists
      await fs.mkdir(presetsDir, { recursive: true });
      
      const presetData = JSON.stringify(preset, null, 2);
      await fs.writeFile(presetPath, presetData);
      
      info('Preset saved', { name, path: presetPath });
      return true;
      
    } catch (err) {
      error('Failed to save preset', { name, error: err.message });
      throw err;
    }
  }
  
  /**
   * Delete preset
   */
  async deletePreset(name) {
    try {
      const presetsDir = join(this.config.configDirectory, this.config.presetsDirectory);
      const presetPath = join(presetsDir, `${name}.json`);
      
      if (await this.fileExists(presetPath)) {
        await fs.unlink(presetPath);
        info('Preset deleted', { name, path: presetPath });
        return true;
      }
      
      return false;
      
    } catch (err) {
      error('Failed to delete preset', { name, error: err.message });
      throw err;
    }
  }
  
  /**
   * Create versioned backup
   */
  async createVersionedBackup(filePath, prefix) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${prefix}-${timestamp}.json`;
      const backupPath = join(dirname(filePath), 'versions', backupName);
      
      // Ensure versions directory exists
      await fs.mkdir(dirname(backupPath), { recursive: true });
      
      await fs.copyFile(filePath, backupPath);
      debug('Versioned backup created', { source: filePath, backup: backupPath });
      
    } catch (err) {
      warn('Failed to create versioned backup', { error: err.message });
    }
  }
  
  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if directory exists
   */
  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }
  
  /**
   * Get configuration file paths
   */
  getConfigurationPaths() {
    return {
      configDirectory: this.config.configDirectory,
      machineConfig: join(this.config.configDirectory, this.config.configFile),
      grblSettings: join(this.config.configDirectory, this.config.settingsFile),
      presetsDirectory: join(this.config.configDirectory, this.config.presetsDirectory)
    };
  }
  
  /**
   * Export all configuration data
   */
  async exportAllConfigurations() {
    try {
      const machineConfig = await this.loadMachineConfiguration();
      const grblSettings = await this.loadGrblSettings();
      const presets = await this.loadPresets();
      
      return {
        machine: machineConfig,
        grbl: {
          settings: Array.from(grblSettings.settings.entries()),
          parameters: Array.from(grblSettings.parameters.entries())
        },
        presets: Object.fromEntries(presets.entries()),
        exportedAt: Date.now()
      };
      
    } catch (err) {
      error('Failed to export configurations', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Import all configuration data
   */
  async importAllConfigurations(configData) {
    try {
      // Import machine configuration
      if (configData.machine) {
        await this.saveMachineConfiguration(configData.machine);
      }
      
      // Import GRBL settings
      if (configData.grbl) {
        const settings = new Map(configData.grbl.settings || []);
        const parameters = new Map(configData.grbl.parameters || []);
        await this.saveGrblSettings(settings, parameters);
      }
      
      // Import presets
      if (configData.presets) {
        for (const [name, preset] of Object.entries(configData.presets)) {
          await this.savePreset(name, preset);
        }
      }
      
      info('All configurations imported successfully');
      return true;
      
    } catch (err) {
      error('Failed to import configurations', { error: err.message });
      throw err;
    }
  }
}