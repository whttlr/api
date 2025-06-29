/**
 * Reporting Services Public API
 * 
 * Exports structured logging and reporting capabilities.
 */

export { StructuredLogger, structuredLogger } from './StructuredLogger.js';
export {
  createDiagnosticReport,
  createAlarmReport,
  createFileExecutionSummary,
  createQueryReport,
  createMachineStatus,
  createHealthScore
} from './ReportStructures.js';

// Output modes for structured logger
export const OUTPUT_MODES = {
  CONSOLE: 'console',
  JSON: 'json',
  API: 'api',
  FILE: 'file'
};

// Report types
export const REPORT_TYPES = {
  DIAGNOSTIC: 'diagnostic_report',
  ALARM: 'alarm_report',
  FILE_EXECUTION: 'file_execution_summary',
  QUERY: 'query_report',
  MACHINE_STATUS: 'machine_status',
  HEALTH_SCORE: 'health_score'
};