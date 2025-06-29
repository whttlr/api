# Advanced CNC Control System

A comprehensive Node.js-based CNC control system with enterprise-grade features including real-time monitoring, automatic recovery, state management, and advanced streaming capabilities. Built for professional CNC operations with GRBL-compatible controllers.

## Features

### 🚀 Core Features
- **Real-time Connection Health Monitoring** - Automatic connection recovery with latency tracking
- **Comprehensive State Management** - Complete machine state tracking with persistence
- **Hardware-Software Synchronization** - Automatic state correction and validation
- **Chunked File Streaming** - Memory-efficient processing of large G-code files
- **Configuration Management** - Backup/restore with hardware synchronization
- **Advanced Error Recovery** - Smart retry logic with exponential backoff
- **Live Status Monitoring** - Real-time machine status and position tracking

### 🔧 Advanced Capabilities
- **Pause/Resume Operations** - Interrupt and resume G-code execution
- **Automatic Checkpointing** - Resume large files from interruption points
- **Performance Metrics** - Comprehensive monitoring and analytics
- **Event-Driven Architecture** - Real-time updates and notifications
- **Enterprise Integration** - RESTful API and configuration management
- **Connection Sharing** - Multiple interfaces can share the same CNC connection

## Quick Start

### Basic CLI Usage

*   **Send a single G-code command:**
    ```bash
    node src/index.js "G0 X-5"
    ```

*   **Start in interactive mode:**
    ```bash
    node src/index.js --interactive
    ```

### Advanced System Usage

*   **Start with advanced monitoring:**
    ```bash
    node src/index.js --monitoring --health-check
    ```

## Advanced Features Integration

### Using the Complete CNC System

```javascript
import { AdvancedCNCSystem } from './examples/advanced-features-integration.js';

// Initialize the complete system
const cncSystem = new AdvancedCNCSystem(
  serialInterface,    // Your serial connection
  commandManager,     // Your command manager  
  streamingManager    // Your streaming manager
);

// Start all advanced features
await cncSystem.start();

// Execute large files with monitoring
await cncSystem.executeGcodeFile('large-project.gcode', {
  resume: true,  // Resume from checkpoint if available
  chunkSize: 1000,
  enableMonitoring: true
});

// Get comprehensive system status
const status = cncSystem.getSystemStatus();
console.log('System Health:', status.overall.systemHealthy);
console.log('Current Position:', status.state.position.work);
console.log('Connection Latency:', status.health.latency);
```

### Individual Component Usage

#### 1. Connection Health Monitoring
```javascript
import { ConnectionHealthMonitor } from './src/cnc/monitoring/ConnectionHealthMonitor.js';

const healthMonitor = new ConnectionHealthMonitor(serialInterface, {
  healthCheckInterval: 3000,
  enableAutoRecovery: true,
  enableLatencyTracking: true
});

healthMonitor.start();

healthMonitor.on('healthDegraded', (event) => {
  console.log('Connection issues detected:', event);
});
```

#### 2. Machine State Management
```javascript
import { MachineStateManager } from './src/cnc/state/MachineStateManager.js';

const stateManager = new MachineStateManager({
  persistState: true,
  autoSave: true,
  trackHistory: true
});

// Track machine state changes
stateManager.on('positionChanged', (event) => {
  console.log('New position:', event.current.work);
});
```

#### 3. Chunked File Streaming
```javascript
import { ChunkedFileStreamer } from './src/cnc/streaming/ChunkedFileStreamer.js';

const streamer = new ChunkedFileStreamer(streamingManager, {
  chunkSize: 1000,
  enablePauseResume: true,
  enableCheckpointing: true
});

// Stream large files efficiently
await streamer.startChunkedStreaming('huge-file.gcode');

// Monitor progress
streamer.on('chunkCompleted', (event) => {
  console.log(`Progress: ${Math.round(event.totalProgress * 100)}%`);
});
```

### Command-Line Options

*   `--port <path>`: Override the default serial port
    ```bash
    node src/index.js --port /dev/ttyUSB0 "G0 X-5"
    ```

*   `--file <path>`: Execute G-code file with advanced streaming
    ```bash
    node src/index.js --file large-project.gcode --chunked --monitoring
    ```

*   `--shared`: Use shared connection (allows multiple interfaces)
    ```bash
    node src/index.js --shared "G0 X10"
    npm run interactive -- --shared --interactive
    ```

*   `--status`: Show current connection status
    ```bash
    node src/index.js --status
    ```

*   `--monitoring`: Enable real-time health monitoring
    ```bash
    node src/index.js --monitoring --interactive
    ```

*   `--backup`: Create configuration backup before operations
    ```bash
    node src/index.js --backup --file project.gcode
    ```

*   `--resume`: Resume from last checkpoint
    ```bash
    node src/index.js --file project.gcode --resume
    ```

*   `--diagnose`: Run comprehensive system diagnostics
    ```bash
    node src/index.js --diagnose --health-check
    ```

*   `--sync`: Force hardware-software state synchronization
    ```bash
    node src/index.js --sync --status
    ```

## Connection Sharing

The CNC system supports **connection sharing** between multiple interfaces, allowing you to run the web API, CLI, and interactive mode simultaneously without port conflicts.

### How It Works

- **Single Shared Connection**: All interfaces use the same `GcodeSender` instance
- **No Port Conflicts**: Multiple tools can access the CNC machine at the same time
- **Opt-in Behavior**: Use the `--shared` flag to enable connection sharing
- **Status Monitoring**: Check current connection status with `--status`

### Usage Examples

**1. Check Connection Status:**
```bash
# See if anything is currently connected
npm run interactive -- --status
# Output: "No shared connection active" or connection details
```

**2. Start API and Use CLI Simultaneously:**
```bash
# Terminal 1: Start the API server
npm start

# Terminal 2: Use CLI with shared connection
npm run interactive -- --shared "G28"  # Send homing command
npm run interactive -- --shared --file project.gcode  # Execute file
npm run interactive -- --shared --interactive  # Start interactive mode
```

**3. Multiple CLI Sessions:**
```bash
# Terminal 1: Start CLI in shared interactive mode
npm run interactive -- --shared --interactive

# Terminal 2: Send commands using shared connection
npm run interactive -- --shared "G0 X10"
npm run interactive -- --shared --diagnose
```

**4. Mixed Interface Usage:**
```bash
# Web API handles file execution
curl -X POST http://localhost:3000/api/gcode/execute -d '{"file": "project.gcode"}'

# CLI monitors status using shared connection
npm run interactive -- --shared --status

# Pretty CLI provides real-time view
npm run ink -- --shared  # (if ink CLI supports shared mode)
```

### Backward Compatibility

- **Default Behavior Unchanged**: Without `--shared`, CLI works exactly as before
- **Automatic Cleanup**: Non-shared connections still disconnect after operations
- **No Breaking Changes**: Existing scripts and workflows continue to work

### Benefits

- **Simultaneous Access**: Run web interface and CLI monitoring together
- **Development Workflow**: Debug with CLI while using web interface
- **Operational Flexibility**: Switch between interfaces without reconnecting
- **Resource Efficiency**: Single connection reduces overhead and conflicts

## Examples

### Basic Operations
1.  **Execute a large G-code file with monitoring:**
    ```bash
    node src/index.js --file large-project.gcode --monitoring --chunked
    ```

2.  **Resume interrupted operation:**
    ```bash
    node src/index.js --file large-project.gcode --resume --monitoring
    ```

3.  **Run with health monitoring and auto-backup:**
    ```bash
    node src/index.js --interactive --monitoring --backup --health-check
    ```

4.  **Use shared connection with API:**
    ```bash
    # Start API server first
    npm start
    
    # Then use CLI with shared connection
    npm run interactive -- --shared --interactive
    ```

5.  **Monitor connection status:**
    ```bash
    npm run interactive -- --status
    ```

### Advanced Usage
6.  **Execute with custom chunk size and checkpointing:**
    ```bash
    node src/index.js --file huge-file.gcode --chunked --chunk-size 500 --checkpoint-interval 2500
    ```

7.  **System maintenance and diagnostics:**
    ```bash
    node src/index.js --diagnose --sync --health-check --backup
    ```

8.  **Emergency recovery mode:**
    ```bash
    node src/index.js --recovery --sync --diagnose
    ```

9.  **Multi-interface workflow with shared connection:**
    ```bash
    # Terminal 1: Start API for web interface
    npm start
    
    # Terminal 2: Monitor with CLI
    npm run interactive -- --shared --diagnose
    
    # Terminal 3: Execute file via shared connection
    npm run interactive -- --shared --file project.gcode
    ```

## System Architecture

### Core Components

```
src/
├── cnc/                           # CNC-specific modules
│   ├── monitoring/                # Connection health monitoring
│   │   └── ConnectionHealthMonitor.js
│   ├── state/                     # Machine state management
│   │   ├── MachineStateManager.js
│   │   └── StateSynchronizer.js
│   ├── streaming/                 # Large file streaming
│   │   └── ChunkedFileStreamer.js
│   ├── config/                    # Configuration management
│   │   └── ConfigurationManager.js
│   ├── commands/                  # G-code command execution
│   └── alarms/                    # Alarm and error recovery
├── lib/                          # Reusable services
│   ├── shared/                   # Shared instance management
│   │   └── InstanceManager.js    # Connection sharing logic
│   ├── logger/                   # Centralized logging
│   ├── status/                   # Status parsing
│   └── helpers/                  # GRBL protocol helpers
└── examples/                     # Integration examples
    ├── advanced-features-integration.js
    └── README.md
```

### Event-Driven Architecture

The system uses EventEmitter for real-time communication:

```javascript
// Health monitoring events
healthMonitor.on('healthDegraded', handleConnectionIssues);
healthMonitor.on('healthRestored', resumeOperations);

// State management events  
stateManager.on('positionChanged', updateDisplay);
stateManager.on('statusChanged', logStatusChange);

// Streaming events
chunkedStreamer.on('chunkCompleted', updateProgress);
chunkedStreamer.on('streamingCompleted', handleCompletion);

// Configuration events
configManager.on('backupCreated', logBackup);
configManager.on('configurationUpdated', syncToHardware);
```

## Configuration

### Machine Configuration
```json
{
  "machine": {
    "name": "CNC Router",
    "type": "grbl",
    "limits": {
      "x": { "min": -400, "max": 400 },
      "y": { "min": -300, "max": 300 },
      "z": { "min": -100, "max": 100 }
    }
  },
  "connection": {
    "port": "/dev/ttyUSB0",
    "baudRate": 115200,
    "healthCheck": true,
    "autoRecovery": true
  },
  "streaming": {
    "chunkSize": 1000,
    "enableCheckpointing": true,
    "maxMemoryUsage": "100MB"
  }
}
```

### Health Monitoring Configuration
```json
{
  "healthMonitor": {
    "healthCheckInterval": 5000,
    "pingTimeout": 2000,
    "maxConsecutiveFailures": 3,
    "enableAutoRecovery": true,
    "latencyWarningThreshold": 1000,
    "latencyCriticalThreshold": 3000
  }
}
```

## Installation

### Prerequisites
- Node.js 16+ 
- Serial port access to CNC controller
- GRBL-compatible CNC controller

### Setup
1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd cnc
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure your machine:**
   ```bash
   cp config.example.json config.json
   # Edit config.json with your machine settings
   ```

4. **Test connection:**
   ```bash
   npm run list-ports
   node src/index.js --port /dev/ttyUSB0 "?"
   ```

### Dependencies
- **serialport**: Serial communication with CNC controllers
- **jest**: Testing framework for development
- **i18next**: Internationalization framework
- **i18next-fs-backend**: File system backend for translations

## Key Features Explained

### 🔄 Connection Health Monitoring
- **Real-time Ping Tests**: Continuously monitors connection responsiveness
- **Latency Tracking**: Measures and tracks connection performance over time
- **Automatic Recovery**: Detects connection issues and attempts automatic reconnection
- **Circuit Breaker Pattern**: Prevents cascading failures during connection problems
- **Performance Metrics**: Comprehensive connection statistics and health scoring

### 📊 Machine State Management  
- **Complete State Tracking**: Position, modal groups, tool state, work coordinates
- **Persistent Storage**: Automatic state saving with configurable intervals
- **Change History**: Complete audit trail of all state changes with timestamps
- **State Validation**: Ensures state consistency and validates changes
- **GRBL Integration**: Native parsing and handling of GRBL status responses

### 🔄 Hardware-Software Synchronization
- **Continuous Monitoring**: Regular queries to ensure software matches hardware state
- **Automatic Correction**: Detects and corrects state discrepancies automatically
- **Configurable Tolerance**: Adjustable thresholds for position and timing accuracy
- **Conflict Resolution**: Intelligent handling of state conflicts with user preferences
- **Deep Sync**: Comprehensive state validation including work coordinates and modal groups

### 📁 Chunked File Streaming
- **Memory Efficient**: Processes large files without loading entire contents into memory
- **Pause/Resume**: Interrupt and resume operations at any point
- **Automatic Checkpointing**: Creates recovery points during long operations
- **Progress Tracking**: Real-time progress reporting with time estimates
- **Error Recovery**: Automatic retry of failed chunks with exponential backoff

### 💾 Configuration Management
- **Automatic Backups**: Scheduled and event-triggered configuration backups
- **Hardware Sync**: Bidirectional synchronization between software and machine settings
- **Version Control**: Configuration versioning with change tracking
- **Import/Export**: Share configurations between machines and installations
- **Validation**: Comprehensive validation before applying configuration changes

## Performance & Monitoring

### Real-time Metrics
- Connection latency and stability
- Machine position and status
- Streaming progress and performance
- System resource usage
- Error rates and recovery statistics

### Alerting System
- Connection health degradation
- State synchronization issues
- Streaming errors and failures
- Configuration change notifications
- System maintenance reminders

## Troubleshooting

### Common Issues

**Connection Problems:**
```bash
# Check available ports
npm run list-ports

# Test basic connectivity
node src/index.js --port /dev/ttyUSB0 "?"

# Run connection diagnostics
node src/index.js --diagnose --health-check
```

**State Synchronization Issues:**
```bash
# Force state synchronization
node src/index.js --sync --status

# Reset machine state
node src/index.js --reset-state --backup
```

**Large File Problems:**
```bash
# Use chunked streaming with smaller chunks
node src/index.js --file large.gcode --chunked --chunk-size 500

# Resume from checkpoint
node src/index.js --file large.gcode --resume
```

### Debug Logging
Enable detailed logging for troubleshooting:
```javascript
import { LoggerService } from './src/lib/logger/LoggerService.js';
LoggerService.setLevel('debug');
```

### Emergency Recovery
```bash
# Emergency stop and state preservation
node src/index.js --emergency-stop

# Recovery mode with diagnostics
node src/index.js --recovery --diagnose --sync
```

## Development

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Project Structure
- **TDD Approach**: All new features require tests first
- **Self-contained Modules**: Each feature is organized in dedicated folders
- **Event-driven Architecture**: Components communicate via EventEmitter
- **Configuration Management**: No hardcoded values, everything configurable
- **Comprehensive Logging**: Centralized logging with multiple output formats

### Contributing
1. Follow TDD principles - write tests first
2. Maintain self-contained module structure
3. Use centralized logging (no console.log)
4. Update documentation for new features
5. Ensure all tests pass before submitting

## License

This project is licensed under the MIT License - see the LICENSE file for details.