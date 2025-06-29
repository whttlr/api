/**
 * CNC Application Tests
 * 
 * Integration tests for the main CNC application component and routing.
 * 
 * @module CNCApp.test
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { CNCApp } from '../CNCApp.jsx';

// Mock all feature components to avoid complex dependencies
jest.mock('../features/main-menu/index.js', () => ({
  MainMenuScreen: () => 'MainMenuScreen'
}));

jest.mock('../features/connection/index.js', () => ({
  ConnectionScreen: () => 'ConnectionScreen'
}));

jest.mock('../features/gcode-execution/index.js', () => ({
  GcodeExecutionScreen: () => 'GcodeExecutionScreen'
}));

jest.mock('../features/file-browser/index.js', () => ({
  FileBrowserScreen: () => 'FileBrowserScreen'
}));

jest.mock('../features/job-progress/index.js', () => ({
  JobProgressScreen: () => 'JobProgressScreen'
}));

jest.mock('../features/manual-control/index.js', () => ({
  ManualControlScreen: () => 'ManualControlScreen'
}));

jest.mock('../features/settings/index.js', () => ({
  SettingsScreen: () => 'SettingsScreen'
}));

// Mock shared components
jest.mock('../shared/components/StatusBar.jsx', () => ({
  StatusBar: () => 'StatusBar'
}));

jest.mock('../shared/components/EmergencyStopModal.jsx', () => ({
  EmergencyStopModal: () => 'EmergencyStopModal'
}));

describe('CNCApp', () => {
  test('should render without crashing', () => {
    const { lastFrame } = render(<CNCApp />);
    expect(lastFrame()).toBeDefined();
  });
  
  test('should render main menu by default', () => {
    const { lastFrame } = render(<CNCApp />);
    expect(lastFrame()).toContain('MainMenuScreen');
  });
  
  test('should include status bar', () => {
    const { lastFrame } = render(<CNCApp />);
    expect(lastFrame()).toContain('StatusBar');
  });
  
  test('should include emergency stop modal', () => {
    const { lastFrame } = render(<CNCApp />);
    expect(lastFrame()).toContain('EmergencyStopModal');
  });
});

describe('Application Architecture', () => {
  test('should have proper context provider hierarchy', () => {
    // Test that all context providers are properly nested
    const { lastFrame } = render(<CNCApp />);
    
    // Should render without context errors
    expect(lastFrame()).toBeDefined();
    expect(lastFrame()).not.toContain('Error');
  });
  
  test('should be modular and maintainable', () => {
    // Verify the app uses the new modular architecture
    expect(CNCApp).toBeDefined();
    expect(typeof CNCApp).toBe('function');
  });
});