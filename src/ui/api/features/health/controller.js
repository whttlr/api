/**
 * Health Controller
 * 
 * Provides help information, command documentation, and system health information through the API
 */

import { info } from '../../../../lib/logger/LoggerService.js';
import { asyncHandler } from '../../shared/middleware/errorHandler.js';
import { Config } from '../../../../cnc/config.js';

// Load configuration
const CONFIG = Config.get();

/**
 * Get comprehensive API and CLI help information
 */
export const getHelp = asyncHandler(async (req, res) => {
  info('API: Getting help information');
  
  const helpInfo = {
    api: {
      name: 'CNC G-code Sender API',
      version: '1.0.0',
      description: 'REST API for CNC machine control and G-code execution',
      documentation: '/api/v1/docs',
      endpoints: {
        health: '/api/v1/health',
        info: '/api/v1/info',
        connection: '/api/v1/connection/*',
        machine: '/api/v1/machine/*',
        gcode: '/api/v1/gcode/*',
        files: '/api/v1/files/*',
        presets: '/api/v1/presets/*',
        help: '/api/v1/help',
        commands: '/api/v1/commands'
      }
    },
    cli: {
      description: 'Interactive CLI commands available through the CNC G-code Sender',
      commands: getCliCommands(),
      safetyTips: getSafetyTips(),
      configuration: {
        machineLimits: CONFIG.machineLimits,
        defaultPort: CONFIG.defaultPort,
        gcodeFileExtensions: CONFIG.validation?.gcodeFileExtensions || ['.gcode', '.nc', '.txt', '.cnc']
      }
    },
    quickStart: {
      steps: [
        '1. Check available ports: GET /api/v1/connection/ports',
        '2. Connect to machine: POST /api/v1/connection/connect',
        '3. Check machine status: GET /api/v1/machine/status',
        '4. Execute G-code: POST /api/v1/gcode/execute',
        '5. Upload files: POST /api/v1/files',
        '6. Use presets: GET /api/v1/presets'
      ],
      safetyReminders: [
        'Always verify machine limits before sending commands',
        'Test programs with dry runs when possible',
        'Keep emergency stop accessible',
        'Validate G-code files before execution'
      ]
    },
    timestamp: new Date().toISOString()
  };
  
  res.success(helpInfo, 'Help information retrieved successfully');
});

/**
 * Get available G-code commands documentation
 */
export const getCommands = asyncHandler(async (req, res) => {
  info('API: Getting G-code commands documentation');
  
  const commands = {
    motion: {
      'G0': { description: 'Rapid positioning', example: 'G0 X10 Y20 Z5' },
      'G1': { description: 'Linear interpolation', example: 'G1 X10 Y20 F100' },
      'G2': { description: 'Clockwise circular interpolation', example: 'G2 X10 Y10 I5 J0 F100' },
      'G3': { description: 'Counter-clockwise circular interpolation', example: 'G3 X10 Y10 I5 J0 F100' }
    },
    machine: {
      'M3': { description: 'Spindle on clockwise', example: 'M3 S1000' },
      'M4': { description: 'Spindle on counter-clockwise', example: 'M4 S1000' },
      'M5': { description: 'Spindle stop', example: 'M5' },
      'M8': { description: 'Coolant on', example: 'M8' },
      'M9': { description: 'Coolant off', example: 'M9' }
    },
    coordinates: {
      'G20': { description: 'Inch units', example: 'G20' },
      'G21': { description: 'Millimeter units', example: 'G21' },
      'G90': { description: 'Absolute positioning', example: 'G90' },
      'G91': { description: 'Relative positioning', example: 'G91' },
      'G92': { description: 'Set position', example: 'G92 X0 Y0 Z0' }
    },
    special: {
      '$H': { description: 'Home machine', example: '$H' },
      '$?': { description: 'Status query', example: '$?' },
      '$X': { description: 'Unlock/reset', example: '$X' },
      '$$': { description: 'View settings', example: '$$' }
    }
  };
  
  res.success({
    commands,
    categories: Object.keys(commands),
    totalCommands: Object.values(commands).reduce((sum, category) => sum + Object.keys(category).length, 0),
    usage: 'Send commands via POST /api/v1/gcode/execute with {"command": "G0 X10"}',
    timestamp: new Date().toISOString()
  }, 'G-code commands documentation retrieved successfully');
});

/**
 * Utility Functions
 */

function getCliCommands() {
  return {
    interactive: {
      description: 'Start interactive CLI mode',
      command: 'npm run interactive',
      features: ['Real-time command input', 'Status monitoring', 'File operations']
    },
    diagnostics: {
      description: 'Run system diagnostics',
      command: 'npm run diagnose',
      features: ['Connection testing', 'Movement validation', 'Limit checking']
    },
    ports: {
      description: 'List available serial ports',
      command: 'npm run list-ports',
      features: ['Auto-detection', 'Device information', 'Connection status']
    }
  };
}

function getSafetyTips() {
  return [
    'Always verify machine limits before operation',
    'Test new programs with dry runs',
    'Keep emergency stop within reach',
    'Validate G-code files before execution',
    'Monitor machine status during operation',
    'Use proper workholding and tool setup',
    'Check for proper coordinate system setup'
  ];
}