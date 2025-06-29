/**
 * Show help information
 */

import { Config } from '../cnc/config.js';
import { info } from '../lib/logger/LoggerService.js';

// Load configuration
const CONFIG = Config.get();

function showHelp() {
  info(`
G-code Sender - CNC Machine Communication & Debugging Tool

Usage:
  node gcode-sender.js [options] [command]

Options:
  -p, --port <path>     Specify serial port path (default: /dev/tty.usbmodem1101)
  -f, --file <path>     Execute G-code commands from file
  -l, --list-ports      List available serial ports
  -i, --interactive     Start interactive mode
  -d, --diagnose        Run movement diagnostics
      --limits          Show machine limits and current position
  -s, --shared          Use shared connection (allows multiple interfaces)
      --status          Show current connection status
  -h, --help           Show this help message

Examples:
  node gcode-sender.js "G0 X10"                    # Send single command (uses default port)
  node gcode-sender.js --port /dev/ttyUSB0 "G0 X10" # Override default port
  node gcode-sender.js --file ./.gcode/example.txt # Execute G-code file (uses default port)
  node gcode-sender.js --port /dev/ttyUSB0 --file program.gcode # Execute file with custom port
  node gcode-sender.js --interactive               # Interactive mode (uses default port)
  node gcode-sender.js --list-ports                # List available ports
  node gcode-sender.js --diagnose                  # Run movement diagnostics (uses default port)
  node gcode-sender.js --limits                    # Show machine limits (uses default port)
  node gcode-sender.js --shared "G0 X10"           # Use shared connection for single command
  node gcode-sender.js --shared --interactive      # Interactive mode with shared connection
  node gcode-sender.js --status                    # Check current connection status

Interactive Commands:
  help                  Show available commands
  status               Show connection status
  connect <port>       Connect to specified port
  disconnect           Disconnect from current port
  file <path>          Execute G-code from file
  diagnose             Run movement diagnostics
  limits               Show machine limits and position
  unlock               Send unlock command ($X)
  home                 Send homing command ($H)
  reset                Send soft reset
  stop                 Emergency stop (M112)
  quit, exit           Exit the program
  <gcode>              Send G-code command

Connection Sharing:
  The --shared flag enables multiple CLI instances and the API to share the same
  CNC machine connection. This allows you to run the web API, interactive CLI,
  and command-line operations simultaneously without port conflicts.
  
  Examples:
  - Start API server, then run CLI commands with --shared
  - Use interactive mode with --shared to avoid disconnecting other interfaces
  - Check --status to see if another interface is already connected

Z-Axis Limits:
  The Z-axis is configured with the following limits:
  - Minimum: ${CONFIG.machineLimits.z.min}mm
  - Maximum: ${CONFIG.machineLimits.z.max}mm
  - Total travel: ${CONFIG.machineLimits.z.totalTravel}mm
  
  To change these limits, modify the machineLimits.z values in the CONFIG object.
`);
}

export { showHelp };