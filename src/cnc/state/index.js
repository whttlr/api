/**
 * CNC State Management Module
 * 
 * Provides comprehensive state management for CNC machines using a component-based architecture.
 * This module exports all state management components and utilities.
 */

import { MachineStateManager } from './MachineStateManager.js';
import { PositionManager } from './PositionManager.js';
import { CoordinateSystemManager } from './CoordinateSystemManager.js';
import { ModalGroupManager } from './ModalGroupManager.js';
import { ToolManager } from './ToolManager.js';
import { StateSynchronizer } from './StateSynchronizer.js';
import { StateMonitor } from './StateMonitor.js';
import { StateQueryManager } from './StateQueryManager.js';
import { StateComparator } from './StateComparator.js';
import { ConflictResolver } from './ConflictResolver.js';

// Main state managers (orchestrate components)
export { MachineStateManager };
export { StateSynchronizer };

// Machine state component managers
export { PositionManager };
export { CoordinateSystemManager };
export { ModalGroupManager };
export { ToolManager };

// State synchronization component managers
export { StateMonitor };
export { StateQueryManager };
export { StateComparator };
export { ConflictResolver };

// Convenience factory functions
export function createMachineStateManager(config = {}) {
  return new MachineStateManager(config);
}

export function createStateSynchronizer(stateManager, commandManager, config = {}) {
  return new StateSynchronizer(stateManager, commandManager, config);
}

// Default export is the main state manager
export default MachineStateManager;