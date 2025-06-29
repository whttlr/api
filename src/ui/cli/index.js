/**
 * Interfaces Module Public API
 * 
 * Exports user interface components for the CNC application.
 */

export { main as cliMain } from './cli.js';

// Interface types
export const INTERFACE_TYPES = {
  CLI: 'cli',
  WEB: 'web',
  API: 'api'
};