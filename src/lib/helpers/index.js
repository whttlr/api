/**
 * Helpers Service Module Public API
 * 
 * Exports GRBL communication and utility helpers.
 */

export {
  initializeGRBL,
  requiresHoming,
  ensureHomed,
  sendRawGcode,
  handleResponse,
  parseResponse,
  categorizeResponse,
  checkSafeLimits
} from './HelpersService.js';

// Response categories
export const RESPONSE_CATEGORIES = {
  OK: 'ok',
  ERROR: 'error',
  ALARM: 'alarm',
  STATUS: 'status',
  SETTING: 'setting',
  UNKNOWN: 'unknown'
};