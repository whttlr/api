/**
 * Main Screen Component
 * 
 * Full-screen layout containing the main menu and status bar.
 * Serves as the primary entry point for the application.
 * 
 * @module MainScreen
 */

import React from 'react';
import { Box } from 'ink';
import { MainMenu } from './MainMenu.jsx';

/**
 * Main Screen Component
 * Layout wrapper for the main menu (StatusBar provided by AppRouter)
 */
export function MainScreen() {
  return (
    <Box flex={1} justifyContent="center" alignItems="center">
      <MainMenu />
    </Box>
  );
}

// Default export
export default MainScreen;