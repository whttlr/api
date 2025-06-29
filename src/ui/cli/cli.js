#!/usr/bin/env node

/**
 * Enhanced G-code Sender Script with Movement Debugging
 *
 * A standalone Node.js script for sending G-code commands to CNC machines via serial port.
 * Enhanced with comprehensive debugging capabilities to diagnose why machines receive
 * commands but don't physically move.
 *
 * Usage:
 *   node server.js "G0 X-5"           # Send single command (uses default port /dev/tty.usbmodem1101)
 *   node server.js                    # Interactive mode (uses default port)
 *   node server.js --port /dev/tty.usbserial0 "G0 X-5"  # Override default port
 *   node server.js --diagnose         # Run movement diagnostics (uses default port)
 */

import i18n from '../../i18n.js';
import { GcodeSender, Config } from '../../cnc/index.js';
import { parseArgs, showHelp, runInteractive } from '../../utils/index.js';
import { log, error, info } from '../../lib/logger/LoggerService.js';
import { getSharedGcodeSender, getConnectionStatus } from '../../lib/shared/InstanceManager.js';
import process from 'process';

const CONFIG = Config.get();

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function main() {
  const options = parseArgs();
  const sender = options.shared ? getSharedGcodeSender('cli') : new GcodeSender();

  // Handle help
  if (options.help) {
    showHelp();
    return;
  }

  // Handle status command
  if (options.status) {
    const status = getConnectionStatus();
    
    if (!status.inUse) {
      info(i18n.t('cli.status.noConnection'));
    } else {
      info(i18n.t('cli.status.connected', { 
        port: status.port || 'unknown',
        interface: status.interface || 'unknown'
      }));
      info(i18n.t('cli.status.connectionState', { 
        state: status.isConnected ? 'connected' : 'disconnected'
      }));
    }
    return;
  }

  // Handle list ports
  if (options.listPorts) {
    info(i18n.t('cli.scanningPorts'));
    const ports = await sender.getAvailablePorts();
    
    if (ports.length === 0) {
      info(i18n.t('cli.noPortsFound'));
    } else {
      info(i18n.t('cli.availablePorts'));
      ports.forEach(port => {
        info(i18n.t('cli.portPath', { path: port.path }));
        if (port.manufacturer) info(i18n.t('cli.portManufacturer', { manufacturer: port.manufacturer }));
        if (port.serialNumber) info(i18n.t('cli.portSerial', { serialNumber: port.serialNumber }));
        info('');
      });
    }
    return;
  }

  // Handle diagnose mode
  if (options.diagnose) {
    try {
      // Use default port if not specified
      let portPath = options.port || CONFIG.defaultPort;
      if (!options.port) {
        info(i18n.t('cli.usingDefaultPort', { portPath }));
      }

      // Check if using shared connection
      if (options.shared && sender.isConnected) {
        info(i18n.t('cli.usingSharedConnection'));
      } else {
        // Connect and run diagnostics
        info(i18n.t('cli.connectingForDiagnostics'));
        await sender.connect(portPath);
      }
      
      info(i18n.t('cli.runningDiagnostics'));
      await sender.runMovementDiagnostics();
      
      // Only disconnect if not using shared connection
      if (!options.shared) {
        await sender.disconnect();
      }
      
    } catch (error) {
      error(i18n.t('cli.diagnosticError', { error: error.message }));
      process.exit(1);
    }
    return;
  }

  // Handle limits mode
  if (options.limits) {
    try {
      // Use default port if not specified
      let portPath = options.port || CONFIG.defaultPort;
      if (!options.port) {
        info(i18n.t('cli.usingDefaultPort', { portPath }));
      }

      // Check if using shared connection
      if (options.shared && sender.isConnected) {
        info(i18n.t('cli.usingSharedConnection'));
      } else {
        // Connect and get limits information
        info(i18n.t('cli.connectingForLimits'));
        await sender.connect(portPath);
      }
      
      info(i18n.t('cli.queryingLimits'));
      const limitsInfo = await sender.getLimitsInfo();
      sender.displayLimitsInfo(limitsInfo);
      
      // Only disconnect if not using shared connection
      if (!options.shared) {
        await sender.disconnect();
      }
      
    } catch (error) {
      error(i18n.t('cli.limitsError', { error: error.message }));
      process.exit(1);
    }
    return;
  }

  // Handle interactive mode
  if (options.interactive) {
    // Use default port if not specified when in interactive mode
    const portToUse = options.port || CONFIG.defaultPort;
    
    info(i18n.t('cli.runningInteractiveMode', { options: JSON.stringify(options) }));
    await runInteractive(sender, portToUse);
    return;
  }

  // Handle file execution mode
  if (options.file) {
    try {
      // Use default port if not specified
      let portPath = options.port || CONFIG.defaultPort;
      if (!options.port) {
        info(i18n.t('cli.usingDefaultPort', { portPath }));
      }

      // Check if using shared connection
      if (options.shared && sender.isConnected) {
        info(i18n.t('cli.usingSharedConnection'));
      } else {
        // Connect and execute file
        info(i18n.t('cli.executingFile', { file: options.file }));
        await sender.connect(portPath);
      }

      const result = await sender.executeGcodeFile(options.file);
      
      info(i18n.t('cli.fileExecutionCompleted', { file: options.file }));
      info(i18n.t('cli.totalCommands', { count: result.totalCommands }));
      info(i18n.t('cli.successfulCommands', { count: result.results.filter(r => r.success).length }));
      info(i18n.t('cli.failedCommands', { count: result.results.filter(r => !r.success).length }));
      
      // Only disconnect if not using shared connection
      if (!options.shared) {
        await sender.disconnect();
      }
      
    } catch (error) {
      error(i18n.t('cli.fileExecutionError', { error: error.message }));
      process.exit(1);
    }
    return;
  }

  // Handle single command mode
  if (options.command) {
    try {
      // Use default port if not specified
      let portPath = options.port || CONFIG.defaultPort;
      if (!options.port) {
        info(i18n.t('cli.usingDefaultPort', { portPath }));
      }

      // Check if using shared connection
      if (options.shared && sender.isConnected) {
        info(i18n.t('cli.usingSharedConnection'));
      } else {
        // Connect and send command
        await sender.connect(portPath);
      }

      const result = await sender.sendGcode(options.command);
      
      info(i18n.t('cli.commandSentSuccessfully', { command: options.command }));
      info(i18n.t('cli.commandResponse', { response: result.response }));
      info(i18n.t('cli.commandDuration', { duration: result.duration }));
      
      // Only disconnect if not using shared connection
      if (!options.shared) {
        await sender.disconnect();
      }
      
    } catch (error) {
      error(i18n.t('cli.commandError', { error: error.message }));
      process.exit(1);
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  info(i18n.t('cli.sigintReceived'));
  process.exit(0);
});

process.on('SIGTERM', async () => {
  info(i18n.t('cli.sigtermReceived'));
  process.exit(0);
});

// Run the main function only if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    error(i18n.t('cli.fatalError', { error }));
    process.exit(1);
  });
}

export { main };