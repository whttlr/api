# Machine Feature Module

## Purpose
Provides comprehensive machine control, status monitoring, and diagnostic capabilities. Handles machine state management, limits checking, diagnostics, and safety operations for CNC machines.

## API Endpoints

### `GET /api/v1/machine/status`
Get current machine status including state and position.
- **Response**: Machine state, coordinates, and operational status
- **Use case**: Real-time machine monitoring

### `GET /api/v1/machine/limits`
Get machine travel limits and position information.
- **Response**: Travel limits, current position, and constraint data
- **Use case**: Job planning and safety verification

### `GET /api/v1/machine/diagnostics`
Run comprehensive movement diagnostics.
- **Response**: Diagnostic results and machine responsiveness data
- **Use case**: Troubleshooting and maintenance

### `POST /api/v1/machine/unlock`
Send unlock command ($X) to clear alarm states.
- **Response**: Command execution result
- **Use case**: Recovery from alarm conditions

### `POST /api/v1/machine/home`
Send homing command ($H) to move machine to home position.
- **Response**: Homing operation result
- **Use case**: Machine initialization and reference setting

### `POST /api/v1/machine/reset`
Send soft reset to restart the machine controller.
- **Response**: Reset operation confirmation
- **Use case**: System recovery and initialization

### `POST /api/v1/machine/stop`
Send emergency stop command (M112) to halt all operations.
- **Response**: Emergency stop confirmation
- **Use case**: Safety and emergency situations

### `GET /api/v1/machine/health`
Get machine health status including responsiveness.
- **Response**: Machine health metrics and communication status
- **Use case**: System monitoring and diagnostics

## Module Structure

```
machine/
├── controller.js      # Machine operations logic (311 lines - over limit)
├── routes.js         # Express route definitions (325 lines - over limit)
├── schemas.js        # Request/response validation schemas
├── index.js          # Public API exports
├── __tests__/        # Unit tests
│   └── controller.test.js  # Existing controller tests (56 lines)
├── __mocks__/        # Mock data for testing
└── README.md         # This documentation
```

## Dependencies

### Internal
- `GcodeSender` - Core machine communication
- `DiagnosticsManager` - Machine diagnostic operations
- `QueryManager` - Status and parameter queries
- `Logger Service` - Centralized logging
- `API Messages` - Internationalized response messages

### External
- `express` - Route handling

## Machine Control Features

### Status Monitoring
- **Real-time status** - Current machine state (Idle, Run, Hold, Alarm)
- **Position tracking** - X, Y, Z coordinates in multiple coordinate systems
- **Feed rate monitoring** - Current and programmed feed rates
- **Spindle status** - RPM and direction information

### Safety Operations
- **Emergency stop** - Immediate halt of all operations
- **Alarm handling** - Clear alarm conditions safely
- **Limit detection** - Monitor travel limit switches
- **Safety interlocks** - Prevent unsafe operations

### Diagnostic Capabilities
- **Movement testing** - Verify axis responsiveness
- **Communication testing** - Check machine connectivity
- **Performance analysis** - Measure response times
- **Error detection** - Identify system issues

### Machine Initialization
- **Homing sequences** - Establish reference positions
- **Soft reset** - Restart controller without power cycle
- **Unlock operations** - Clear alarm states
- **System startup** - Initialize machine parameters

## Machine States

### Operational States
- **Idle** - Ready for commands
- **Run** - Executing G-code
- **Hold** - Paused execution (can resume)
- **Jog** - Manual movement mode
- **Home** - Homing sequence active
- **Alarm** - Error condition requiring attention
- **Check** - G-code verification mode
- **Door** - Safety door open

### Coordinate Systems
- **Machine coordinates** - Absolute machine position
- **Work coordinates** - Relative to workpiece zero
- **G54-G59** - Multiple work coordinate systems
- **Tool length offsets** - Compensated coordinates

## Error Handling

Comprehensive error management:
- **Machine not connected** - Returns 400 with connection guidance
- **Alarm conditions** - Returns appropriate status with alarm details
- **Communication timeouts** - Returns 408 with timeout information
- **Invalid commands** - Returns 400 with command validation details
- **Hardware errors** - Returns 500 with hardware status
- **Safety violations** - Returns 403 with safety information

## Testing Status

**Existing Tests**: Basic controller functionality (56 lines)
**Additional tests needed**:
- All machine control operations
- Error scenarios and recovery
- Diagnostic functionality
- Safety operation validation
- Status monitoring accuracy

## Refactoring Needed

**Priority: MEDIUM** - Files exceed line limits:
- `controller.js` (311 lines) → Split by operation type
- `routes.js` (325 lines) → Split by operation groups

Suggested split:
```
controllers/
├── status.js      # Status and monitoring operations
├── control.js     # Control operations (home, unlock, reset)
├── diagnostics.js # Diagnostic and testing operations
├── safety.js      # Emergency and safety operations
└── index.js      # Controller exports

routes/
├── monitoring.js  # Status and diagnostic routes
├── control.js     # Control operation routes
└── index.js      # Route exports
```

## Safety Considerations

### Critical Safety Features
- **Emergency stop priority** - Bypasses normal command queue
- **Alarm state protection** - Prevents movement in alarm conditions
- **Limit enforcement** - Prevents out-of-bounds movement
- **Communication verification** - Ensures reliable machine connection

### Safety Protocols
- **Pre-operation checks** - Verify machine readiness
- **Command validation** - Check commands for safety
- **State verification** - Ensure appropriate machine state
- **Error recovery** - Safe recovery from error conditions

## Performance Monitoring

### Response Time Tracking
- **Status query performance** - Monitor status request times
- **Command execution timing** - Track control command latency
- **Diagnostic performance** - Measure diagnostic operation duration
- **Communication latency** - Monitor machine response times

### Resource Utilization
- **CPU usage** - Machine control processing overhead
- **Memory usage** - Status data and buffer management
- **Network utilization** - Serial communication bandwidth
- **Queue management** - Command queue efficiency

## Usage Examples

```javascript
// Get machine status
const status = await fetch('/api/v1/machine/status');
const machineData = await status.json();

// Emergency stop
const stop = await fetch('/api/v1/machine/stop', { method: 'POST' });

// Home machine
const home = await fetch('/api/v1/machine/home', { method: 'POST' });

// Run diagnostics
const diagnostics = await fetch('/api/v1/machine/diagnostics');
const results = await diagnostics.json();

// Check machine health
const health = await fetch('/api/v1/machine/health');
const healthData = await health.json();
```

## Integration Notes

- Requires active connection management for machine access
- Status data updated in real-time during operations
- Emergency operations bypass normal API flow
- All operations logged for safety and audit purposes
- Integrates with alarm and recovery systems
- Provides data for monitoring and visualization systems