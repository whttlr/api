# Interfaces Module

## Purpose
Provides user interface components for interacting with the CNC G-code sender application.

## Public API

### Interfaces
- `cliMain()` - Main CLI interface entry point

### Interface Types
- `CLI` - Standard command-line interface
- `WEB` - Web-based interface (future)
- `API` - REST API interface (future)

## CLI Interface
The standard command-line interface supports:
- Single command execution
- Interactive mode
- File execution
- Diagnostic operations
- Port management

### Usage Examples
```bash
# Single command
node main.js "G0 X10"

# Interactive mode
node main.js --interactive

# File execution
node main.js --file part.gcode

# Diagnostics
node main.js --diagnose
```


## Features
- Multiple interface types support
- Configurable output modes
- Real-time status updates
- Interactive command execution
- File processing with progress
- Comprehensive error handling

## Dependencies
- Core GcodeSender for machine control
- Utils for argument parsing and help