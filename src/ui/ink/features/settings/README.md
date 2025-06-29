# Settings Feature

Complete configuration management for machine, user, connection, and interface settings.

## Components

### SettingsForm
- Generic form component for editing settings
- Real-time validation with error/warning display
- Keyboard navigation and inline editing
- Support for different data types (string, number, boolean, array)

### MachineSettings
- Machine-specific configuration (limits, feed rates, step sizes)
- Travel limit configuration for all axes
- Safety parameter validation
- Default values and step size management

### UnitsToggle
- Metric/Imperial units switching
- Unit conversion information
- Global units preference management

## Screens

### SettingsScreen
- Tabbed interface for different setting categories
- Save/cancel confirmation dialogs
- Real-time validation feedback
- Unsaved changes detection

## Hooks

### useSettings
- Settings file persistence (load/save)
- Real-time validation
- Dirty state tracking
- Import/export functionality
- Setting path-based updates

## Services

### SettingsService
- File-based settings persistence
- Default settings management
- Deep merging of user and default settings
- Validation with custom rules
- Import/export with version tracking

## Setting Categories

### Machine Settings
- **Speed Limits**: Maximum feed rates and spindle speeds
- **Travel Limits**: Axis travel boundaries (min/max for X, Y, Z)
- **Step Sizes**: Available jogging increments
- **Feed Rates**: Default, rapid, and probing speeds
- **Homing**: Home sequence and parameters

### User Preferences
- **Units**: Metric (mm) or Imperial (inch)
- **Theme**: UI theme selection
- **Auto Home**: Automatic homing on connection
- **Confirmations**: Destructive action confirmations
- **Logging**: Log level configuration
- **Polling**: Status update frequency

### Connection Settings
- **Baud Rate**: Serial communication speed
- **Auto Connect**: Automatic connection on startup
- **Default Port**: Preferred serial port
- **Timeout**: Connection timeout duration

### Interface Settings
- **Advanced Controls**: Show/hide advanced features
- **Compact Mode**: Use condensed UI layout
- **Status History**: Enable status tracking
- **History Size**: Maximum status entries to keep

## Validation

### Real-time Validation
- Type checking (number, boolean, string, array)
- Range validation for numeric values
- Enum validation for constrained choices
- Custom validation rules per field

### Safety Validation
- Speed and RPM limits within safe ranges
- Travel limits logical consistency (min < max)
- Required field validation
- Cross-field dependency checking

## File Management

### Settings Persistence
- JSON file format in `config/user-settings.json`
- Automatic directory creation
- Backup and recovery
- Version tracking for compatibility

### Import/Export
- Full settings export with metadata
- Selective import with validation
- Settings sharing between installations
- Backup creation before major changes

## Integration Points

- **Settings Context**: Global settings state management
- **Machine Context**: Real-time parameter updates
- **Logger Service**: Settings change logging
- **File System**: Settings file persistence

## Keyboard Controls

### Navigation
- `1-4` - Switch between setting tabs
- `Tab` - Cycle through tabs
- `↑↓` - Navigate within forms
- `Enter` - Edit selected field
- `Esc` - Cancel editing/go back

### Actions
- `Ctrl+S` - Save settings
- `Ctrl+R` - Reset to defaults
- `U` - Toggle units (in user settings)
- `Y/N` - Confirm/cancel dialogs

## Configuration Files

Settings are stored in:
```
config/
└── user-settings.json    # User-modified settings
```

With fallback to built-in defaults when file doesn't exist or is invalid.