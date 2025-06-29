# Health Feature Module

## Purpose
Provides health monitoring and diagnostics for the API server and CNC system. Offers basic health checks and detailed system status reporting for monitoring and troubleshooting.

## API Endpoints

### `GET /api/v1/health`
Basic health check endpoint for API availability.
- **Response**: Simple health status and uptime
- **Use case**: Load balancer health checks, basic monitoring

### `GET /api/v1/health/detailed`
Comprehensive health status including system components.
- **Response**: Detailed status of all system components
- **Use case**: System diagnostics and troubleshooting

## Module Structure

```
health/
├── controller.js      # Health check logic (147 lines - compliant)
├── routes.js         # Express route definitions  
├── index.js          # Public API exports
├── __tests__/        # Unit tests (currently empty - needs tests)
├── __mocks__/        # Mock data for testing
└── README.md         # This documentation
```

## Dependencies

### Internal
- `InstanceManager` - Access to shared system components
- `Logger Service` - Centralized logging
- `API Messages` - Internationalized response messages

### External
- `express` - Route handling
- `os` - System information gathering

## Health Check Components

### Basic Health
- **API status** - Server running and responsive
- **Uptime** - How long the server has been running
- **Memory usage** - Current memory consumption
- **Timestamp** - Current server time

### Detailed Health
- **Connection status** - CNC machine connection state
- **Machine responsiveness** - Machine communication health
- **System resources** - CPU, memory, disk usage
- **Component status** - Individual module health
- **Performance metrics** - Response times and throughput

## Health Monitoring Features

### System Metrics
- **CPU usage** - Current processor utilization
- **Memory usage** - RAM consumption and available memory
- **Disk space** - Storage availability
- **Network connectivity** - External service accessibility

### CNC System Health
- **Connection health** - Serial port communication status
- **Machine responsiveness** - Command response times
- **Queue status** - Command queue health and backlog
- **Error rates** - Recent error frequency

### API Performance
- **Request metrics** - Request volume and response times
- **Error tracking** - API error rates and types
- **Resource utilization** - Endpoint usage patterns
- **Throughput monitoring** - Requests per second metrics

## Response Formats

### Basic Health Response
```json
{
  "status": "healthy",
  "uptime": "2h 15m 30s",
  "timestamp": "2024-06-24T12:00:00.000Z",
  "version": "1.0.0"
}
```

### Detailed Health Response
```json
{
  "status": "healthy",
  "components": {
    "api": { "status": "healthy", "uptime": "2h 15m 30s" },
    "connection": { "status": "healthy", "connected": true },
    "machine": { "status": "healthy", "responsive": true },
    "system": { "status": "healthy", "memory": "45%", "cpu": "12%" }
  },
  "timestamp": "2024-06-24T12:00:00.000Z"
}
```

## Status Levels

- **healthy** - All systems operating normally
- **degraded** - Some non-critical issues detected
- **unhealthy** - Critical issues affecting functionality
- **unknown** - Unable to determine system status

## Error Handling

Health checks handle these scenarios:
- **System resource exhaustion** - High CPU/memory usage
- **Connection failures** - CNC machine communication issues
- **Component failures** - Individual module errors
- **Performance degradation** - Slow response times

## Testing Requirements

Important tests needed:
- Basic health endpoint functionality
- Detailed health data collection
- Component status aggregation
- Error scenario handling
- Performance monitoring accuracy

## Monitoring Integration

### External Monitoring
- **Prometheus metrics** - Exportable health metrics
- **Health check URLs** - Standard monitoring endpoints
- **Alert thresholds** - Configurable warning levels
- **Status page integration** - Public status reporting

### Logging Integration
- **Health events** - Status change logging
- **Performance data** - Metric collection and storage
- **Alert generation** - Automatic issue notification
- **Trend analysis** - Historical health tracking

## Usage Examples

```javascript
// Basic health check
const health = await fetch('/api/v1/health');
const status = await health.json();

// Detailed system status
const detailed = await fetch('/api/v1/health/detailed');
const systemStatus = await detailed.json();

// Check specific component
if (systemStatus.components.connection.status !== 'healthy') {
  console.log('Connection issues detected');
}
```

## Configuration

Health monitoring configured via:
- **Check intervals** - How often to gather metrics
- **Alert thresholds** - When to report degraded status
- **Component weights** - Impact of individual component health
- **Timeout values** - Maximum time for health checks

## Integration Notes

- Health data aggregated from all system components
- Provides data for external monitoring systems
- Status changes trigger logging events
- Can be used for automated system recovery
- Supports both human-readable and machine-readable formats