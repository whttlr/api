# Utils Module

## Purpose
Provides utility functions for command-line argument parsing, help display, and interactive mode functionality.

## Public API

### Functions
- `parseArgs(args)` - Parse command-line arguments
- `showHelp()` - Display help information
- `runInteractive(sender)` - Run interactive command mode

### Command Types
- `SINGLE` - Single command execution
- `INTERACTIVE` - Interactive command-line mode
- `FILE` - G-code file execution
- `DIAGNOSTIC` - Diagnostic operations

## Argument Parsing
Supports various command-line options:
- `--port <path>` - Specify serial port
- `--interactive` - Enter interactive mode
- `--file <path>` - Execute G-code file
- `--diagnose` - Run diagnostics
- `--limits` - Show machine limits
- `--help` - Display help

### Usage Example
```javascript
import { parseArgs, showHelp, runInteractive } from './index.js';

const args = parseArgs(process.argv);

if (args.help) {
  showHelp();
} else if (args.interactive) {
  await runInteractive(sender);
}
```

## Interactive Mode
Provides a command-line interface with:
- Real-time command input
- Command history
- Auto-completion
- Built-in help commands
- Port scanning and connection
- Graceful exit handling

### Available Commands
- `help` - Show available commands
- `connect [port]` - Connect to serial port
- `disconnect` - Disconnect from port
- `status` - Show machine status
- `limits` - Show machine limits
- `home` - Home the machine
- `unlock` - Unlock from alarm state
- `quit` - Exit interactive mode

## Features
- Flexible argument parsing
- Comprehensive help system
- Interactive command execution
- Error handling and validation
- Cross-platform compatibility

## Dependencies
- Node.js readline for interactive input
- Core GcodeSender for machine operations