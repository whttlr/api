/**
 * Settings Screen Standardization Test
 * 
 * Tests to verify the Settings page now uses standardized SelectableList 
 * patterns consistent with MainMenu, FileBrowser, and Connection Management.
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { SettingsScreen } from '../screens/SettingsScreen.jsx';

// Mock the contexts and components
jest.mock('../../../shared/context/AppStateContext.jsx', () => ({
  useAppState: () => ({
    goBack: jest.fn()
  })
}));

jest.mock('../hooks/useSettings.js', () => ({
  useSettings: () => ({
    settings: {
      user: { units: 'mm' },
      machine: {},
      connection: {},
      interface: {}
    },
    isLoading: false,
    isDirty: false,
    validationResult: { isValid: true, errors: [] },
    saveSettings: jest.fn(),
    resetSettings: jest.fn(),
    updateSetting: jest.fn(),
    hasUnsavedChanges: () => false
  })
}));

jest.mock('../../../shared/components/interactive/SelectableList.jsx', () => ({
  SelectableList: ({ items, selectedId, onSelect, variant, showIcons, showDescriptions }) => (
    <div data-testid="settings-tab-selector">
      <div data-testid="uses-selectable-list">✓ SelectableList</div>
      <div data-testid="variant">{variant}</div>
      <div data-testid="show-icons">{showIcons ? 'true' : 'false'}</div>
      <div data-testid="show-descriptions">{showDescriptions ? 'true' : 'false'}</div>
      {items.map((item, index) => (
        <div key={item.id} data-testid={`tab-${index}`}>
          {selectedId === item.id ? '→ ' : '  '}
          [{item.key}] {item.icon} {item.title}
        </div>
      ))}
    </div>
  )
}));

jest.mock('../../../shared/components/Button.jsx', () => ({
  Button: ({ children, variant, onPress, disabled }) => (
    <button data-testid={`button-${variant}`} disabled={disabled}>
      {children}
    </button>
  )
}));

jest.mock('../components/MachineSettings.jsx', () => ({
  MachineSettings: () => <div data-testid="machine-settings">Machine Settings Content</div>
}));

jest.mock('../components/UnitsToggle.jsx', () => ({
  UnitsToggle: () => <div data-testid="units-toggle">Units Toggle</div>
}));

jest.mock('../components/SettingsForm.jsx', () => ({
  SettingsForm: ({ title }) => <div data-testid="settings-form">{title}</div>
}));

jest.mock('../../navigation/components/StatusBar.jsx', () => ({
  StatusBar: () => <div data-testid="status-bar">Status Bar</div>
}));

describe('Settings Screen Standardization', () => {
  test('should render without crashing', () => {
    const { lastFrame } = render(<SettingsScreen />);
    expect(lastFrame()).toBeDefined();
  });

  test('should display settings title', () => {
    const { lastFrame } = render(<SettingsScreen />);
    expect(lastFrame()).toContain('⚙️ Settings');
  });

  test('should use standardized SelectableList for tab navigation', () => {
    const { getByTestId } = render(<SettingsScreen />);
    expect(getByTestId('settings-tab-selector')).toBeDefined();
    expect(getByTestId('uses-selectable-list')).toBeDefined();
  });

  test('should configure SelectableList properly', () => {
    const { getByTestId } = render(<SettingsScreen />);
    
    // Verify SelectableList configuration
    expect(getByTestId('variant')).toHaveTextContent('compact');
    expect(getByTestId('show-icons')).toHaveTextContent('true');
    expect(getByTestId('show-descriptions')).toHaveTextContent('true');
  });

  test('should display all settings tabs with standardized format', () => {
    const { getByTestId } = render(<SettingsScreen />);
    
    // Check that all 4 settings tabs are rendered with standardized format
    expect(getByTestId('tab-0')).toHaveTextContent('→ [1] 🔧 Machine Settings');
    expect(getByTestId('tab-1')).toHaveTextContent('  [2] 👤 User Preferences');
    expect(getByTestId('tab-2')).toHaveTextContent('  [3] 🔌 Connection Settings');
    expect(getByTestId('tab-3')).toHaveTextContent('  [4] 🎨 Interface Settings');
  });

  test('should display standardized navigation instructions', () => {
    const { lastFrame } = render(<SettingsScreen />);
    
    expect(lastFrame()).toContain('↑↓ Navigate categories');
    expect(lastFrame()).toContain('Enter - Select');
    expect(lastFrame()).toContain('1-4 Quick select');
    expect(lastFrame()).toContain('Ctrl+S Save');
    expect(lastFrame()).toContain('Ctrl+R Reset');
    expect(lastFrame()).toContain('ESC Back');
  });

  test('should show settings categories header', () => {
    const { lastFrame } = render(<SettingsScreen />);
    expect(lastFrame()).toContain('Settings Categories:');
  });

  test('should show action buttons', () => {
    const { getByTestId } = render(<SettingsScreen />);
    
    expect(getByTestId('button-primary')).toHaveTextContent('Save');
    expect(getByTestId('button-danger')).toHaveTextContent('Reset');
    expect(getByTestId('button-default')).toHaveTextContent('Back');
  });
});

describe('Settings Screen Consistency', () => {
  test('should use same SelectableList patterns as MainMenu', () => {
    const { getByTestId } = render(<SettingsScreen />);
    
    // Verify consistent patterns with MainMenu:
    // 1. Uses SelectableList component
    expect(getByTestId('uses-selectable-list')).toBeDefined();
    
    // 2. Number shortcuts [1], [2], etc.
    expect(getByTestId('tab-0')).toHaveTextContent('[1]');
    expect(getByTestId('tab-1')).toHaveTextContent('[2]');
    expect(getByTestId('tab-2')).toHaveTextContent('[3]');
    expect(getByTestId('tab-3')).toHaveTextContent('[4]');
    
    // 3. Icons for visual identification
    expect(getByTestId('tab-0')).toHaveTextContent('🔧');
    expect(getByTestId('tab-1')).toHaveTextContent('👤');
    expect(getByTestId('tab-2')).toHaveTextContent('🔌');
    expect(getByTestId('tab-3')).toHaveTextContent('🎨');
  });

  test('should use same visual patterns as other features', () => {
    const { getByTestId, lastFrame } = render(<SettingsScreen />);
    
    // Verify consistent patterns with other features:
    // 1. Selection indicator (→)
    expect(getByTestId('tab-0')).toHaveTextContent('→');
    
    // 2. Arrow navigation instructions
    expect(lastFrame()).toContain('↑↓ Navigate');
    
    // 3. Enter key for selection
    expect(lastFrame()).toContain('Enter - Select');
    
    // 4. ESC for back navigation
    expect(lastFrame()).toContain('ESC Back');
    
    // 5. Number shortcuts documentation
    expect(lastFrame()).toContain('1-4 Quick select');
  });
});

describe('Settings Screen Features', () => {
  test('should maintain all original functionality', () => {
    const { lastFrame, getByTestId } = render(<SettingsScreen />);
    
    // Original features should still be present:
    // 1. Settings title and status
    expect(lastFrame()).toContain('⚙️ Settings');
    
    // 2. Action buttons
    expect(getByTestId('button-primary')).toBeDefined();
    expect(getByTestId('button-danger')).toBeDefined();
    expect(getByTestId('button-default')).toBeDefined();
    
    // 3. Status bar
    expect(getByTestId('status-bar')).toBeDefined();
    
    // 4. Tab content area (would show machine settings by default)
    expect(getByTestId('machine-settings')).toBeDefined();
  });

  test('should support keyboard shortcuts', () => {
    const { lastFrame } = render(<SettingsScreen />);
    
    // Verify keyboard shortcuts are documented
    expect(lastFrame()).toContain('Ctrl+S Save');
    expect(lastFrame()).toContain('Ctrl+R Reset');
  });
});

describe('Settings Tab Categories', () => {
  test('should display all four settings categories', () => {
    const { getByTestId } = render(<SettingsScreen />);
    
    // Verify all 4 categories are present with proper titles
    expect(getByTestId('tab-0')).toHaveTextContent('Machine Settings');
    expect(getByTestId('tab-1')).toHaveTextContent('User Preferences');
    expect(getByTestId('tab-2')).toHaveTextContent('Connection Settings');
    expect(getByTestId('tab-3')).toHaveTextContent('Interface Settings');
  });

  test('should show machine settings as default selected', () => {
    const { getByTestId } = render(<SettingsScreen />);
    
    // Machine Settings should be selected by default (first tab)
    expect(getByTestId('tab-0')).toHaveTextContent('→ [1] 🔧 Machine Settings');
    expect(getByTestId('machine-settings')).toBeDefined();
  });
});