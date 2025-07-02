# G-code Feature Module

## Purpose
Handles G-code command execution and file processing. Provides real-time command execution, file streaming, and command queue management for CNC machine control.

## API Endpoints

### `POST /api/v1/gcode/execute`
Execute a single G-code command immediately.
- **Body**: `{ "command": "G01 X10 Y10" }`
- **Response**: Execution result and machine response
- **Use case**: Manual machine control and testing

### `POST /api/v1/gcode/file`
Execute a complete G-code file with streaming.
- **Body**: `{ "filename": "part.gcode", "options": { "dryRun": false } }`
- **Response**: Execution status and progress information
- **Use case**: Production part machining

### `GET /api/v1/gcode/queue`
Get current command queue status and progress.
- **Response**: Queue state, pending commands, and execution progress
- **Use case**: Monitoring execution progress

## Module Structure

```
gcode/
├── controller.js      # G-code execution logic (322 lines - over limit)
├── routes.js         # Express route definitions (358 lines - over limit)  
├── schemas.js        # Request/response validation schemas
├── index.js          # Public API exports
├── __tests__/        # Unit tests (currently empty - needs tests)
├── __mocks__/        # Mock data for testing
└── README.md         # This documentation
```

## Dependencies

### Internal
- `GcodeSender` - Core G-code execution engine
- `FileProcessor` - File validation and processing
- `Logger Service` - Centralized logging
- `API Messages` - Internationalized response messages

### External
- `express` - Route handling
- `fs` - File system operations for G-code files

## Command Processing Features

### Single Command Execution
- **Real-time execution** - Immediate command processing
- **Response handling** - Captures machine feedback
- **Error detection** - Identifies command failures
- **Safety validation** - Prevents dangerous commands

### File Execution
- **Streaming execution** - Processes large files efficiently
- **Progress tracking** - Reports execution progress
- **Pause/resume support** - Allows job control
- **Error recovery** - Handles mid-execution failures

### Queue Management
- **Command queuing** - Manages pending commands
- **Priority handling** - Emergency commands take precedence
- **Status reporting** - Real-time queue state
- **Cancellation support** - Stops execution safely

## Execution Modes

### Standard Mode
- Commands executed sequentially
- Wait for machine responses
- Full error checking
- Progress reporting

### Dry Run Mode
- Validate commands without execution
- Check for syntax errors
- Verify machine limits
- Report potential issues

### Emergency Mode
- Immediate execution priority
- Bypass normal queue
- Used for emergency stops
- Safety command handling

## Safety Features

- **Command validation** - Checks G-code syntax
- **Limit checking** - Prevents out-of-bounds movement
- **Tool validation** - Verifies tool availability
- **Emergency stop** - Immediate halt capability
- **Machine state verification** - Ensures machine readiness

## Error Handling

Comprehensive error scenarios:
- **Invalid G-code syntax** - Returns 400 with syntax details
- **Machine not connected** - Returns 400 with connection status
- **File not found** - Returns 404 for missing G-code files
- **Execution timeouts** - Returns 408 with timeout information
- **Machine errors** - Returns 500 with machine response
- **Queue overflows** - Returns 429 with queue status

## Testing Requirements

Critical tests needed:
- Single command execution
- File execution and streaming
- Queue management operations
- Error handling scenarios
- Safety validation logic
- Emergency stop functionality

## Refactoring Needed

**Priority: MEDIUM** - Files exceed line limits:
- `controller.js` (322 lines) → Split by execution type
- `routes.js` (358 lines) → Split by operation groups

Suggested split:
```
controllers/
├── commands.js    # Single command execution
├── files.js       # File execution and streaming
├── queue.js       # Queue management
└── index.js      # Controller exports

routes/
├── execution.js  # Command and file execution routes
├── management.js # Queue and status routes
└── index.js     # Route exports
```

## Performance Considerations

- **Streaming optimization** - Efficient large file handling
- **Memory management** - Prevents queue overflow
- **Response caching** - Reduces API latency
- **Async processing** - Non-blocking command execution

## Usage Examples

```javascript
// Execute single command
const command = await fetch('/api/v1/gcode/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ command: 'G28' })
});

// Execute G-code file
const fileExecution = await fetch('/api/v1/gcode/file', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    filename: 'part.gcode',
    options: { dryRun: false }
  })
});

// Check queue status
const queue = await fetch('/api/v1/gcode/queue');
const status = await queue.json();
```

## Integration Notes

- Integrates with connection management for machine access
- File execution requires uploaded files via files feature
- All operations logged for debugging and audit
- Supports real-time progress updates via queue status
- Emergency commands bypass normal execution flow