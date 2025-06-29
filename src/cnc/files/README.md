# Files Module

## Purpose
Handles G-code file operations including reading, validation, preprocessing, execution tracking, and progress reporting.

## Public API

### FileProcessor Class
```javascript
import { FileProcessor, FILE_TYPES, VALIDATION_STATES, EXECUTION_STATES } from './index.js';

const fileProcessor = new FileProcessor(config);
```

### Methods
- `executeGcodeFile(filePath, commandExecutor, port, isConnected)` - Execute G-code file
- `preprocessGcodeFile(content)` - Clean and filter G-code content
- `validateGcodeFile(filePath)` - Validate file before execution
- `getFileStats(filePath)` - Get file statistics without execution
- `estimateExecutionTime(commands)` - Estimate execution duration
- `generateFileExecutionSummary(filePath, results)` - Generate execution report

### File Processing
- **Preprocessing**: Removes comments, filters invalid commands, normalizes format
- **Validation**: Checks file existence, extension, command validity
- **Execution**: Sequential command execution with progress tracking
- **Error Handling**: Graceful error handling with continuation options

### Supported Formats
- `.gcode` - Standard G-code files
- `.nc` - Numerical control files  
- `.txt` - Text files containing G-code

## Configuration
Requires config object with:
- `validation` - File validation rules and regex patterns
- `ui` - Progress display and report formatting
- `estimation` - Execution time estimation parameters

## Usage Example
```javascript
const processor = new FileProcessor(config);

// Validate before execution
const validation = processor.validateGcodeFile('part.gcode');
if (validation.valid) {
  // Get file statistics
  const stats = processor.getFileStats('part.gcode');
  console.log(`File contains ${stats.validCommands} commands`);
  
  // Execute file
  const result = await processor.executeGcodeFile('part.gcode', executor, port, true);
}
```

## Dependencies
- Node.js `fs` module - File system operations
- Node.js `path` module - Path resolution
- `../services/logger.js` - Logging functionality