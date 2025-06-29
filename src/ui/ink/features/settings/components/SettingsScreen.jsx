/**
 * Settings Screen Component
 * 
 * Main settings interface for managing machine configuration, units,
 * safety parameters, and application preferences.
 * 
 * @module SettingsScreen
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../../../shared/contexts/AppStateContext.jsx';
import { useSettings } from '../../../shared/contexts/SettingsContext.jsx';
import { useToast } from '../../../shared/contexts/ToastContext.jsx';
import { MachineSettings } from './MachineSettings.jsx';
import { SafetySettings } from './SafetySettings.jsx';
import { UnitsSettings } from './UnitsSettings.jsx';
import { DisplaySettings } from './DisplaySettings.jsx';
import { SettingsNavigation } from './SettingsNavigation.jsx';
import { useSettingsNavigation } from '../hooks/useSettingsNavigation.js';

/**
 * Settings Screen Component
 * Complete settings management interface
 */
export function SettingsScreen() {
  const { goBack } = useAppState();
  const { state: settings, updateUserSettings, updateMachineSettings, resetToDefaults } = useSettings();
  const { showToast } = useToast();
  
  const {
    currentSection,
    sections,
    navigateToSection,
    handleInput
  } = useSettingsNavigation();
  
  /**
   * Handle settings update
   * @param {string} section - Settings section
   * @param {Object} updates - Settings updates
   */
  const handleSettingsUpdate = (section, updates) => {
    try {
      if (section === 'user') {
        updateUserSettings(updates);
      } else if (section === 'machine') {
        updateMachineSettings(updates);
      } else {
        throw new Error(`Unknown settings section: ${section}`);
      }
      showToast(`${section} settings updated`, 'success');
    } catch (error) {
      showToast(`Failed to update settings: ${error.message}`, 'error');
    }
  };
  
  /**
   * Handle settings reset
   */
  const handleReset = () => {
    try {
      resetToDefaults();
      showToast('Settings reset to defaults', 'success');
    } catch (error) {
      showToast(`Failed to reset settings: ${error.message}`, 'error');
    }
  };
  
  /**
   * Render current settings section
   */
  const renderCurrentSection = () => {
    // Ensure settings object exists and has proper structure
    if (!settings) {
      return (
        <Box>
          <Text color="red">Settings not loaded. Please try again.</Text>
        </Box>
      );
    }

    switch (currentSection) {
      case 'machine':
        return (
          <MachineSettings
            settings={settings.machine || {}}
            onUpdate={(updates) => handleSettingsUpdate('machine', updates)}
          />
        );
      
      case 'safety':
        return (
          <SafetySettings
            settings={settings.safety || {}}
            onUpdate={(updates) => handleSettingsUpdate('safety', updates)}
          />
        );
      
      case 'units':
        return (
          <UnitsSettings
            settings={settings.units || {}}
            onUpdate={(updates) => handleSettingsUpdate('units', updates)}
          />
        );
      
      case 'display':
        return (
          <DisplaySettings
            settings={settings.display || {}}
            onUpdate={(updates) => handleSettingsUpdate('display', updates)}
          />
        );
      
      default:
        return null;
    }
  };
  
  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box marginBottom={1} paddingX={1}>
        <Box flexDirection="column">
          <Text bold color="cyan">⚙️ Settings</Text>
          <Text dimColor>Configure machine and application settings</Text>
        </Box>
      </Box>
      
      {/* Main Content */}
      <Box flex={1} flexDirection="row">
        {/* Sidebar - Navigation */}
        <Box width="50%" marginRight={1}>
          <SettingsNavigation
            sections={sections}
            currentSection={currentSection}
            onNavigate={navigateToSection}
            onInput={handleInput}
          />
        </Box>
        
        {/* Content Area */}
        <Box flex={1} paddingX={1}>
          {renderCurrentSection()}
        </Box>
      </Box>
      
      {/* Footer Actions */}
      <Box marginTop={1} paddingX={1}>
        <Box gap={2}>
          <Box borderStyle="single" borderColor="gray" paddingX={1}>
            <Text>[R] Reset All</Text>
          </Box>
          <Box borderStyle="single" borderColor="red" paddingX={1}>
            <Text>[ESC] Back</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default SettingsScreen;