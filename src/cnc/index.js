/**
 * Core Module Public API
 * 
 * Exports the main GcodeSender class and core module components.
 */

// Main class
export { GcodeSender, CONFIG } from './GcodeSender.js';

// Individual modules (for advanced usage)
export { ConnectionManager, CONNECTION_STATES } from './connection/index.js';
export { CommandExecutor, COMMAND_TYPES, EXECUTION_MODES } from './commands/index.js';
export { QueryManager, QUERY_TYPES, MACHINE_STATES } from './queries/index.js';
export { FileProcessor, FILE_TYPES, VALIDATION_STATES, EXECUTION_STATES } from './files/index.js';
export { DiagnosticsManager, DIAGNOSTIC_TYPES, HEALTH_SCORES, TEST_RESULTS } from './diagnostics/index.js';
export { AlarmManager, ALARM_TYPES, ALARM_SEVERITY, RECOVERY_STATUS } from './alarms/index.js';

// Configuration
export { Config } from './config.js';