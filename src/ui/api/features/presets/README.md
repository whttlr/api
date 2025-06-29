# Presets Feature Module

## Purpose
Manages predefined G-code command sequences (presets) for common CNC operations. Provides storage, retrieval, execution, and management of reusable command sets for efficient machine operation.

## API Endpoints

### `GET /api/v1/presets`
List all available presets with metadata.
- **Response**: Array of available presets with descriptions and categories
- **Use case**: Preset discovery and selection

### `GET /api/v1/presets/:name`
Get detailed information about a specific preset.
- **Parameters**: `name` - Name of the preset to retrieve
- **Response**: Preset details including commands and metadata
- **Use case**: Preset inspection before execution

### `POST /api/v1/presets/:name/execute`
Execute a specific preset's command sequence.
- **Parameters**: `name` - Name of the preset to execute
- **Body**: Optional execution parameters
- **Response**: Execution result and status
- **Use case**: Running common operations

### `POST /api/v1/presets/save`
Save a new preset or update an existing one.
- **Body**: Preset definition with commands and metadata
- **Response**: Save confirmation and preset details
- **Use case**: Creating custom presets

## Module Structure

```
presets/
├── controller.js      # Preset operations logic (551 lines - over limit)
├── routes.js         # Express route definitions
├── index.js          # Public API exports
├── __tests__/        # Unit tests (currently empty - needs tests)
├── __mocks__/        # Mock data for testing
└── README.md         # This documentation
```

## Dependencies

### Internal
- `PresetsService` - Core preset management logic
- `GcodeSender` - Command execution engine
- `Logger Service` - Centralized logging
- `API Messages` - Internationalized response messages

### External
- `express` - Route handling
- `fs` - File system operations for preset storage

## Preset Management Features

### Preset Categories
- **Setup operations** - Machine initialization sequences
- **Tool changes** - Automated tool change procedures
- **Calibration** - Machine calibration routines
- **Maintenance** - Regular maintenance procedures
- **Custom operations** - User-defined command sequences

### Preset Structure
```json
{
  "name": "machine_warmup",
  "description": "Machine warmup sequence",
  "category": "setup",
  "commands": [
    "G28",
    "G01 F100",
    "M03 S1000"
  ],
  "metadata": {
    "author": "system",
    "created": "2024-06-24T12:00:00.000Z",
    "estimatedTime": "30s",
    "safety": "low"
  }
}
```

### Storage Management
- **File-based storage** - JSON files for preset definitions
- **Validation** - Command syntax and safety validation
- **Versioning** - Track preset modifications
- **Backup** - Automatic preset backup on changes

## Preset Execution Features

### Execution Modes
- **Standard execution** - Normal command processing
- **Dry run mode** - Validate without execution
- **Step-by-step** - Execute with confirmation prompts
- **Emergency mode** - High priority execution

### Safety Features
- **Command validation** - Check G-code syntax before execution
- **Safety classification** - Risk assessment for preset operations
- **Machine state verification** - Ensure appropriate conditions
- **Abort capability** - Stop execution safely

### Parameter Substitution
- **Variable support** - Dynamic values in presets
- **Parameter validation** - Type and range checking
- **Default values** - Fallback parameter values
- **Documentation** - Parameter descriptions and examples

## Preset Categories

### System Presets
- **Machine initialization** - Startup sequences
- **Safety procedures** - Emergency and safety operations
- **Calibration routines** - Accuracy and alignment procedures
- **Maintenance tasks** - Regular upkeep operations

### User Presets
- **Custom sequences** - User-defined operations
- **Project-specific** - Operations for specific jobs
- **Tool-specific** - Tool change and setup procedures
- **Material-specific** - Operations for different materials

## Error Handling

Comprehensive error management:
- **Preset not found** - Returns 404 with available presets
- **Invalid preset format** - Returns 400 with validation details
- **Execution failures** - Returns 500 with execution status
- **Machine not ready** - Returns 400 with machine status
- **Permission errors** - Returns 403 for protected presets
- **Storage errors** - Returns 500 with storage status

## Testing Requirements

Critical tests needed:
- Preset listing and retrieval
- Preset execution functionality
- Parameter substitution logic
- Error handling scenarios
- Storage and validation operations
- Safety feature verification

## Refactoring Needed

**Priority: HIGH** - Controller exceeds line limits:
- `controller.js` (551 lines) → Split by operation type

Suggested split:
```
controllers/
├── management.js  # Preset CRUD operations
├── execution.js   # Preset execution logic
├── validation.js  # Preset and parameter validation
├── storage.js     # File system operations
└── index.js      # Controller exports
```

## Security Considerations

### Access Control
- **Preset permissions** - Read/write/execute permissions
- **User authentication** - Verify user access rights
- **Command filtering** - Prevent dangerous operations
- **Audit logging** - Track preset usage and modifications

### Validation
- **Command safety** - Check for potentially dangerous commands
- **Parameter bounds** - Validate parameter ranges
- **Syntax checking** - Ensure valid G-code format
- **Machine compatibility** - Verify machine capability

## Performance Features

### Caching
- **Preset caching** - In-memory preset storage
- **Validation caching** - Cache validation results
- **Execution optimization** - Optimize command sequences
- **Resource management** - Efficient memory usage

### Batch Operations
- **Bulk execution** - Execute multiple presets
- **Preset chaining** - Link presets in sequences
- **Conditional execution** - Execute based on conditions
- **Parallel execution** - Run compatible presets simultaneously

## Usage Examples

```javascript
// List all presets
const presets = await fetch('/api/v1/presets');
const presetList = await presets.json();

// Get specific preset
const preset = await fetch('/api/v1/presets/machine_warmup');
const presetDetails = await preset.json();

// Execute preset
const execution = await fetch('/api/v1/presets/machine_warmup/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ parameters: { speed: 1000 } })
});

// Save new preset
const save = await fetch('/api/v1/presets/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'custom_setup',
    description: 'Custom setup sequence',
    commands: ['G28', 'G01 F500'],
    category: 'setup'
  })
});
```

## Integration Notes

- Integrates with GcodeSender for command execution
- Uses PresetsService for core preset management
- All operations logged for audit and debugging
- Supports parameter substitution for dynamic operations
- Provides foundation for automation and workflows
- Can be extended for complex operation sequences