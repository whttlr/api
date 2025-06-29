import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';
import { SelectableList } from '../../../shared/components/interactive/SelectableList.jsx';
import { MachineSettings } from '../components/MachineSettings.jsx';
import { UnitsToggle } from '../components/UnitsToggle.jsx';
import { SettingsForm } from '../components/SettingsForm.jsx';
import { StatusBar } from '../../navigation/components/StatusBar.jsx';
import { useSettings } from '../hooks/useSettings.js';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';

const TABS = [
  { 
    id: 'machine', 
    title: 'Machine Settings',
    description: 'Configure machine limits, speeds, and hardware',
    icon: '🔧',
    key: '1' 
  },
  { 
    id: 'user', 
    title: 'User Preferences',
    description: 'Personal settings, units, and interface options',
    icon: '👤',
    key: '2' 
  },
  { 
    id: 'connection', 
    title: 'Connection Settings',
    description: 'Serial port, baud rate, and connection options',
    icon: '🔌',
    key: '3' 
  },
  { 
    id: 'interface', 
    title: 'Interface Settings',
    description: 'Display options, themes, and UI behavior',
    icon: '🎨',
    key: '4' 
  }
];

export function SettingsScreen() {
  const [activeTab, setActiveTab] = useState('machine');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const {
    settings,
    isLoading,
    isDirty,
    validationResult,
    saveSettings,
    resetSettings,
    updateSetting,
    hasUnsavedChanges
  } = useSettings();
  
  const { goBack } = useAppState();

  useInput((input, key) => {
    if (showSaveConfirm || showResetConfirm) {
      if (input === 'y') {
        if (showSaveConfirm) {
          handleSave();
        } else if (showResetConfirm) {
          handleReset();
        }
        setShowSaveConfirm(false);
        setShowResetConfirm(false);
      } else if (input === 'n' || key.escape) {
        setShowSaveConfirm(false);
        setShowResetConfirm(false);
      }
      return;
    }

    if (key.escape) {
      if (hasUnsavedChanges()) {
        setShowSaveConfirm(true);
      } else {
        goBack();
      }
    } else if (key.ctrl && input === 's') {
      setShowSaveConfirm(true);
    } else if (key.ctrl && input === 'r') {
      setShowResetConfirm(true);
    }
    // Note: SelectableList now handles tab navigation and number shortcuts
  });

  const handleTabSelect = (selectedTab) => {
    setActiveTab(selectedTab.id);
  };

  const handleSave = async () => {
    const success = await saveSettings();
    if (success) {
      goBack();
    }
  };

  const handleReset = () => {
    resetSettings();
  };

  const getUserFields = () => [
    {
      path: 'user.units',
      label: 'Units',
      description: 'Measurement units',
      type: 'string',
      editable: false
    },
    {
      path: 'user.theme',
      label: 'Theme',
      description: 'UI theme',
      type: 'string',
      validate: (value) => ({
        valid: ['default', 'monochrome'].includes(value),
        error: 'Must be "default" or "monochrome"'
      })
    },
    {
      path: 'user.autoHome',
      label: 'Auto Home',
      description: 'Home machine on connection',
      type: 'boolean'
    },
    {
      path: 'user.confirmDestructive',
      label: 'Confirm Destructive Actions',
      description: 'Confirm dangerous operations',
      type: 'boolean'
    },
    {
      path: 'user.logLevel',
      label: 'Log Level',
      description: 'Logging verbosity',
      type: 'string',
      validate: (value) => ({
        valid: ['debug', 'info', 'warn', 'error'].includes(value),
        error: 'Must be debug, info, warn, or error'
      })
    },
    {
      path: 'user.statusPollingInterval',
      label: 'Status Polling Interval (ms)',
      description: 'How often to check machine status',
      type: 'number',
      validate: (value) => ({
        valid: value >= 50 && value <= 1000,
        error: 'Must be between 50 and 1000 milliseconds'
      })
    }
  ];

  const getConnectionFields = () => [
    {
      path: 'connection.baudRate',
      label: 'Baud Rate',
      description: 'Serial communication speed',
      type: 'number',
      validate: (value) => ({
        valid: [9600, 19200, 38400, 57600, 115200, 230400].includes(value),
        error: 'Must be a standard baud rate'
      })
    },
    {
      path: 'connection.autoConnect',
      label: 'Auto Connect',
      description: 'Connect automatically on startup',
      type: 'boolean'
    },
    {
      path: 'connection.defaultPort',
      label: 'Default Port',
      description: 'Default serial port',
      type: 'string'
    },
    {
      path: 'connection.timeout',
      label: 'Connection Timeout (ms)',
      description: 'Connection timeout',
      type: 'number'
    }
  ];

  const getInterfaceFields = () => [
    {
      path: 'interface.showAdvancedControls',
      label: 'Show Advanced Controls',
      description: 'Display advanced machine controls',
      type: 'boolean'
    },
    {
      path: 'interface.compactMode',
      label: 'Compact Mode',
      description: 'Use compact UI layout',
      type: 'boolean'
    },
    {
      path: 'interface.showStatusHistory',
      label: 'Show Status History',
      description: 'Display status history',
      type: 'boolean'
    },
    {
      path: 'interface.maxHistorySize',
      label: 'Max History Size',
      description: 'Maximum status history entries',
      type: 'number',
      validate: (value) => ({
        valid: value >= 10 && value <= 1000,
        error: 'Must be between 10 and 1000'
      })
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'machine':
        return (
          <MachineSettings
            settings={settings}
            onUpdate={updateSetting}
            validationResult={validationResult}
          />
        );
      case 'user':
        return (
          <Box flexDirection="column">
            <Box marginBottom={3}>
              <UnitsToggle
                currentUnits={settings.user.units}
                onUnitsChange={(units) => updateSetting('user.units', units)}
              />
            </Box>
            <SettingsForm
              settings={settings}
              onUpdate={updateSetting}
              title="User Preferences"
              fields={getUserFields()}
              validationResult={validationResult}
            />
          </Box>
        );
      case 'connection':
        return (
          <SettingsForm
            settings={settings}
            onUpdate={updateSetting}
            title="Connection Settings"
            fields={getConnectionFields()}
            validationResult={validationResult}
          />
        );
      case 'interface':
        return (
          <SettingsForm
            settings={settings}
            onUpdate={updateSetting}
            title="Interface Settings"
            fields={getInterfaceFields()}
            validationResult={validationResult}
          />
        );
      default:
        return null;
    }
  };

  if (showSaveConfirm) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
        <Box marginBottom={2}>
          <Text bold color="yellow">
            {hasUnsavedChanges() ? 'Save Changes?' : 'Save Settings?'}
          </Text>
        </Box>
        <Box>
          <Text>
            Press Y to save and exit, N to discard changes, Esc to cancel
          </Text>
        </Box>
      </Box>
    );
  }

  if (showResetConfirm) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
        <Box marginBottom={2}>
          <Text bold color="red">
            Reset to Default Settings?
          </Text>
        </Box>
        <Box marginBottom={1}>
          <Text>
            This will discard all current settings and restore defaults.
          </Text>
        </Box>
        <Box>
          <Text>
            Press Y to confirm, N or Esc to cancel
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color="green">
            ⚙️ Settings
            {isDirty && <Text color="yellow"> (Modified)</Text>}
            {isLoading && <Text color="blue"> (Loading...)</Text>}
          </Text>
        </Box>

        <Box marginBottom={2}>
          <Text bold color="cyan" marginBottom={1}>
            Settings Categories:
          </Text>
          <SelectableList
            items={TABS}
            selectedId={activeTab}
            onSelect={handleTabSelect}
            variant="compact"
            showIcons={true}
            showDescriptions={true}
            keyboardEnabled={true}
            emptyMessage="No settings categories available"
          />
        </Box>

        {validationResult && !validationResult.isValid && (
          <Box marginBottom={2}>
            <Text color="red" bold>
              Validation Errors: {validationResult.errors.length}
            </Text>
          </Box>
        )}

        <Box flex={1}>
          {renderTabContent()}
        </Box>

        <Box marginTop={2} gap={2}>
          <Button
            onPress={() => setShowSaveConfirm(true)}
            variant="primary"
            disabled={!isDirty && !hasUnsavedChanges()}
          >
            Save
          </Button>

          <Button
            onPress={() => setShowResetConfirm(true)}
            variant="danger"
          >
            Reset
          </Button>

          <Button
            onPress={goBack}
            variant="default"
          >
            {hasUnsavedChanges() ? 'Cancel' : 'Back'}
          </Button>
        </Box>

        <Box marginTop={1}>
          <Text dimColor>
            Navigation: ↑↓ Navigate categories | Enter - Select | 1-4 Quick select | Ctrl+S Save | Ctrl+R Reset | ESC Back
          </Text>
        </Box>
      </Box>
      
      <StatusBar />
    </Box>
  );
}