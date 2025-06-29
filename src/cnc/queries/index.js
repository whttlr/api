/**
 * Queries Module Public API
 * 
 * Exports the public interface for machine status and settings queries.
 */

export { QueryManager } from './QueryManager.js';

// Re-export query-related constants
export const QUERY_TYPES = {
  MACHINE_STATUS: 'machine_status',
  GRBL_SETTINGS: 'grbl_settings',
  COORDINATE_SYSTEMS: 'coordinate_systems',
  PARSER_STATE: 'parser_state',
  LIMITS_INFO: 'limits_info'
};

export const MACHINE_STATES = {
  IDLE: 'Idle',
  RUN: 'Run',
  HOLD: 'Hold',
  JOG: 'Jog',
  ALARM: 'Alarm',
  DOOR: 'Door',
  CHECK: 'Check',
  HOME: 'Home',
  SLEEP: 'Sleep'
};