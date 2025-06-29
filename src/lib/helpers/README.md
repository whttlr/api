# Helpers Service Module

## Purpose
Provides GRBL communication helpers, safety checks, response handling, and utility functions for CNC operations.

## Public API

### GRBL Communication
- `initializeGRBL(port, isConnected)` - Initialize GRBL with wake-up sequence
- `sendRawGcode(port, isConnected, commandId, callbacks, gcode, timeout)` - Send G-code with response handling
- `requiresHoming(gcode)` - Check if command requires homing
- `ensureHomed(sendGcodeWrapper, logger)` - Ensure machine is homed before movement

### Response Handling
- `handleResponse(responseCallbacks, logger, parseResponse, data)` - Handle incoming serial data
- `parseResponse(categorizeResponse, parsePosition, response)` - Parse GRBL responses
- `categorizeResponse(response)` - Categorize response type (ok, error, alarm, etc.)

### Safety Functions
- `checkSafeLimits(requiresHoming, gcode)` - Check command safety before execution

## Response Categories
- `OK` - Successful command execution
- `ERROR` - Command error with error code
- `ALARM` - Machine alarm state
- `STATUS` - Machine status response
- `SETTING` - GRBL setting response
- `UNKNOWN` - Unrecognized response

## Usage Example
```javascript
import { sendRawGcode, requiresHoming, ensureHomed, checkSafeLimits } from './index.js';

// Check safety before sending
const safetyCheck = checkSafeLimits(requiresHoming, 'G0 X10');
if (!safetyCheck.safe) {
  console.log('Unsafe command blocked');
  return;
}

// Ensure homing if required
if (requiresHoming('G0 X10')) {
  await ensureHomed(sendWrapper, logger);
}

// Send command with response handling
const result = await sendRawGcode(port, true, 1, callbacks, 'G0 X10', 5000);
console.log('Response:', result.response);
```

## Features
- Automatic GRBL initialization
- Response timeout handling
- Command safety validation
- Homing requirement detection
- Promise-based command execution
- Comprehensive error handling

## Dependencies
- Logger service for error reporting