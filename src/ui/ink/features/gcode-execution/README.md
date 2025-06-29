# G-Code Execution Feature

Interactive G-code command execution interface with real-time validation, safety confirmations, and comprehensive command management.

## Components

### GCodeExecutionScreen
Main interface for G-code execution with three operational modes and emergency controls.

**Features:**
- Three execution modes: Command, File, History
- Real-time command validation
- Safety confirmation system
- Emergency stop integration
- Connection status awareness

**Usage:**
```jsx
import { GCodeExecutionScreen } from '../features/gcode-execution';

<GCodeExecutionScreen />
```

### CommandInput
Interactive command entry with real-time validation and edit mode support.

**Features:**
- Live G-code validation feedback
- Edit mode with cursor indication
- Cross-platform keyboard support
- Real-time syntax checking
- Command suggestions and warnings

**Usage:**
```jsx
import { CommandInput } from '../features/gcode-execution';

<CommandInput
  commandInput={command}
  setCommandInput={setCommand}
  isEditMode={editing}
  setIsEditMode={setEditing}
  isExecuting={executing}
  commandValidation={validation}
  skipConfirmation={skipConfirm}
  onExecute={handleExecute}
/>
```

### CommandConfirmation
Safety confirmation dialog for potentially dangerous commands.

**Features:**
- Connection-aware messaging
- Safety options (Yes/No/Don't ask again)
- Visual command highlighting
- Context-sensitive warnings

**Usage:**
```jsx
import { CommandConfirmation } from '../features/gcode-execution';

<CommandConfirmation
  command="G0 X100 Y50"
  isConnected={true}
  onConfirm={handleConfirmation}
/>
```

### CommandHistory
Browse and reuse previously executed commands with status indicators.

**Features:**
- Command execution history
- Success/error status display
- Timestamp information
- Command reuse capability
- Navigation with arrow keys

**Usage:**
```jsx
import { CommandHistory } from '../features/gcode-execution';

<CommandHistory />
```

### FileExecution
Execute G-code files with recent file access and job monitoring.

**Features:**
- Recent files list
- Current file display
- Job status monitoring
- File browser integration
- Execution statistics

**Usage:**
```jsx
import { FileExecution } from '../features/gcode-execution';

<FileExecution />
```

## Hooks

### useCommandExecution
Comprehensive command execution management with validation and safety features.

**Features:**
- Command input state management
- Real-time validation
- Safety confirmation handling
- Execution state tracking
- Emergency stop capability

**Usage:**
```jsx
import { useCommandExecution } from '../features/gcode-execution';

const {
  commandInput,
  setCommandInput,
  isEditMode,
  setIsEditMode,
  isExecuting,
  commandValidation,
  showConfirmation,
  executeCommand,
  executeEmergencyStop,
  handleConfirmationInput
} = useCommandExecution();
```

### useCommandValidation
Real-time G-code command validation with safety analysis.

**Usage:**
```jsx
import { useCommandValidation } from '../features/gcode-execution';

const validation = useCommandValidation("G0 X100 Y50");
// Returns: { isValid, warnings, errors, suggestions }
```

### useCommandHistory
Command history management with navigation and selection.

**Usage:**
```jsx
import { useCommandHistory } from '../features/gcode-execution';

const {
  history,
  selectedIndex,
  selectedCommand,
  setSelectedIndex,
  selectCommand,
  hasHistory
} = useCommandHistory();
```

## Services

### GCodeValidator
Comprehensive G-code validation and safety analysis service.

**Functions:**
- `validateGcodeCommand(command)` - Complete command validation

**Usage:**
```jsx
import { GCodeValidator } from '../features/gcode-execution';

const validation = GCodeValidator.validateGcodeCommand("G1 X10 F1000");
```

## Validation System

### Command Validation
The validation system provides comprehensive analysis:

**Syntax Validation:**
- Command format verification
- Parameter range checking
- Coordinate validation
- Length limits (256 characters)

**Safety Analysis:**
- Movement command safety
- Spindle speed warnings
- Feed rate validation
- System command detection

**Validation Levels:**
- **Errors**: Block execution (invalid syntax, missing parameters)
- **Warnings**: Allow execution with caution (high speeds, large movements)
- **Suggestions**: Helpful information (command descriptions, tips)

### Safety Features

**Confirmation System:**
- Movement commands (G0, G1) require confirmation
- Spindle commands (M3, M4, M5) require confirmation
- System commands ($H, $RST, !) require confirmation
- Status queries (?, $$, $G) execute immediately

**Emergency Controls:**
- Ctrl+X emergency stop hotkey
- Visual emergency stop indicator
- Connection status checking

## Architecture

This feature follows the established modular architecture:

```
gcode-execution/
├── components/
│   ├── GCodeExecutionScreen.jsx    # Main execution interface
│   ├── CommandInput.jsx           # Interactive command entry
│   ├── CommandConfirmation.jsx    # Safety confirmation dialog
│   ├── CommandHistory.jsx         # Execution history browser
│   └── FileExecution.jsx          # File execution interface
├── hooks/
│   └── useCommandExecution.js     # Execution state management
├── services/
│   └── GCodeValidator.js          # Command validation service
├── __tests__/                     # Unit tests (to be added)
├── README.md                      # This file
└── index.js                       # Public API
```

## Dependencies

- `../shared/contexts` - CNC and app state management
- `../shared/components` - Shared UI components
- `../shared/services` - Input handling utilities
- `../../lib/logger` - Logging for debugging

## Future Enhancements

- [ ] Macro support and custom commands
- [ ] Command templating and favorites
- [ ] Advanced syntax highlighting
- [ ] Code completion and suggestions
- [ ] Batch command execution
- [ ] Command scheduling and queuing
- [ ] Visual G-code preview
- [ ] Advanced error recovery
- [ ] Command timing and performance metrics