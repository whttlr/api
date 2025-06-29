/**
 * Manual Control Feature
 * 
 * Complete manual control functionality for CNC machine jogging, positioning,
 * and work coordinate system management.
 * 
 * @module ManualControlFeature
 */

// Main component
export { ManualControlScreen } from './components/ManualControlScreen.jsx';

// Sub-components
export { PositionDisplay } from './components/PositionDisplay.jsx';
export { JogControls } from './components/JogControls.jsx';
export { WorkCoordinates } from './components/WorkCoordinates.jsx';
export { MovementInstructions } from './components/MovementInstructions.jsx';

// Hooks
export { useManualControl } from './hooks/useManualControl.js';

// Services
export { 
  ManualControlService,
  formatPosition,
  getDisplayUnit,
  buildJogCommand,
  parseDirection,
  validateJogParameters,
  calculateWorkPosition,
  getJogSpeeds
} from './services/ManualControlService.js';

// Default export
export { ManualControlScreen as default } from './components/ManualControlScreen.jsx';