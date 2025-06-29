/**
 * GRBL Settings Manager
 * 
 * Handles GRBL settings synchronization between software and hardware,
 * settings validation, and settings backup/restore operations.
 */

import { EventEmitter } from 'events';
import { debug, info, warn, error } from '../../lib/logger/LoggerService.js';

export class GrblSettingsManager extends EventEmitter {
  constructor(commandManager, config = {}) {
    super();
    
    if (!commandManager) {
      throw new Error('GrblSettingsManager requires a command manager');
    }
    
    this.commandManager = commandManager;
    this.config = {
      enableValidation: true,
      enableSync: true,
      syncTimeout: 5000,
      retryAttempts: 3,
      ...config
    };
    
    // Current GRBL settings and parameters
    this.settings = new Map();
    this.parameters = new Map();
    
    // Settings metadata and validation rules
    this.settingsMetadata = this.createSettingsMetadata();
    this.lastSyncTimestamp = null;
  }
  
  /**
   * Query all GRBL settings from hardware
   */
  async queryAllSettings() {
    try {
      debug('Querying all GRBL settings from hardware');
      
      // Query settings ($$ command)
      const settingsResponse = await this.commandManager.sendCommand('$$');
      this.parseSettingsResponse(settingsResponse);
      
      // Query parameters ($# command)
      const parametersResponse = await this.commandManager.sendCommand('$#');
      this.parseParametersResponse(parametersResponse);
      
      this.lastSyncTimestamp = Date.now();
      
      info('GRBL settings queried successfully', { 
        settings: this.settings.size, 
        parameters: this.parameters.size 
      });
      
      this.emit('settingsQueried', {
        settings: this.getSettingsAsObject(),
        parameters: this.getParametersAsObject()
      });
      
      return {
        settings: this.getSettingsAsObject(),
        parameters: this.getParametersAsObject()
      };
      
    } catch (err) {
      error('Failed to query GRBL settings', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Set a specific GRBL setting
   */
  async setSetting(settingNumber, value) {
    try {
      if (this.config.enableValidation && !this.validateSetting(settingNumber, value)) {
        throw new Error(`Invalid value for setting $${settingNumber}: ${value}`);
      }
      
      const command = `$${settingNumber}=${value}`;
      debug('Setting GRBL parameter', { setting: settingNumber, value, command });
      
      const response = await this.commandManager.sendCommand(command);
      
      // Update local cache
      this.settings.set(settingNumber, value);
      
      this.emit('settingChanged', {
        setting: settingNumber,
        value,
        response
      });
      
      info('GRBL setting updated', { setting: settingNumber, value });
      return response;
      
    } catch (err) {
      error('Failed to set GRBL setting', { 
        setting: settingNumber, 
        value, 
        error: err.message 
      });
      throw err;
    }
  }
  
  /**
   * Set multiple GRBL settings
   */
  async setMultipleSettings(settingsMap) {
    const results = [];
    const errors = [];
    
    for (const [setting, value] of Object.entries(settingsMap)) {
      try {
        const result = await this.setSetting(parseInt(setting), value);
        results.push({ setting: parseInt(setting), value, success: true, result });
      } catch (err) {
        errors.push({ setting: parseInt(setting), value, success: false, error: err.message });
      }
    }
    
    if (errors.length > 0) {
      warn('Some GRBL settings failed to update', { 
        successful: results.length, 
        failed: errors.length 
      });
    }
    
    this.emit('multipleSettingsChanged', { results, errors });
    
    return { results, errors };
  }
  
  /**
   * Reset GRBL settings to defaults
   */
  async resetToDefaults() {
    try {
      debug('Resetting GRBL settings to defaults');
      
      const response = await this.commandManager.sendCommand('$RST=$');
      
      // Re-query settings after reset
      await this.queryAllSettings();
      
      info('GRBL settings reset to defaults');
      this.emit('settingsReset');
      
      return response;
      
    } catch (err) {
      error('Failed to reset GRBL settings', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Backup current settings
   */
  createSettingsBackup() {
    return {
      settings: Object.fromEntries(this.settings.entries()),
      parameters: Object.fromEntries(this.parameters.entries()),
      timestamp: Date.now(),
      version: '1.0'
    };
  }
  
  /**
   * Restore settings from backup
   */
  async restoreSettingsBackup(backup) {
    try {
      if (!backup.settings) {
        throw new Error('Invalid backup format: missing settings');
      }
      
      const settingsToRestore = Object.entries(backup.settings);
      const results = await this.setMultipleSettings(backup.settings);
      
      info('GRBL settings restored from backup', { 
        settingsCount: settingsToRestore.length,
        successful: results.results.length,
        failed: results.errors.length
      });
      
      this.emit('settingsRestored', { backup, results });
      
      return results;
      
    } catch (err) {
      error('Failed to restore GRBL settings backup', { error: err.message });
      throw err;
    }
  }
  
  /**
   * Get setting value
   */
  getSetting(settingNumber) {
    return this.settings.get(settingNumber);
  }
  
  /**
   * Get parameter value
   */
  getParameter(parameterName) {
    return this.parameters.get(parameterName);
  }
  
  /**
   * Get all settings as object
   */
  getSettingsAsObject() {
    return Object.fromEntries(this.settings.entries());
  }
  
  /**
   * Get all parameters as object
   */
  getParametersAsObject() {
    return Object.fromEntries(this.parameters.entries());
  }
  
  /**
   * Parse settings response from $$
   */
  parseSettingsResponse(response) {
    if (!response || !response.data) {
      return;
    }
    
    const lines = Array.isArray(response.data) ? response.data : [response.data];
    
    for (const line of lines) {
      const match = line.match(/\\$(\\d+)=([\\d.-]+)/);
      if (match) {
        const settingNumber = parseInt(match[1]);
        const value = parseFloat(match[2]);
        this.settings.set(settingNumber, value);
        
        debug('Parsed GRBL setting', { setting: settingNumber, value });
      }
    }
  }
  
  /**
   * Parse parameters response from $#
   */
  parseParametersResponse(response) {
    if (!response || !response.data) {
      return;
    }
    
    const lines = Array.isArray(response.data) ? response.data : [response.data];
    
    for (const line of lines) {
      // Parse coordinate system offsets: [G54:0.000,0.000,0.000]
      const coordMatch = line.match(/\\[([^:]+):([\\d.-]+),([\\d.-]+),([\\d.-]+)\\]/);
      if (coordMatch) {
        const system = coordMatch[1];
        const coords = {
          x: parseFloat(coordMatch[2]),
          y: parseFloat(coordMatch[3]),
          z: parseFloat(coordMatch[4])
        };
        this.parameters.set(system, coords);
        
        debug('Parsed coordinate system', { system, coordinates: coords });
        continue;
      }
      
      // Parse tool length offset: [TLO:0.000]
      const tloMatch = line.match(/\\[TLO:([\\d.-]+)\\]/);
      if (tloMatch) {
        this.parameters.set('TLO', parseFloat(tloMatch[1]));
        continue;
      }
      
      // Parse probe result: [PRB:0.000,0.000,0.000:1]
      const probeMatch = line.match(/\\[PRB:([\\d.-]+),([\\d.-]+),([\\d.-]+):(\\d)\\]/);
      if (probeMatch) {
        this.parameters.set('PRB', {
          x: parseFloat(probeMatch[1]),
          y: parseFloat(probeMatch[2]),
          z: parseFloat(probeMatch[3]),
          success: parseInt(probeMatch[4]) === 1
        });
        continue;
      }
    }
  }
  
  /**
   * Validate setting value
   */
  validateSetting(settingNumber, value) {
    if (!this.config.enableValidation) {
      return true;
    }
    
    const metadata = this.settingsMetadata.get(settingNumber);
    if (!metadata) {
      warn('Unknown GRBL setting', { setting: settingNumber });
      return true; // Allow unknown settings
    }
    
    // Check data type
    if (metadata.type === 'integer' && !Number.isInteger(value)) {
      return false;
    }
    
    if (metadata.type === 'float' && typeof value !== 'number') {
      return false;
    }
    
    if (metadata.type === 'boolean' && value !== 0 && value !== 1) {
      return false;
    }
    
    // Check value range
    if (metadata.min !== undefined && value < metadata.min) {
      return false;
    }
    
    if (metadata.max !== undefined && value > metadata.max) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create settings metadata for validation
   */
  createSettingsMetadata() {
    const metadata = new Map();
    
    // Common GRBL settings with validation rules
    metadata.set(0, { name: 'Step pulse time', type: 'integer', min: 3, max: 10000, unit: 'microseconds' });
    metadata.set(1, { name: 'Step idle delay', type: 'integer', min: 0, max: 65535, unit: 'milliseconds' });
    metadata.set(2, { name: 'Step pulse invert', type: 'integer', min: 0, max: 255 });
    metadata.set(3, { name: 'Step direction invert', type: 'integer', min: 0, max: 255 });
    metadata.set(4, { name: 'Invert step enable pin', type: 'boolean' });
    metadata.set(5, { name: 'Invert limit pins', type: 'boolean' });
    metadata.set(6, { name: 'Invert probe pin', type: 'boolean' });
    metadata.set(10, { name: 'Status report options', type: 'integer', min: 0, max: 3 });
    metadata.set(11, { name: 'Junction deviation', type: 'float', min: 0, max: 2, unit: 'mm' });
    metadata.set(12, { name: 'Arc tolerance', type: 'float', min: 0, max: 2, unit: 'mm' });
    metadata.set(13, { name: 'Report in inches', type: 'boolean' });
    metadata.set(20, { name: 'Soft limits enable', type: 'boolean' });
    metadata.set(21, { name: 'Hard limits enable', type: 'boolean' });
    metadata.set(22, { name: 'Homing cycle enable', type: 'boolean' });
    metadata.set(23, { name: 'Homing direction invert', type: 'integer', min: 0, max: 255 });
    metadata.set(24, { name: 'Homing locate feed rate', type: 'float', min: 1, max: 5000, unit: 'mm/min' });
    metadata.set(25, { name: 'Homing search seek rate', type: 'float', min: 1, max: 5000, unit: 'mm/min' });
    metadata.set(26, { name: 'Homing switch debounce delay', type: 'integer', min: 0, max: 65535, unit: 'milliseconds' });
    metadata.set(27, { name: 'Homing switch pull-off distance', type: 'float', min: 0, max: 100, unit: 'mm' });
    metadata.set(30, { name: 'Maximum spindle speed', type: 'float', min: 1, max: 50000, unit: 'RPM' });
    metadata.set(31, { name: 'Minimum spindle speed', type: 'float', min: 0, max: 10000, unit: 'RPM' });
    metadata.set(32, { name: 'Laser-mode enable', type: 'boolean' });
    
    // Axis-specific settings (X, Y, Z)
    for (let axis = 0; axis < 3; axis++) {
      const axisName = ['X', 'Y', 'Z'][axis];
      metadata.set(100 + axis, { name: `${axisName} steps per unit`, type: 'float', min: 0.1, max: 10000, unit: 'steps/mm' });
      metadata.set(110 + axis, { name: `${axisName} maximum rate`, type: 'float', min: 1, max: 100000, unit: 'mm/min' });
      metadata.set(120 + axis, { name: `${axisName} acceleration`, type: 'float', min: 1, max: 50000, unit: 'mm/sec²' });
      metadata.set(130 + axis, { name: `${axisName} maximum travel`, type: 'float', min: 0, max: 1000, unit: 'mm' });
    }
    
    return metadata;
  }
  
  /**
   * Get settings metadata
   */
  getSettingsMetadata() {
    const metadata = {};
    this.settingsMetadata.forEach((value, key) => {
      metadata[key] = { ...value };
    });
    return metadata;
  }
  
  /**
   * Get settings with metadata
   */
  getSettingsWithMetadata() {
    const settingsWithMetadata = {};
    
    this.settings.forEach((value, settingNumber) => {
      const metadata = this.settingsMetadata.get(settingNumber);
      settingsWithMetadata[settingNumber] = {
        value,
        metadata: metadata || { name: 'Unknown setting', type: 'unknown' }
      };
    });
    
    return settingsWithMetadata;
  }
  
  /**
   * Export settings and parameters
   */
  exportData() {
    return {
      settings: this.getSettingsAsObject(),
      parameters: this.getParametersAsObject(),
      metadata: this.getSettingsMetadata(),
      lastSync: this.lastSyncTimestamp
    };
  }
  
  /**
   * Import settings and parameters
   */
  importData(data) {
    if (data.settings) {
      this.settings = new Map(Object.entries(data.settings).map(([k, v]) => [parseInt(k), v]));
    }
    
    if (data.parameters) {
      this.parameters = new Map(Object.entries(data.parameters));
    }
    
    if (data.lastSync) {
      this.lastSyncTimestamp = data.lastSync;
    }
    
    debug('GRBL settings data imported');
  }
}