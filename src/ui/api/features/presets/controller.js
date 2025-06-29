/**
 * Preset Controller
 * 
 * Handles preset management operations using the existing PresetsService
 */

import { info, error as logError } from '../../../../lib/logger/LoggerService.js';
import { asyncHandler, throwError } from '../../shared/middleware/errorHandler.js';
import { ErrorCodes } from '../../shared/responseFormatter.js';
import { getSharedGcodeSender } from '../../../../lib/shared/InstanceManager.js';
import { presetsService } from '../../../../lib/presets/index.js';
import { Config } from '../../../../cnc/config.js';

// Load configuration
const CONFIG = Config.get();

/**
 * Get shared GcodeSender instance
 */
function getGcodeSender() {
  return getSharedGcodeSender();
}

/**
 * Ensure machine is connected before operations that require it
 */
function ensureConnected(sender) {
  const status = sender.getStatus();
  if (!status.isConnected) {
    throwError(
      ErrorCodes.NOT_CONNECTED,
      'Machine must be connected before executing presets',
      { currentStatus: status },
      400
    );
  }
  return status;
}

/**
 * Get all available presets
 */
export const listPresets = asyncHandler(async (req, res) => {
  info('API: Listing available presets');
  
  try {
    const presetNames = presetsService.getAvailablePresets();
    const presets = [];
    
    for (const name of presetNames) {
      try {
        const presetDef = presetsService.getPreset(name);
        const validation = await presetsService.validatePreset(name, presetDef);
        
        presets.push({
          name,
          type: getPresetType(presetDef),
          valid: validation.valid,
          issues: validation.issues,
          commandCount: validation.commands.length,
          preview: validation.commands.slice(0, 3), // First 3 commands as preview
          description: getPresetDescription(presetDef)
        });
      } catch (error) {
        presets.push({
          name,
          type: 'unknown',
          valid: false,
          issues: [error.message],
          commandCount: 0,
          preview: [],
          description: 'Error loading preset'
        });
      }
    }
    
    res.success({
      presets,
      count: presets.length,
      valid: presets.filter(p => p.valid).length,
      invalid: presets.filter(p => !p.valid).length
    }, `Found ${presets.length} presets`);
    
  } catch (error) {
    logError('API: Failed to list presets:', error.message);
    throwError(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to list presets',
      { error: error.message },
      500
    );
  }
});

/**
 * Get specific preset information
 */
export const getPresetInfo = asyncHandler(async (req, res) => {
  const { presetName } = req.params;
  info(`API: Getting preset info for: ${presetName}`);
  
  try {
    if (!presetsService.hasPreset(presetName)) {
      throwError(
        ErrorCodes.PRESET_NOT_FOUND,
        'Preset not found',
        { 
          presetName, 
          available: presetsService.getAvailablePresets() 
        },
        404
      );
    }
    
    const presetDef = presetsService.getPreset(presetName);
    const validation = await presetsService.validatePreset(presetName, presetDef);
    
    const presetInfo = {
      name: presetName,
      type: getPresetType(presetDef),
      definition: presetDef,
      validation: {
        valid: validation.valid,
        issues: validation.issues,
        commandCount: validation.commands.length
      },
      commands: validation.commands,
      description: getPresetDescription(presetDef),
      estimatedDuration: estimatePresetDuration(validation.commands)
    };
    
    res.success(presetInfo, 'Preset information retrieved successfully');
    
  } catch (error) {
    if (error.message.includes('not found')) {
      throwError(
        ErrorCodes.PRESET_NOT_FOUND,
        'Preset not found',
        { 
          presetName, 
          available: presetsService.getAvailablePresets() 
        },
        404
      );
    } else {
      logError('API: Failed to get preset info:', error.message);
      throwError(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to retrieve preset information',
        { presetName, error: error.message },
        500
      );
    }
  }
});

/**
 * Create new preset
 */
export const createPreset = asyncHandler(async (req, res) => {
  const { name, commands, description, type = 'commands' } = req.body;
  
  info(`API: Creating new preset: ${name}`);
  
  if (!name || !commands) {
    throwError(
      ErrorCodes.INVALID_INPUT,
      'Preset name and commands are required',
      { provided: { name: !!name, commands: !!commands } },
      400
    );
  }
  
  try {
    // Check if preset already exists
    if (presetsService.hasPreset(name)) {
      throwError(
        ErrorCodes.PRESET_ALREADY_EXISTS,
        'Preset already exists',
        { presetName: name },
        409
      );
    }
    
    // Validate preset format
    let presetDefinition;
    if (type === 'file' && typeof commands === 'string') {
      // Single file path
      presetDefinition = commands;
    } else if (Array.isArray(commands)) {
      // Array of commands or file paths
      presetDefinition = commands;
    } else if (typeof commands === 'string') {
      // Single command
      presetDefinition = commands;
    } else {
      throwError(
        ErrorCodes.INVALID_INPUT,
        'Invalid preset format. Commands must be string or array',
        { type: typeof commands },
        400
      );
    }
    
    // Add to configuration (this would need to be persisted in a real implementation)
    CONFIG.presets = CONFIG.presets || {};
    CONFIG.presets[name] = presetDefinition;
    
    // Update presets service
    presetsService.presets[name] = presetDefinition;
    
    // Validate the new preset
    const validation = await presetsService.validatePreset(name, presetDefinition);
    
    const createResult = {
      name,
      type: getPresetType(presetDefinition),
      definition: presetDefinition,
      description: description || null,
      validation: {
        valid: validation.valid,
        issues: validation.issues,
        commandCount: validation.commands.length
      },
      commands: validation.commands,
      created: new Date().toISOString()
    };
    
    res.success(createResult, 'Preset created successfully');
    
  } catch (error) {
    logError('API: Failed to create preset:', error.message);
    throwError(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to create preset',
      { presetName: name, error: error.message },
      500
    );
  }
});

/**
 * Update existing preset
 */
export const updatePreset = asyncHandler(async (req, res) => {
  const { presetName } = req.params;
  const { commands, description, type } = req.body;
  
  info(`API: Updating preset: ${presetName}`);
  
  try {
    if (!presetsService.hasPreset(presetName)) {
      throwError(
        ErrorCodes.PRESET_NOT_FOUND,
        'Preset not found',
        { presetName, available: presetsService.getAvailablePresets() },
        404
      );
    }
    
    if (!commands) {
      throwError(
        ErrorCodes.INVALID_INPUT,
        'Commands are required for preset update',
        null,
        400
      );
    }
    
    // Create backup of old preset
    const oldPreset = presetsService.getPreset(presetName);
    
    // Validate new preset format
    let presetDefinition;
    if (type === 'file' && typeof commands === 'string') {
      presetDefinition = commands;
    } else if (Array.isArray(commands)) {
      presetDefinition = commands;
    } else if (typeof commands === 'string') {
      presetDefinition = commands;
    } else {
      throwError(
        ErrorCodes.INVALID_INPUT,
        'Invalid preset format. Commands must be string or array',
        { type: typeof commands },
        400
      );
    }
    
    // Update configuration
    CONFIG.presets[presetName] = presetDefinition;
    presetsService.presets[presetName] = presetDefinition;
    
    // Validate the updated preset
    const validation = await presetsService.validatePreset(presetName, presetDefinition);
    
    const updateResult = {
      name: presetName,
      type: getPresetType(presetDefinition),
      definition: presetDefinition,
      description: description || null,
      validation: {
        valid: validation.valid,
        issues: validation.issues,
        commandCount: validation.commands.length
      },
      commands: validation.commands,
      backup: oldPreset,
      modified: new Date().toISOString()
    };
    
    res.success(updateResult, 'Preset updated successfully');
    
  } catch (error) {
    logError('API: Failed to update preset:', error.message);
    throwError(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to update preset',
      { presetName, error: error.message },
      500
    );
  }
});

/**
 * Delete preset
 */
export const deletePreset = asyncHandler(async (req, res) => {
  const { presetName } = req.params;
  const { backup = true } = req.query;
  
  info(`API: Deleting preset: ${presetName}`);
  
  try {
    if (!presetsService.hasPreset(presetName)) {
      throwError(
        ErrorCodes.PRESET_NOT_FOUND,
        'Preset not found',
        { presetName, available: presetsService.getAvailablePresets() },
        404
      );
    }
    
    // Get preset definition for backup
    const presetDef = presetsService.getPreset(presetName);
    
    // Remove from configuration and service
    delete CONFIG.presets[presetName];
    delete presetsService.presets[presetName];
    
    const deleteResult = {
      name: presetName,
      deleted: true,
      backup: backup === 'true' ? presetDef : null,
      deletedAt: new Date().toISOString()
    };
    
    res.success(deleteResult, 'Preset deleted successfully');
    
  } catch (error) {
    logError('API: Failed to delete preset:', error.message);
    throwError(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to delete preset',
      { presetName, error: error.message },
      500
    );
  }
});

/**
 * Execute preset
 */
export const executePreset = asyncHandler(async (req, res) => {
  const { presetName } = req.params;
  info(`API: Executing preset: ${presetName}`);
  
  const sender = getGcodeSender();
  ensureConnected(sender);
  
  try {
    if (!presetsService.hasPreset(presetName)) {
      throwError(
        ErrorCodes.PRESET_NOT_FOUND,
        'Preset not found',
        { presetName, available: presetsService.getAvailablePresets() },
        404
      );
    }
    
    // Execute preset using the existing service
    const startTime = Date.now();
    const result = await presetsService.executePreset(presetName, (command) => {
      return sender.sendGcode(command);
    });
    const duration = Date.now() - startTime;
    
    info(`API: Preset '${presetName}' execution completed: ${result.successfulCommands}/${result.totalCommands} commands successful`);
    
    const executionResult = {
      preset: presetName,
      execution: {
        success: result.success,
        totalCommands: result.totalCommands,
        successful: result.successfulCommands,
        failed: result.totalCommands - result.successfulCommands,
        duration_ms: duration,
        completed_at: new Date().toISOString()
      },
      results: result.commands.map(cmd => ({
        command: cmd.command,
        success: cmd.success,
        response: cmd.response || null,
        error: cmd.error || null
      })),
      summary: {
        success_rate: ((result.successfulCommands / result.totalCommands) * 100).toFixed(1) + '%',
        average_command_time: Math.round(duration / result.totalCommands) + 'ms'
      }
    };
    
    res.success(executionResult, `Preset execution completed: ${result.successfulCommands}/${result.totalCommands} commands successful`);
    
  } catch (error) {
    logError('API: Failed to execute preset:', error.message);
    throwError(
      ErrorCodes.EXECUTION_FAILED,
      'Failed to execute preset',
      { presetName, error: error.message },
      500
    );
  }
});

/**
 * Validate preset without executing
 */
export const validatePreset = asyncHandler(async (req, res) => {
  const { presetName } = req.params;
  info(`API: Validating preset: ${presetName}`);
  
  try {
    if (!presetsService.hasPreset(presetName)) {
      throwError(
        ErrorCodes.PRESET_NOT_FOUND,
        'Preset not found',
        { presetName, available: presetsService.getAvailablePresets() },
        404
      );
    }
    
    const presetDef = presetsService.getPreset(presetName);
    const validation = await presetsService.validatePreset(presetName, presetDef);
    
    const validationResult = {
      name: presetName,
      type: getPresetType(presetDef),
      validation: {
        valid: validation.valid,
        issues: validation.issues,
        commandCount: validation.commands.length
      },
      commands: validation.commands,
      estimatedDuration: estimatePresetDuration(validation.commands),
      timestamp: new Date().toISOString()
    };
    
    res.success(validationResult, `Preset validation completed: ${validation.valid ? 'VALID' : 'INVALID'}`);
    
  } catch (error) {
    logError('API: Failed to validate preset:', error.message);
    throwError(
      ErrorCodes.INTERNAL_ERROR,
      'Failed to validate preset',
      { presetName, error: error.message },
      500
    );
  }
});

/**
 * Utility Functions
 */

function getPresetType(presetDef) {
  if (typeof presetDef === 'string') {
    return presetsService.isFilePath(presetDef) ? 'file' : 'command';
  } else if (Array.isArray(presetDef)) {
    const hasFiles = presetDef.some(cmd => presetsService.isFilePath(cmd));
    return hasFiles ? 'mixed' : 'commands';
  }
  return 'unknown';
}

function getPresetDescription(presetDef) {
  const type = getPresetType(presetDef);
  
  switch (type) {
    case 'file':
      return `G-code file: ${presetDef}`;
    case 'command':
      return `Single command: ${presetDef}`;
    case 'commands':
      return `${presetDef.length} G-code commands`;
    case 'mixed':
      const files = presetDef.filter(cmd => presetsService.isFilePath(cmd)).length;
      const commands = presetDef.length - files;
      return `${commands} commands + ${files} files`;
    default:
      return 'Unknown preset type';
  }
}

function estimatePresetDuration(commands) {
  // Simple estimation based on command count and types
  let estimatedSeconds = 0;
  
  for (const command of commands) {
    const cmd = command.trim().toUpperCase();
    
    if (cmd.startsWith('G0') || cmd.startsWith('G00')) {
      estimatedSeconds += 0.5; // Rapid positioning
    } else if (cmd.startsWith('G1') || cmd.startsWith('G01')) {
      estimatedSeconds += 2; // Linear interpolation
    } else if (cmd.startsWith('G2') || cmd.startsWith('G3')) {
      estimatedSeconds += 3; // Circular interpolation
    } else if (cmd.startsWith('M')) {
      estimatedSeconds += 0.2; // Machine commands
    } else {
      estimatedSeconds += 0.1; // Other commands
    }
  }
  
  return {
    seconds: Math.round(estimatedSeconds),
    formatted: formatDuration(estimatedSeconds)
  };
}

function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.round(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}h ${mins}m ${secs}s`;
  } else if (mins > 0) {
    return `${mins}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}