/**
 * Diagnostics Service Module Public API
 * 
 * Exports diagnostic analysis functionality (legacy service functions).
 */

export {
  analyzeDiagnostics,
  analyzeGrblSettings,
  generateRecommendations,
  isMachineReadyForMovement,
  testSmallMovements,
  generateDiagnosticReport
} from './DiagnosticsService.js';

// Diagnostic categories
export const DIAGNOSTIC_CATEGORIES = {
  MACHINE_STATUS: 'machine_status',
  SETTINGS: 'settings',
  MOVEMENT: 'movement',
  CONNECTIVITY: 'connectivity'
};