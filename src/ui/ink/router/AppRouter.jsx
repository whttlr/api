/**
 * App Router Component
 * 
 * Central routing logic for the CNC application. Manages screen navigation
 * and renders the appropriate feature components based on current state.
 * 
 * @module AppRouter
 */

import React from 'react';
import { Box } from 'ink';
import { useAppState } from '../shared/contexts/AppStateContext.jsx';

// Feature screens
import { MainMenuScreen } from '../features/main-menu/index.js';
import { ConnectionScreen } from '../features/connection/index.js';
import { GCodeExecutionScreen } from '../features/gcode-execution/index.js';
import { FileBrowserScreen } from '../features/file-browser/index.js';
import { JobProgressScreen } from '../features/job-progress/index.js';
import { ManualControlScreen } from '../features/manual-control/index.js';
import { SettingsScreen } from '../features/settings/index.js';

// Shared components
import { StatusBar } from '../shared/components/layout/StatusBar.jsx';
import { EmergencyStopModal } from '../shared/components/modals/EmergencyStopModal.jsx';

/**
 * App Router Component
 * Renders the current screen based on application state
 */
export function AppRouter() {
  const { state } = useAppState();
  const { currentScreen } = state;
  
  /**
   * Render the current screen component
   */
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'main-menu':
        return <MainMenuScreen />;
      
      case 'connection':
        return <ConnectionScreen />;
      
      case 'gcode-execution':
        return <GCodeExecutionScreen />;
      
      case 'file-browser':
        return <FileBrowserScreen />;
      
      case 'job-progress':
        return <JobProgressScreen />;
      
      case 'manual-control':
        return <ManualControlScreen />;
      
      case 'settings':
        return <SettingsScreen />;
      
      default:
        return <MainMenuScreen />;
    }
  };
  
  return (
    <Box flexDirection="column" height="100%">
      {/* Main content area */}
      <Box flex={1}>
        {renderCurrentScreen()}
      </Box>
      
      {/* Status bar */}
      <StatusBar />
      
      {/* Emergency stop modal (overlay) */}
      <EmergencyStopModal />
    </Box>
  );
}

export default AppRouter;