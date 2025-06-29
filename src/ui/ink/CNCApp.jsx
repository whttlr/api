/**
 * CNC Application Root Component
 * 
 * Main application component that provides all context providers and
 * renders the application router. This replaces the monolithic 
 * cnc-integrated-app.jsx with a clean, modular architecture.
 * 
 * @module CNCApp
 */

import React from 'react';
import { Box } from 'ink';
import { useInput } from 'ink';

// Context providers
import { AppStateProvider } from './shared/contexts/AppStateContext.jsx';
import { ToastProvider } from './shared/contexts/ToastContext.jsx';
import { CNCProvider } from './shared/contexts/CNCContext.jsx';
import { SettingsProvider } from './shared/contexts/SettingsContext.jsx';

// Router
import { AppRouter } from './router/AppRouter.jsx';

// Shared components  
import { LoadingSpinner } from './shared/components/feedback/LoadingSpinner.jsx';
import { useAppState } from './shared/contexts/AppStateContext.jsx';
import { useSettings } from './shared/contexts/SettingsContext.jsx';

/**
 * App Content Component
 * Handles global keyboard shortcuts and renders the router
 */
function AppContent() {
  const { state, showSidebar, hideSidebar } = useAppState();
  const { toggleUnits } = useSettings();
  
  // Global keyboard shortcuts
  useInput((input, key) => {
    // Toggle help sidebar with '?'
    if (input === '?') {
      if (state.sidebar.isOpen) {
        hideSidebar();
      } else {
        showSidebar({ type: 'help', title: 'Help' });
      }
    }
    
    // Toggle units with 'u'
    if (input === 'u') {
      toggleUnits();
    }
  });
  
  return (
    <Box flexDirection="column" height="100%">
      {/* Application router */}
      <AppRouter />
    </Box>
  );
}

/**
 * CNC Application Root Component
 * Provides all context and renders the main application
 */
export function CNCApp() {
  return (
    <AppStateProvider>
      <SettingsProvider>
        <CNCProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </CNCProvider>
      </SettingsProvider>
    </AppStateProvider>
  );
}

export default CNCApp;