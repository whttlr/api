import { Config } from '../../cnc/config.js';
import { log, info, warn, error } from '../logger/index.js';
import { readFile } from 'fs/promises';
import { resolve, extname } from 'path';

// Load configuration
const CONFIG = Config.get();

/**
 * Service for managing and executing G-code presets
 */
class PresetsService {
  constructor() {
    this.presets = CONFIG.presets || {};
  }

  /**
   * Get all available preset names
   */
  getAvailablePresets() {
    return Object.keys(this.presets);
  }

  /**
   * Check if a preset exists
   */
  hasPreset(name) {
    return name in this.presets;
  }

  /**
   * Get preset definition (raw value from config)
   */
  getPreset(name) {
    if (!this.hasPreset(name)) {
      throw new Error(`Preset '${name}' not found. Available presets: ${this.getAvailablePresets().join(', ')}`);
    }
    return this.presets[name];
  }

  /**
   * Load and parse a preset into executable commands
   * Handles strings, arrays, and file paths
   */
  async loadPreset(name) {
    const preset = this.getPreset(name);
    
    if (typeof preset === 'string') {
      // Check if it's a file path
      if (this.isFilePath(preset)) {
        return await this.loadPresetFromFile(preset);
      }
      // Single G-code command
      return [preset];
    }
    
    if (Array.isArray(preset)) {
      // Array of commands
      const commands = [];
      for (const command of preset) {
        if (this.isFilePath(command)) {
          const fileCommands = await this.loadPresetFromFile(command);
          commands.push(...fileCommands);
        } else {
          commands.push(command);
        }
      }
      return commands;
    }
    
    throw new Error(`Invalid preset format for '${name}'. Must be string, array, or file path.`);
  }

  /**
   * Execute a preset by name
   */
  async executePreset(name, sendGcode) {
    if (!sendGcode) {
      throw new Error('sendGcode function is required to execute presets');
    }

    info(`Executing preset: ${name}`);
    
    try {
      const commands = await this.loadPreset(name);
      const results = [];

      for (let i = 0; i < commands.length; i++) {
        const command = commands[i].trim();
        if (!command || command.startsWith(';') || command.startsWith('(')) {
          // Skip empty lines and comments
          continue;
        }

        log(`  [${i + 1}/${commands.length}] ${command}`);
        
        try {
          const result = await sendGcode(command);
          results.push({
            command,
            success: true,
            response: result.response
          });
          log(`    ✅ ${result.response}`);
        } catch (commandError) {
          error(`    ❌ ${commandError.message}`);
          results.push({
            command,
            success: false,
            error: commandError.message
          });
          
          // Continue with remaining commands unless it's a critical error
          if (this.isCriticalError(commandError)) {
            warn('Critical error detected, stopping preset execution');
            break;
          }
        }
      }

      const successful = results.filter(r => r.success).length;
      info(`Preset '${name}' completed: ${successful}/${results.length} commands successful`);
      
      return {
        preset: name,
        commands: results,
        totalCommands: results.length,
        successfulCommands: successful,
        success: successful === results.length
      };

    } catch (loadError) {
      error(`Failed to load preset '${name}': ${loadError.message}`);
      throw loadError;
    }
  }

  /**
   * Validate all presets in configuration
   */
  async validateAllPresets() {
    const validationResults = [];
    
    for (const [name, preset] of Object.entries(this.presets)) {
      const result = await this.validatePreset(name, preset);
      validationResults.push(result);
    }
    
    return validationResults;
  }

  /**
   * Validate a single preset
   */
  async validatePreset(name, preset) {
    const result = {
      name,
      valid: true,
      issues: [],
      commands: []
    };

    try {
      const commands = await this.loadPreset(name);
      result.commands = commands;
      
      // Validate each command
      for (const command of commands) {
        if (!this.isValidGcodeCommand(command)) {
          result.issues.push(`Invalid G-code command: ${command}`);
          result.valid = false;
        }
      }
      
    } catch (error) {
      result.valid = false;
      result.issues.push(`Failed to load preset: ${error.message}`);
    }

    return result;
  }

  /**
   * Check if a string looks like a file path
   */
  isFilePath(str) {
    return str.includes('/') || str.includes('\\') || 
           CONFIG.validation.gcodeFileExtensions.some(ext => str.endsWith(ext));
  }

  /**
   * Load commands from a G-code file
   */
  async loadPresetFromFile(filePath) {
    try {
      const resolvedPath = resolve(filePath);
      log(`Loading preset from file: ${resolvedPath}`);
      
      const content = await readFile(resolvedPath, 'utf8');
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith(';') && !line.startsWith('('));
      
      info(`Loaded ${lines.length} commands from ${filePath}`);
      return lines;
      
    } catch (fileError) {
      throw new Error(`Failed to load preset file '${filePath}': ${fileError.message}`);
    }
  }

  /**
   * Check if a command is valid G-code
   */
  isValidGcodeCommand(command) {
    if (!command || typeof command !== 'string') {
      return false;
    }
    
    const trimmed = command.trim();
    if (!trimmed) {
      return false;
    }
    
    // Allow GRBL commands ($), G-codes, M-codes, and coordinates
    return /^[$GMT]\d+|^[XYZ][-\d.]+|^F\d+|^S\d+/i.test(trimmed) ||
           CONFIG.validation.gcodeCommandRegex && new RegExp(CONFIG.validation.gcodeCommandRegex).test(trimmed);
  }

  /**
   * Check if an error should stop preset execution
   */
  isCriticalError(error) {
    const criticalMessages = [
      'alarm',
      'emergency',
      'limit',
      'disconnect',
      'timeout'
    ];
    
    const message = error.message.toLowerCase();
    return criticalMessages.some(critical => message.includes(critical));
  }

  /**
   * Generate a report of all available presets
   */
  generatePresetsReport() {
    log('\n============================================');
    log('           🎯 AVAILABLE PRESETS 🎯');
    log('============================================\n');

    if (Object.keys(this.presets).length === 0) {
      log('No presets configured.');
      log('============================================\n');
      return;
    }

    for (const [name, preset] of Object.entries(this.presets)) {
      log(`📋 ${name}:`);
      
      if (typeof preset === 'string') {
        if (this.isFilePath(preset)) {
          log(`   📄 File: ${preset}`);
        } else {
          log(`   📝 Command: ${preset}`);
        }
      } else if (Array.isArray(preset)) {
        log(`   📝 Commands (${preset.length}):`);
        preset.forEach((cmd, i) => {
          if (this.isFilePath(cmd)) {
            log(`     ${i + 1}. 📄 File: ${cmd}`);
          } else {
            log(`     ${i + 1}. ${cmd}`);
          }
        });
      }
      log('');
    }

    log('============================================');
    log('Use: preset <name> to execute a preset');
    log('============================================\n');
  }
}

// Export singleton instance
const presetsService = new PresetsService();

export {
  presetsService,
  PresetsService
};