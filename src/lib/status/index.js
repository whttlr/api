/**
 * Status Service Module Public API
 * 
 * Exports status parsing and query functionality.
 */

export {
  parseParserState,
  getStatus,
  queryMachineStatus,
  queryGrblSettings,
  queryCoordinateSystems,
  queryParserState,
  parseMachineStatus,
  getLimitsInfo,
  displayLimitsInfo
} from './StatusService.js';

// Status parsing constants
export const STATUS_PATTERNS = {
  MACHINE_STATUS: /^<([^|>]+)\|([^>]+)>$/,
  POSITION: /([MWCS]?)Pos:([-\d.,]+)/,
  FEED_SPINDLE: /FS:([\d.,]+)/
};