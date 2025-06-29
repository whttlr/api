# CNC Monitoring Module

The monitoring module provides comprehensive real-time monitoring capabilities for CNC machine operations, including status polling, performance tracking, and connection health monitoring.

## Components

### StatusPoller
Continuously polls machine status for real-time monitoring and state change detection.

**Features:**
- Adaptive polling rates based on machine activity
- State change detection and notification
- Position tracking with configurable thresholds
- Performance metrics collection
- Automatic error detection and recovery

**Usage:**
```javascript
import { StatusPoller } from './StatusPoller.js';

const statusPoller = new StatusPoller(commandManager, {
  pollInterval: 250,
  enableAdaptivePolling: true,
  enableStateChangeDetection: true
});

statusPoller.on('stateChanged', (event) => {
  console.log(`State changed from ${event.previousState} to ${event.currentState}`);
});

await statusPoller.startPolling();
```

### PerformanceTracker
Monitors and analyzes system performance including command execution timing and throughput.

**Features:**
- Command execution time tracking
- System resource monitoring (CPU, memory)
- Throughput analysis (commands per second)
- Bottleneck detection
- Performance degradation alerts

**Usage:**
```javascript
import { PerformanceTracker } from './PerformanceTracker.js';

const tracker = new PerformanceTracker(commandManager, {
  enableCommandTiming: true,
  enableSystemMetrics: true,
  slowCommandThreshold: 1000
});

tracker.on('slowCommand', (event) => {
  console.log(`Slow command detected: ${event.command} (${event.executionTime}ms)`);
});

tracker.startTracking();
```

### ConnectionHealthMonitor
Monitors connection health and quality with automatic failure detection and recovery.

**Features:**
- Connection health checks via ping/pong
- Latency monitoring and trend analysis
- Auto-reconnect functionality
- Connection quality assessment
- Performance alerts and degradation detection

**Usage:**
```javascript
import { ConnectionHealthMonitor } from './ConnectionHealthMonitor.js';

const healthMonitor = new ConnectionHealthMonitor(connectionManager, {
  healthCheckInterval: 5000,
  enableAutoReconnect: true,
  latencyThreshold: 100
});

healthMonitor.on('connectionLost', () => {
  console.log('Connection lost - attempting reconnect...');
});

healthMonitor.startMonitoring();
```

## Architecture

The monitoring module follows a component-based architecture where each monitor is responsible for a specific aspect of system monitoring:

```
monitoring/
├── StatusPoller.js           # Machine status monitoring
├── PerformanceTracker.js     # Performance and timing analysis  
├── ConnectionHealthMonitor.js # Connection health and quality
├── __tests__/                # Comprehensive test suite
├── __mocks__/                # Mock objects for testing
├── README.md                 # This documentation
└── index.js                  # Module exports
```

## Event System

All monitoring components extend EventEmitter and emit structured events:

### StatusPoller Events
- `pollingStarted` - Polling has begun
- `pollingStopped` - Polling has stopped
- `stateChanged` - Machine state has changed
- `positionChanged` - Machine position has changed
- `pollError` - Error during status polling

### PerformanceTracker Events
- `trackingStarted` - Performance tracking started
- `trackingStopped` - Performance tracking stopped
- `slowCommand` - Command execution exceeded threshold
- `bottleneckDetected` - System bottleneck identified
- `performanceAlert` - Performance degradation detected

### ConnectionHealthMonitor Events
- `monitoringStarted` - Health monitoring started
- `monitoringStopped` - Health monitoring stopped
- `connectionLost` - Connection has been lost
- `connectionRestored` - Connection has been restored
- `highLatency` - Latency threshold exceeded
- `criticalFailure` - Multiple consecutive failures

## Configuration

Each component accepts a configuration object to customize behavior:

```javascript
const config = {
  // StatusPoller
  pollInterval: 250,              // Base polling interval (ms)
  enableAdaptivePolling: true,    // Adjust rate based on activity
  stateChangeThreshold: 0.01,     // Minimum position change (mm)
  
  // PerformanceTracker
  enableCommandTiming: true,      // Track command execution times
  slowCommandThreshold: 1000,     // Slow command threshold (ms)
  enableSystemMetrics: true,      // Monitor system resources
  
  // ConnectionHealthMonitor
  healthCheckInterval: 5000,      // Health check interval (ms)
  pingTimeout: 2000,              // Ping timeout (ms)
  enableAutoReconnect: true,      // Auto-reconnect on failure
  maxFailedPings: 3               // Max failures before critical alert
};
```

## Metrics and Analytics

### Status Metrics
- Poll success rate
- Average response time
- State change frequency
- Position change velocity

### Performance Metrics
- Command execution times (min, max, average)
- Commands per second
- System resource usage
- Queue depths and bottlenecks

### Health Metrics
- Connection uptime percentage
- Average latency and trends
- Failure frequency and patterns
- Recovery times

## Data Export

All monitoring components support data export for analysis:

```javascript
// Export current metrics
const metrics = statusPoller.exportData();

// Get historical data
const history = performanceTracker.getMetricsHistory();

// Export as JSON for persistence
const jsonData = healthMonitor.exportAsJSON();
```

## Testing

The module includes comprehensive test coverage with mock objects:

```bash
npm test src/cnc/monitoring/
```

Test files cover:
- Component initialization and configuration
- Event emission and handling
- Error conditions and recovery
- Performance under load
- Mock integration testing

## Dependencies

- EventEmitter (Node.js built-in)
- LoggerService (project logging utility)
- CommandManager (for status polling)
- ConnectionManager (for health monitoring)

## Best Practices

1. **Start monitoring early** - Begin monitoring immediately after connection
2. **Configure thresholds appropriately** - Set realistic limits for your hardware
3. **Handle events promptly** - Process monitoring events to prevent buffer overflow
4. **Monitor the monitors** - Ensure monitoring components remain healthy
5. **Export data regularly** - Preserve metrics for trend analysis
6. **Test with mocks** - Use provided mock objects for unit testing

## Troubleshooting

### High CPU Usage
- Increase polling intervals
- Disable system metrics collection
- Reduce history buffer sizes

### Memory Leaks
- Ensure proper cleanup on shutdown
- Limit history retention periods
- Remove event listeners when done

### Missing Events
- Check event listener registration
- Verify component is started
- Review error logs for exceptions

### Inaccurate Metrics
- Calibrate thresholds for your setup
- Account for system clock drift
- Consider network latency effects