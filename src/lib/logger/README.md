# Logger Service Module

## Purpose
Provides centralized logging functionality for the CNC application with timestamped output and configurable log levels.

## Public API

### Functions
- `log(message, data, level)` - Main logging function with optional data and level
- `debug(message, data)` - Debug level logging
- `info(message, data)` - Info level logging (clean output)
- `warn(message, data)` - Warning level logging
- `error(message, data)` - Error level logging

### Log Levels
- `DEBUG` - Detailed debugging information
- `INFO` - General information (clean, no timestamp)
- `WARN` - Warning messages
- `ERROR` - Error messages
- `LOG` - Standard log messages

## Usage Example
```javascript
import { log, debug, info, warn, error, LOG_LEVELS } from './index.js';

// Standard logging
log('Application started');
debug('Detailed debug info');
info('User-friendly message');
warn('Warning condition');
error('Error occurred');

// With data
log('Connection established', { port: '/dev/ttyUSB0' });
error('Connection failed', { error: 'timeout' });
```

## Features
- Automatic timestamping for non-info messages
- Clean output for info messages (no timestamp)
- Optional data parameter for structured logging
- Configurable log levels
- Console output with appropriate formatting

## Dependencies
- No external dependencies (Node.js built-in only)