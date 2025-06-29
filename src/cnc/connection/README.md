# Connection Module

## Purpose
Manages serial port connections for CNC machine communication. Handles port discovery, connection establishment, data handling, and disconnection.

## Public API

### ConnectionManager Class
```javascript
import { ConnectionManager, CONNECTION_STATES } from './index.js';

const connectionManager = new ConnectionManager(config);
```

### Methods
- `getAvailablePorts()` - Lists available serial ports
- `connect(portPath, options)` - Connects to specified port
- `disconnect()` - Closes serial connection
- `setupDataHandler(callback)` - Sets up data reception handling
- `getConnectionStatus()` - Returns current connection status
- `isPortConnected()` - Boolean connection state
- `getPort()` - Raw port instance access

### Events
The connection manager handles:
- Port open/close events
- Error handling
- Data reception and parsing

## Configuration
Requires config object with:
- `defaultPort` - Default serial port path
- `serialPort` - Serial port settings (baud rate, etc.)
- `timeouts` - Connection timeout values
- `connectionInitDelay` - Initialization delay

## Usage Example
```javascript
const manager = new ConnectionManager(config);
const ports = await manager.getAvailablePorts();
const result = await manager.connect('/dev/ttyUSB0');
manager.setupDataHandler((data) => console.log(data));
```

## Dependencies
- `serialport` - Serial port communication
- `@serialport/parser-readline` - Line-based data parsing
- `../services/logger.js` - Logging functionality
- `../services/helpers.js` - GRBL initialization