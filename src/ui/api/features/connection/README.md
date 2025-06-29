# Connection Feature Module

## Purpose
Manages serial port connections for CNC machine communication. Handles port discovery, connection establishment, disconnection, and connection health monitoring.

## API Endpoints

### `GET /api/v1/connection/ports`
List available serial ports on the system.
- **Response**: Array of available ports with metadata
- **Use case**: Port discovery before connection

### `GET /api/v1/connection/status`
Get current connection status and port information.
- **Response**: Connection state and active port details
- **Use case**: Check if machine is connected

### `POST /api/v1/connection/connect`
Connect to a specific serial port.
- **Body**: `{ "port": "/dev/ttyUSB0" }`
- **Response**: Connection success confirmation
- **Use case**: Establish machine communication

### `POST /api/v1/connection/disconnect`
Disconnect from the currently connected port.
- **Response**: Disconnection confirmation
- **Use case**: Safely disconnect from machine

### `GET /api/v1/connection/health`
Get connection system health status.
- **Response**: Connection health metrics
- **Use case**: Diagnostics and monitoring

### `POST /api/v1/connection/reset`
Reset connection state (disconnect and clear internal state).
- **Response**: Reset confirmation
- **Use case**: Recovery from connection issues

## Module Structure

```
connection/
├── controller.js      # Request handlers and business logic
├── routes.js         # Express route definitions with Swagger docs
├── schemas.js        # Request/response validation schemas
├── index.js          # Public API exports
├── __tests__/        # Unit tests (controller, schemas)
├── __mocks__/        # Mock data for testing
└── README.md         # This documentation
```

## Dependencies

### Internal
- `InstanceManager` - Provides access to shared GcodeSender instance
- `Logger Service` - Centralized logging
- `API Messages` - Internationalized response messages

### External
- `express` - Route handling
- `serialport` - Serial communication (via GcodeSender)

## Configuration

Connection behavior is configured via:
- Server timeout settings
- Port scanning parameters
- Connection retry logic
- Health check intervals

## Error Handling

The module handles these error scenarios:
- **Port not available** - Returns 400 with specific error
- **Already connected** - Returns 409 conflict status
- **Connection failed** - Returns 400 with connection details
- **Serial port errors** - Proper error logging and response

## Testing

Tests should cover:
- Port listing functionality
- Connection establishment and teardown
- Error scenarios (invalid ports, timeouts)
- Health monitoring
- State management

## Usage Examples

```javascript
// Connect to a port
const response = await fetch('/api/v1/connection/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ port: '/dev/ttyUSB0' })
});

// Check connection status
const status = await fetch('/api/v1/connection/status');
const { connected, port } = await status.json();
```

## Integration Notes

- Connection state is shared across the application via InstanceManager
- All operations are logged for debugging and monitoring
- Responses are internationalized based on Accept-Language header
- Connection events can be monitored through health endpoints