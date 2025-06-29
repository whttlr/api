# Commands Module

## Purpose
Handles G-code command execution, safety checks, emergency operations, and command sequencing for CNC machines.

## Public API

### CommandExecutor Class
```javascript
import { CommandExecutor, COMMAND_TYPES, EXECUTION_MODES } from './index.js';

const commandExecutor = new CommandExecutor(config);
```

### Methods
- `sendGcode(port, isConnected, gcode, timeout)` - Execute single G-code command
- `emergencyStop(port, isConnected)` - Immediate emergency stop
- `sendCommandSequence(port, isConnected, commands, options)` - Execute multiple commands
- `executeWithRetry(port, isConnected, command, maxRetries)` - Command with retry logic
- `validateCommand(command)` - Pre-execution command validation
- `getExecutionStats()` - Command execution statistics
- `clearPendingCallbacks()` - Clear pending command responses

### Safety Features
- Automatic homing when required
- Machine limit safety checks
- Command validation
- Emergency stop capabilities
- Dangerous command blocking

## Configuration
Requires config object with:
- `timeouts` - Command execution timeouts
- `emergencyStopCommand` - Emergency stop G-code
- `ui` - User interface messages and icons
- `validation` - Command validation rules
- `safety` - Safety check parameters

## Usage Example
```javascript
const executor = new CommandExecutor(config);
const result = await executor.sendGcode(port, true, 'G0 X10');
await executor.emergencyStop(port, true);

const sequence = ['G0 X0', 'G0 Y0', 'G0 Z0'];
const results = await executor.sendCommandSequence(port, true, sequence);
```

## Dependencies
- `../services/logger.js` - Logging functionality
- `../services/helpers.js` - GRBL helper functions