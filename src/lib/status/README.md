# Status Service Module

## Purpose
Handles parsing and querying of machine status, GRBL settings, coordinate systems, and machine limits information.

## Public API

### Query Functions
- `queryMachineStatus(sendGcodeWrapper)` - Query current machine status
- `queryGrblSettings(sendGcodeWrapper)` - Query GRBL configuration settings
- `queryCoordinateSystems(sendGcodeWrapper)` - Query coordinate system offsets
- `queryParserState(sendGcodeWrapper)` - Query parser modal state
- `getLimitsInfo(isConnected, statusQuery, settingsQuery)` - Get comprehensive limits

### Parsing Functions
- `parseMachineStatus(statusResponse)` - Parse machine status response
- `parseParserState(parserResponse)` - Parse parser state response

### Utility Functions
- `getStatus(isConnected, currentPort, responseCallbacks)` - Get connection status
- `displayLimitsInfo(limitsInfo)` - Display formatted limits information

## Data Structures

### Machine Status
```javascript
{
  state: 'Idle|Run|Hold|Jog|Alarm|Door|Check|Home|Sleep',
  position: { x: 0.000, y: 0.000, z: 0.000 },
  feedRate: 0,
  spindleSpeed: 0
}
```

### GRBL Settings
```javascript
{
  20: 0,  // Soft limits enable
  21: 0,  // Hard limits enable
  22: 0,  // Homing cycle enable
  130: 200.000,  // X-axis max travel
  // ... other settings
}
```

## Usage Example
```javascript
import { queryMachineStatus, parseMachineStatus } from './index.js';

// Query machine status
const sendWrapper = (gcode, timeout) => sendRawGcode(port, true, id, callbacks, gcode, timeout);
const status = await queryMachineStatus(sendWrapper);

if (status.parsed) {
  console.log(`Machine state: ${status.parsed.state}`);
  console.log(`Position: X${status.parsed.position.x}`);
}
```

## Dependencies
- No external dependencies (self-contained parsing)