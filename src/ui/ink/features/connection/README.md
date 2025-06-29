# Connection Feature

CNC machine connection management interface with automatic port discovery and connection health monitoring.

## Components

### ConnectionScreen
Main interface for managing CNC machine connections with port selection and status display.

**Features:**
- Real-time port scanning and discovery
- Port validation and compatibility scoring
- Connection status monitoring
- Error handling and recovery
- Connection history tracking

**Usage:**
```jsx
import { ConnectionScreen } from '../features/connection';

<ConnectionScreen />
```

### PortSelector
Displays available serial ports with selection interface and port details.

**Features:**
- Port compatibility analysis
- Manufacturer and device information
- Visual selection indicators
- Port validation warnings

**Usage:**
```jsx
import { PortSelector } from '../features/connection';

<PortSelector 
  ports={availablePorts}
  selectedIndex={0}
  connectedPort="/dev/ttyUSB0"
  onSelect={handlePortSelect}
/>
```

### ConnectionControls
Controls for connection management including refresh and connection tips.

**Features:**
- Connection action instructions
- Port scanning status
- Connection troubleshooting tips
- Keyboard shortcut guidance

**Usage:**
```jsx
import { ConnectionControls } from '../features/connection';

<ConnectionControls 
  isConnected={false}
  onRefresh={handleRefresh}
  onDisconnect={handleDisconnect}
/>
```

## Hooks

### useConnection
Comprehensive connection management with automatic port scanning.

**Features:**
- Connection state management
- Automatic port refresh when disconnected
- Connection history tracking
- Enhanced connect/disconnect functions
- Connection statistics and health monitoring

**Usage:**
```jsx
import { useConnection } from '../features/connection';

const { 
  connection, 
  availablePorts, 
  connect, 
  disconnect, 
  refreshPorts,
  hasAvailablePorts,
  canConnect 
} = useConnection();
```

### usePortScanning
Automated port discovery with configurable scanning intervals.

**Features:**
- Automatic port scanning
- Configurable scan intervals
- Manual rescan capability
- Scan status tracking

**Usage:**
```jsx
import { usePortScanning } from '../features/connection';

const { isScanning, lastScan, forceRescan } = usePortScanning(true);
```

## Services

### ConnectionService
Business logic for connection management and port validation.

**Functions:**
- `validatePort(port)` - Analyze port compatibility for CNC controllers
- `getRecommendedBaudRates(port)` - Get recommended connection speeds
- `formatPortDisplayName(port)` - Format port names for display
- `getConnectionTips(port)` - Get connection advice based on port type
- `analyzeConnectionHealth(state)` - Analyze connection quality and issues

**Usage:**
```jsx
import { ConnectionService } from '../features/connection';

const validation = ConnectionService.validatePort(port);
const tips = ConnectionService.getConnectionTips(port);
const health = ConnectionService.analyzeConnectionHealth(connectionState);
```

## Port Validation

The connection feature includes intelligent port validation:

### Compatibility Scoring
- **70+ points**: High compatibility - likely a CNC controller
- **40-69 points**: Moderate compatibility - test connection recommended
- **<40 points**: Low compatibility - verify device type

### Scoring Criteria
- Known manufacturer (+30-70 points)
- Recognized vendor ID (+30 points)
- Valid product ID (+10 points)
- Device information completeness (+20 points)

### Known CNC Controller Types
- Arduino-based controllers (Arduino, CH340)
- FTDI-based interfaces
- Silicon Labs USB-Serial
- Prolific USB-Serial adapters

## Connection Tips

The feature provides context-specific advice:

### Arduino Controllers
- Use 115200 baud rate
- Press reset if connection fails
- Check for driver installation

### CH340 Chips
- Ensure CH340 drivers installed
- Common in Arduino Nano clones
- May need manual driver installation

### FTDI Chips
- High-quality serial interface
- Supports high-speed communication
- Generally very reliable

## Auto-Discovery Features

### Automatic Port Scanning
- Scans every 10 seconds when disconnected
- Stops scanning when connected
- Manual refresh available with 'r' key

### Connection Health Monitoring
- Tracks connection uptime
- Monitors for errors and disconnections
- Provides recovery recommendations

## Architecture

This feature follows the established modular architecture:

```
connection/
├── components/
│   ├── ConnectionScreen.jsx    # Main connection interface
│   ├── PortSelector.jsx       # Port selection and display
│   └── ConnectionControls.jsx # Connection management controls
├── hooks/
│   └── useConnection.js       # Connection state management
├── services/
│   └── ConnectionService.js   # Connection business logic
├── __tests__/                 # Unit tests (to be added)
├── README.md                  # This file
└── index.js                   # Public API
```

## Dependencies

- `../shared/contexts` - CNC context for connection state
- `../shared/components` - Shared UI components
- `../shared/services` - Input handling utilities

## Future Enhancements

- [ ] Multiple baud rate testing
- [ ] Connection profiles and favorites
- [ ] Advanced port filtering
- [ ] Connection diagnostics and troubleshooting
- [ ] Bluetooth and network connection support
- [ ] Connection quality metrics and logging