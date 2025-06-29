/**
 * App Router Tests
 * 
 * Tests for the application routing logic and screen navigation.
 * 
 * @module AppRouter.test
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { AppRouter } from '../AppRouter.jsx';
import { AppStateProvider } from '../../contexts/AppStateContext.js';

// Mock all screen components
jest.mock('../../features/main-menu/index.js', () => ({
  MainMenuScreen: () => 'MainMenuScreen'
}));

jest.mock('../../features/connection/index.js', () => ({
  ConnectionScreen: () => 'ConnectionScreen'
}));

jest.mock('../../features/gcode-execution/index.js', () => ({
  GcodeExecutionScreen: () => 'GcodeExecutionScreen'
}));

jest.mock('../../features/file-browser/index.js', () => ({
  FileBrowserScreen: () => 'FileBrowserScreen'
}));

jest.mock('../../features/job-progress/index.js', () => ({
  JobProgressScreen: () => 'JobProgressScreen'
}));

jest.mock('../../features/manual-control/index.js', () => ({
  ManualControlScreen: () => 'ManualControlScreen'
}));

jest.mock('../../features/settings/index.js', () => ({
  SettingsScreen: () => 'SettingsScreen'
}));

// Mock shared components
jest.mock('../../shared/components/StatusBar.jsx', () => ({
  StatusBar: () => 'StatusBar'
}));

jest.mock('../../shared/components/EmergencyStopModal.jsx', () => ({
  EmergencyStopModal: () => 'EmergencyStopModal'
}));

// Helper to render with context
const renderWithContext = (currentScreen = 'main-menu') => {
  const MockAppStateProvider = ({ children }) => {
    return (
      <AppStateProvider value={{ currentScreen }}>
        {children}
      </AppStateProvider>
    );
  };
  
  return render(
    <MockAppStateProvider>
      <AppRouter />
    </MockAppStateProvider>
  );
};

describe('AppRouter', () => {
  test('should render main menu by default', () => {
    const { lastFrame } = renderWithContext('main-menu');
    expect(lastFrame()).toContain('MainMenuScreen');
  });
  
  test('should render connection screen', () => {
    const { lastFrame } = renderWithContext('connection');
    expect(lastFrame()).toContain('ConnectionScreen');
  });
  
  test('should render gcode execution screen', () => {
    const { lastFrame } = renderWithContext('gcode-execution');
    expect(lastFrame()).toContain('GcodeExecutionScreen');
  });
  
  test('should render file browser screen', () => {
    const { lastFrame } = renderWithContext('file-browser');
    expect(lastFrame()).toContain('FileBrowserScreen');
  });
  
  test('should render job progress screen', () => {
    const { lastFrame } = renderWithContext('job-progress');
    expect(lastFrame()).toContain('JobProgressScreen');
  });
  
  test('should render manual control screen', () => {
    const { lastFrame } = renderWithContext('manual-control');
    expect(lastFrame()).toContain('ManualControlScreen');
  });
  
  test('should render settings screen', () => {
    const { lastFrame } = renderWithContext('settings');
    expect(lastFrame()).toContain('SettingsScreen');
  });
  
  test('should fallback to main menu for unknown screen', () => {
    const { lastFrame } = renderWithContext('unknown-screen');
    expect(lastFrame()).toContain('MainMenuScreen');
  });
  
  test('should always include status bar and emergency stop modal', () => {
    const { lastFrame } = renderWithContext('main-menu');
    expect(lastFrame()).toContain('StatusBar');
    expect(lastFrame()).toContain('EmergencyStopModal');
  });
});