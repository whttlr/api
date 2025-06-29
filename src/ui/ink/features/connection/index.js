/**
 * Connection Feature Index
 * 
 * Exports all connection-related components, hooks, and services.
 * 
 * @module ConnectionFeature
 */

// Components
export { ConnectionScreen } from './components/ConnectionScreen.jsx';
export { PortSelector } from './components/PortSelector.jsx';
export { ConnectionControls } from './components/ConnectionControls.jsx';

// Hooks
export { 
  useConnection,
  usePortScanning 
} from './hooks/useConnection.js';

// Services
export { 
  ConnectionService,
  validatePort,
  getRecommendedBaudRates,
  formatPortDisplayName,
  getConnectionTips,
  analyzeConnectionHealth
} from './services/ConnectionService.js';

// Default export
export { ConnectionScreen as default } from './components/ConnectionScreen.jsx';