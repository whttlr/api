# CNC State Management Module

The state management module provides comprehensive tracking and synchronization of CNC machine state including position, coordinate systems, modal groups, and tool information. It ensures consistency between software state and actual hardware state through continuous monitoring and conflict resolution.

## Components

### MachineStateManager
Central manager for all CNC machine state including position tracking, coordinate systems, modal groups, and tool management.

**Features:**
- Real-time position tracking with movement history
- Work coordinate system management (G54-G59)
- Modal group state tracking (motion, plane, units, etc.)
- Tool management with usage statistics
- State validation and bounds checking
- Data persistence and restoration

**Usage:**
```javascript
import { MachineStateManager } from './MachineStateManager.js';

const stateManager = new MachineStateManager({
  enableStateValidation: true,
  trackMovementHistory: true,
  maxHistoryEntries: 100
});

// Position tracking
stateManager.on('positionChanged', (event) => {
  console.log(`Position: ${event.current.x}, ${event.current.y}, ${event.current.z}`);
});

stateManager.updatePosition({ x: 10, y: 20, z: 5 });

// Coordinate system management
stateManager.setWorkCoordinateSystem('G55', { x: 50, y: 100, z: 25 });

// Tool management
stateManager.changeTool(3, { length: 30, diameter: 4 });
```

### PositionManager
Specialized component for tracking machine position, work coordinates, and movement calculations.

**Features:**
- Machine and work position tracking
- Movement distance calculations
- Position validation against limits
- Position history with timestamps
- Coordinate transformations

### CoordinateSystemManager
Manages work coordinate systems and offset calculations.

**Features:**
- Support for G54-G59 coordinate systems
- Offset management and validation
- Coordinate transformations between systems
- Active system tracking

### ModalGroupManager
Tracks modal group states (G-codes that remain active).

**Features:**
- Motion mode tracking (G00, G01, G02, G03)
- Plane selection (G17, G18, G19)
- Units and distance modes
- Modal state validation
- Change detection and notification

### ToolManager
Manages active tool information and usage tracking.

**Features:**
- Active tool tracking with properties
- Tool usage statistics
- Tool change history
- Tool validation

### StateSynchronizer
Ensures consistency between software state and hardware state through continuous monitoring and conflict resolution.

**Features:**
- Automatic state synchronization
- Conflict detection and resolution
- Query optimization based on activity
- Performance metrics and monitoring
- Manual synchronization capabilities

**Usage:**
```javascript
import { StateSynchronizer } from './StateSynchronizer.js';

const synchronizer = new StateSynchronizer(stateManager, commandManager, {
  enableAutomaticSync: true,
  syncInterval: 1000,
  conflictResolutionStrategy: 'hardware_priority'
});

synchronizer.on('stateConflict', (conflict) => {
  console.log(`Conflict detected: ${conflict.type}`);
});

synchronizer.startSynchronization();
```

### StateMonitor
Monitors state changes and provides real-time status updates.

### StateQueryManager
Optimizes and manages status queries to the machine.

### StateComparator
Compares software and hardware states to detect discrepancies.

### ConflictResolver
Resolves conflicts between software and hardware state using configurable strategies.

## Architecture

The state module follows a component-based architecture with clear separation of concerns:

```
state/
├── MachineStateManager.js    # Main state orchestrator
├── PositionManager.js        # Position tracking component
├── CoordinateSystemManager.js # Coordinate system management
├── ModalGroupManager.js      # Modal group tracking
├── ToolManager.js           # Tool management
├── StateSynchronizer.js     # State synchronization orchestrator
├── StateMonitor.js          # State change monitoring
├── StateQueryManager.js     # Query optimization
├── StateComparator.js       # State comparison logic
├── ConflictResolver.js      # Conflict resolution strategies
├── __tests__/               # Comprehensive test suite
├── __mocks__/               # Mock objects for testing
├── README.md                # This documentation
└── index.js                 # Module exports
```

## Event System

All state components extend EventEmitter and emit structured events:

### MachineStateManager Events
- `positionChanged` - Machine position has changed
- `coordinateSystemChanged` - Work coordinate system changed
- `modalGroupChanged` - Modal group state changed
- `toolChanged` - Active tool changed
- `stateChanged` - Machine state changed
- `stateConflict` - State conflict detected

### StateSynchronizer Events
- `synchronizationStarted` - Sync process started
- `synchronizationStopped` - Sync process stopped
- `stateConflict` - Conflict between states detected
- `conflictResolved` - Conflict successfully resolved
- `syncError` - Error during synchronization
- `syncTimeout` - Sync operation timed out

## Configuration

State management accepts comprehensive configuration options:

```javascript
const config = {
  // MachineStateManager
  enableStateValidation: true,    // Validate state changes
  trackMovementHistory: true,     // Keep position history
  maxHistoryEntries: 1000,        // History buffer size
  enableBoundsChecking: true,     // Check position limits
  
  // StateSynchronizer
  enableAutomaticSync: true,      // Auto sync with hardware
  syncInterval: 1000,             // Sync frequency (ms)
  conflictResolutionStrategy: 'hardware_priority', // 'hardware_priority', 'software_priority', 'manual'
  positionTolerance: 0.001,       // Position difference tolerance (mm)
  enableQueryOptimization: true,  // Optimize query frequency
  
  // Position tracking
  coordinatePrecision: 3,         // Decimal places for coordinates
  enableDistanceCalculation: true, // Calculate movement distances
  
  // Coordinate systems
  defaultCoordinateSystem: 'G54', // Default work coordinate system
  validateCoordinateOffsets: true, // Validate offset values
  
  // Tool management
  enableToolTracking: true,       // Track tool usage
  validateToolNumbers: true,      // Validate tool numbers
  maxToolNumber: 99               // Maximum valid tool number
};
```

## State Data Structure

The state manager maintains a comprehensive state object:

```javascript
{
  // Machine state
  state: 'Idle', // 'Idle', 'Run', 'Hold', 'Jog', 'Alarm', 'Door', 'Check', 'Home', 'Sleep'
  
  // Position information
  position: {
    machine: { x: 0, y: 0, z: 0 },    // Machine coordinates
    work: { x: 0, y: 0, z: 0 },       // Work coordinates
    offset: { x: 0, y: 0, z: 0 }      // Coordinate system offset
  },
  
  // Coordinate system
  coordinateSystem: {
    active: 'G54',                     // Active coordinate system
    offsets: {
      G54: { x: 0, y: 0, z: 0 },
      G55: { x: 0, y: 0, z: 0 },
      // ... other systems
    }
  },
  
  // Modal groups
  modal: {
    motion: 'G00',      // Motion mode
    plane: 'G17',       // Plane selection
    units: 'G21',       // Units (mm/inch)
    distance: 'G90',    // Absolute/incremental
    feedRate: 'G94',    // Feed rate mode
    spindle: 'M5',      // Spindle state
    coolant: 'M9'       // Coolant state
  },
  
  // Tool information
  tool: {
    active: 0,                        // Active tool number
    properties: {
      length: 0,      // Tool length
      diameter: 0,    // Tool diameter
      type: 'endmill' // Tool type
    }
  },
  
  // Machine limits
  limits: {
    x: { min: -100, max: 100 },
    y: { min: -100, max: 100 },
    z: { min: -50, max: 50 }
  }
}
```

## Synchronization Strategies

### Hardware Priority
- Hardware state takes precedence in conflicts
- Software state updated to match hardware
- Best for ensuring physical accuracy

### Software Priority
- Software state takes precedence in conflicts
- Commands sent to update hardware state
- Best for maintaining programmed intentions

### Manual Resolution
- Conflicts require manual intervention
- Emits events for user decision
- Best for critical applications requiring human oversight

## State Validation

The state manager provides comprehensive validation:

### Position Validation
- Coordinate format validation
- Machine limit checking
- Movement distance validation
- Precision and rounding

### Modal Group Validation
- Valid G-code checking
- Modal group compatibility
- State transition validation

### Tool Validation
- Tool number range checking
- Tool property validation
- Tool availability verification

## Performance Optimization

### Query Optimization
- Adaptive query frequency based on activity
- Intelligent batching of status requests
- Minimal redundant queries

### Memory Management
- Configurable history buffer sizes
- Automatic cleanup of old data
- Efficient data structures

### Event Optimization
- Throttled event emission
- Batch event processing
- Selective event subscriptions

## Testing

The module includes comprehensive test coverage:

```bash
npm test src/cnc/state/
```

Test coverage includes:
- Component initialization and configuration
- State tracking and updates
- Event emission and handling
- Synchronization and conflict resolution
- Error conditions and validation
- Performance under load

## Data Persistence

State data can be saved and restored:

```javascript
// Save current state
const stateData = await stateManager.saveState();

// Restore previous state
await stateManager.restoreState(stateData);

// Export for analysis
const exportData = stateManager.exportData();
```

## Best Practices

1. **Initialize early** - Set up state management before connecting to hardware
2. **Configure limits** - Define machine limits for safety
3. **Handle conflicts promptly** - Monitor and resolve state conflicts quickly
4. **Validate inputs** - Always validate position and modal group changes
5. **Monitor performance** - Track sync metrics for optimization
6. **Use appropriate sync strategy** - Choose strategy based on application needs
7. **Save state regularly** - Persist state for recovery scenarios

## Troubleshooting

### State Conflicts
- Check communication reliability
- Verify sync interval settings
- Review conflict resolution strategy
- Monitor for hardware issues

### Performance Issues
- Adjust sync frequency
- Enable query optimization
- Reduce history buffer sizes
- Check for event listener leaks

### Validation Errors
- Verify machine limit configuration
- Check coordinate system setup
- Validate input data formats
- Review modal group compatibility

### Synchronization Problems
- Test communication stability
- Check hardware response times
- Verify command manager integration
- Monitor for timeout issues