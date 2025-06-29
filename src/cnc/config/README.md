# CNC Configuration Module

The configuration module provides comprehensive configuration management for CNC machines, including settings storage, validation, backup/restore functionality, and GRBL settings synchronization. It ensures configuration consistency and provides robust mechanisms for managing machine-specific settings.

## Components

### ConfigurationManager
Main orchestrator for all configuration management operations including loading, saving, validation, and synchronization.

**Features:**
- Configuration loading and saving with validation
- Backup and restore functionality
- GRBL settings synchronization
- Configuration presets management
- Change tracking and event emission
- Import/export capabilities

**Usage:**
```javascript
import { ConfigurationManager } from './ConfigurationManager.js';

const configManager = new ConfigurationManager({
  enableValidation: true,
  enableBackups: true,
  maxBackupCount: 10,
  enableGrblSync: true
});

// Load configuration
const config = await configManager.loadConfiguration();

// Save configuration with validation
await configManager.saveConfiguration({
  machine: {
    name: 'My CNC Mill',
    type: 'mill',
    limits: { x: 300, y: 200, z: 100 }
  },
  connection: {
    port: '/dev/ttyUSB0',
    baudRate: 115200
  }
});

// Listen for configuration changes
configManager.on('configurationChanged', (event) => {
  console.log('Configuration updated:', event.changes);
});
```

### ConfigurationStorage
Handles persistent storage of configuration data with support for multiple formats and backup retention.

**Features:**
- JSON-based configuration storage
- Backup management with automatic cleanup
- Configuration presets storage
- Import/export functionality
- Storage validation and integrity checking

**Usage:**
```javascript
import { ConfigurationStorage } from './ConfigurationStorage.js';

const storage = new ConfigurationStorage({
  configDirectory: './config',
  backupDirectory: './backups',
  enableCompression: true
});

await storage.saveConfiguration(config, 'main');
const loadedConfig = await storage.loadConfiguration('main');
```

### ConfigurationValidator
Validates configuration data against predefined schemas and business rules.

**Features:**
- Schema-based validation
- Business rule validation
- Detailed error reporting
- Custom validation rules
- Validation result caching

**Usage:**
```javascript
import { ConfigurationValidator } from './ConfigurationValidator.js';

const validator = new ConfigurationValidator({
  strictMode: true,
  validateRanges: true,
  customRules: customValidationRules
});

const result = validator.validateConfiguration(config);
if (!result.isValid) {
  console.log('Validation errors:', result.errors);
}
```

### GrblSettingsManager
Specialized manager for GRBL controller settings with hardware synchronization capabilities.

**Features:**
- GRBL settings query and update
- Settings validation against GRBL specifications
- Hardware/software synchronization
- Settings backup and restore
- Drift detection and auto-correction
- Settings presets for different machine configurations

**Usage:**
```javascript
import { GrblSettingsManager } from './GrblSettingsManager.js';

const grblManager = new GrblSettingsManager(commandManager, {
  enableValidation: true,
  autoSync: true,
  syncInterval: 30000
});

// Query all settings from hardware
const settings = await grblManager.queryAllSettings();

// Update specific setting
await grblManager.updateSetting('$100', '250.000');

// Detect and handle settings drift
grblManager.on('settingsDrift', (event) => {
  console.log('Settings drift detected:', event.driftedSettings);
});
```

### BackupManager
Manages configuration backups with versioning, retention policies, and restore capabilities.

**Features:**
- Automatic backup creation on configuration changes
- Manual backup creation with custom metadata
- Backup retention policies with automatic cleanup
- Backup validation and integrity checking
- Incremental and full backup support

**Usage:**
```javascript
import { BackupManager } from './BackupManager.js';

const backupManager = new BackupManager(storage, {
  maxBackups: 20,
  retentionDays: 30,
  autoBackup: true
});

// Create manual backup
const backup = await backupManager.createBackup(config, 'before_upgrade');

// Restore from backup
await backupManager.restoreFromBackup(backup.id);
```

## Architecture

The configuration module follows a component-based architecture with clear separation of concerns:

```
config/
├── ConfigurationManager.js     # Main orchestrator
├── ConfigurationStorage.js     # Persistent storage handling
├── ConfigurationValidator.js   # Configuration validation
├── GrblSettingsManager.js     # GRBL-specific settings management
├── BackupManager.js           # Backup and restore functionality
├── __tests__/                 # Comprehensive test suite
├── __mocks__/                 # Mock objects for testing
├── README.md                  # This documentation
└── index.js                   # Module exports
```

## Event System

All configuration components extend EventEmitter and emit structured events:

### ConfigurationManager Events
- `configurationLoaded` - Configuration successfully loaded
- `configurationSaved` - Configuration successfully saved
- `configurationChanged` - Configuration has been modified
- `validationFailed` - Configuration validation failed
- `backupCreated` - Configuration backup created
- `grblSyncCompleted` - GRBL synchronization completed

### GrblSettingsManager Events
- `settingsQueried` - GRBL settings successfully queried
- `settingUpdated` - Individual setting updated
- `settingsDrift` - Settings drift detected between software and hardware
- `autoSyncCompleted` - Automatic synchronization completed
- `validationError` - Settings validation error occurred

### BackupManager Events
- `backupCreated` - New backup successfully created
- `backupRestored` - Configuration restored from backup
- `backupDeleted` - Backup deleted
- `cleanupCompleted` - Old backups cleaned up

## Configuration Schema

The configuration follows a structured schema with well-defined sections:

```javascript
{
  // Machine configuration
  machine: {
    name: 'String',              // Machine name
    type: 'mill|lathe|router',   // Machine type
    manufacturer: 'String',      // Manufacturer name
    model: 'String',            // Model number
    limits: {
      x: 'Number',              // X-axis travel limit (mm)
      y: 'Number',              // Y-axis travel limit (mm)
      z: 'Number'               // Z-axis travel limit (mm)
    },
    capabilities: {
      spindle: 'Boolean',       // Has spindle
      coolant: 'Boolean',       // Has coolant
      probe: 'Boolean',         // Has probe
      homing: 'Boolean'         // Has homing
    }
  },
  
  // Connection configuration
  connection: {
    port: 'String',             // Serial port path
    baudRate: 'Number',         // Baud rate (9600, 115200, etc.)
    timeout: 'Number',          // Communication timeout (ms)
    flowControl: 'none|xon|rts', // Flow control method
    retryAttempts: 'Number',    // Connection retry attempts
    retryDelay: 'Number'        // Delay between retries (ms)
  },
  
  // GRBL settings (synchronized with hardware)
  grbl: {
    '$0': 'String',             // Step pulse time
    '$1': 'String',             // Step idle delay
    '$100': 'String',           // X steps per mm
    '$101': 'String',           // Y steps per mm
    '$102': 'String',           // Z steps per mm
    // ... additional GRBL settings
  },
  
  // User interface configuration
  ui: {
    theme: 'light|dark',        // UI theme
    units: 'mm|inch',           // Display units
    precision: 'Number',        // Decimal precision
    language: 'String',         // UI language
    refreshRate: 'Number',      // UI refresh rate (ms)
    notifications: 'Boolean'    // Enable notifications
  },
  
  // Safety configuration
  safety: {
    enableSoftLimits: 'Boolean', // Enable soft limits
    enableHardLimits: 'Boolean', // Enable hard limits
    emergencyStopEnabled: 'Boolean', // Emergency stop functionality
    maxFeedRate: 'Number',      // Maximum feed rate (mm/min)
    maxSpindleSpeed: 'Number',  // Maximum spindle speed (RPM)
    confirmDangerousOperations: 'Boolean' // Require confirmation for dangerous ops
  },
  
  // Tool configuration
  tools: {
    toolTable: [
      {
        number: 'Number',       // Tool number
        description: 'String',  // Tool description
        diameter: 'Number',     // Tool diameter (mm)
        length: 'Number',       // Tool length (mm)
        type: 'endmill|drill|probe' // Tool type
      }
    ],
    autoToolChange: 'Boolean',  // Automatic tool change capability
    toolSensor: 'Boolean'       // Tool length sensor available
  }
}
```

## Validation Rules

### Machine Configuration
- Machine name must be non-empty string
- Machine type must be valid enum value
- Limits must be positive numbers
- Capabilities must be boolean values

### Connection Configuration
- Port must be valid serial port path
- Baud rate must be standard value (9600, 19200, 38400, 57600, 115200, etc.)
- Timeout must be positive number between 1000-30000ms
- Retry attempts must be 0-10
- Retry delay must be 100-5000ms

### GRBL Settings
- Settings keys must match GRBL parameter format ($0, $1, $100, etc.)
- Numeric settings must be valid numbers within acceptable ranges
- Boolean settings must be 0 or 1
- String settings must meet GRBL specifications

### UI Configuration
- Theme must be 'light' or 'dark'
- Units must be 'mm' or 'inch'
- Precision must be 0-6 decimal places
- Language must be valid locale code
- Refresh rate must be 100-5000ms

## Configuration Management Best Practices

### Loading Configuration
1. **Validate after loading** - Always validate configuration after loading from storage
2. **Provide defaults** - Have sensible defaults for missing configuration sections
3. **Handle corruption gracefully** - Restore from backup if main configuration is corrupted
4. **Cache frequently accessed values** - Cache commonly used configuration values

### Saving Configuration
1. **Validate before saving** - Always validate configuration before saving
2. **Create backups** - Automatically create backups before saving changes
3. **Use atomic operations** - Ensure configuration saves are atomic
4. **Handle save failures** - Provide rollback capability if save operations fail

### GRBL Synchronization
1. **Sync on connection** - Synchronize settings when connecting to machine
2. **Detect drift** - Regularly check for drift between software and hardware settings
3. **Handle conflicts** - Provide clear conflict resolution strategies
4. **Backup before changes** - Create backups before making GRBL setting changes

## Testing

The module includes comprehensive test coverage:

```bash
npm test src/cnc/config/
```

Test coverage includes:
- Configuration loading and saving
- Validation with various invalid configurations
- GRBL settings management and synchronization
- Backup creation and restoration
- Error handling and recovery scenarios
- Mock integration for isolated testing

## Usage Patterns

### Basic Configuration Management
```javascript
const configManager = new ConfigurationManager();

// Load existing configuration
const config = await configManager.loadConfiguration();

// Modify configuration
config.machine.name = 'Updated Machine Name';

// Save with validation
await configManager.saveConfiguration(config);
```

### GRBL Settings Management
```javascript
const grblManager = new GrblSettingsManager(commandManager);

// Query current settings
const settings = await grblManager.queryAllSettings();

// Update specific setting
await grblManager.updateSetting('$100', '250.000');

// Create settings backup
await grblManager.createBackup('before_calibration');
```

### Configuration Presets
```javascript
// Save current configuration as preset
await configManager.saveAsPreset('my_mill_setup', 'My Mill Configuration');

// Load preset
await configManager.loadPreset('my_mill_setup');

// List available presets
const presets = await configManager.listPresets();
```

### Backup and Restore
```javascript
// Create manual backup
const backup = await configManager.createBackup('before_upgrade');

// List available backups
const backups = await configManager.listBackups();

// Restore from backup
await configManager.restoreFromBackup(backup.id);
```

## Error Handling

### Configuration Validation Errors
```javascript
try {
  await configManager.saveConfiguration(invalidConfig);
} catch (error) {
  if (error.name === 'ValidationError') {
    console.log('Validation errors:', error.details);
    // Handle specific validation failures
  }
}
```

### GRBL Communication Errors
```javascript
grblManager.on('error', (error) => {
  if (error.type === 'communication') {
    // Handle communication errors
    console.log('GRBL communication failed:', error.message);
  } else if (error.type === 'validation') {
    // Handle validation errors
    console.log('Invalid GRBL setting:', error.setting);
  }
});
```

### Storage Errors
```javascript
try {
  await configManager.loadConfiguration();
} catch (error) {
  if (error.code === 'ENOENT') {
    // Configuration file doesn't exist, use defaults
    await configManager.loadDefaults();
  } else {
    // Other storage errors
    console.error('Configuration load failed:', error.message);
  }
}
```

## Migration and Versioning

### Configuration Migration
The configuration system supports automatic migration of older configuration formats:

```javascript
// Migration is handled automatically during load
const config = await configManager.loadConfiguration();
// Older formats are automatically migrated to current version
```

### Version Compatibility
- **Version 1.0** - Initial configuration format
- **Version 1.1** - Added safety configuration section
- **Version 1.2** - Enhanced tool configuration with tool table
- **Version 2.0** - Restructured GRBL settings integration

## Performance Considerations

### Caching
- Configuration values are cached after first load
- GRBL settings are cached with configurable TTL
- Validation results are cached to avoid repeated validation

### Lazy Loading
- Large configuration sections can be loaded on demand
- Tool tables and presets are loaded lazily
- Backup data is not loaded until needed

### Memory Management
- Old backup data is automatically cleaned up
- Configuration history is limited to prevent memory leaks
- Cached data has appropriate expiration

## Troubleshooting

### Configuration Won't Load
- Check file permissions on configuration directory
- Verify configuration file is valid JSON
- Check for backup files if main configuration is corrupted

### GRBL Sync Issues
- Verify serial connection is working
- Check GRBL controller is responding to commands
- Ensure baud rate matches controller settings

### Validation Failures
- Review validation error messages for specific issues
- Check configuration values against schema requirements
- Verify GRBL settings are within acceptable ranges

### Backup/Restore Problems
- Check available disk space
- Verify backup directory permissions
- Ensure backup files are not corrupted