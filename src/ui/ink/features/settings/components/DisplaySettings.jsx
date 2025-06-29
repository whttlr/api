/**
 * Display Settings Component
 * 
 * Configuration interface for UI appearance and display preferences.
 * 
 * @module DisplaySettings
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Display Settings Component
 * Interface for display and UI configuration
 */
export function DisplaySettings({ 
  settings = {}, 
  onUpdate = () => {} 
}) {
  
  const {
    theme = 'dark',
    showTooltips = true,
    showGrid = true,
    showAxes = true,
    refreshRate = 100,
    logLevel = 'info',
    autoScroll = true
  } = settings;
  
  const themes = [
    { value: 'dark', label: 'Dark Theme' },
    { value: 'light', label: 'Light Theme' },
    { value: 'high-contrast', label: 'High Contrast' }
  ];
  
  const logLevels = [
    { value: 'debug', label: 'Debug (Verbose)' },
    { value: 'info', label: 'Info (Normal)' },
    { value: 'warn', label: 'Warnings Only' },
    { value: 'error', label: 'Errors Only' }
  ];
  
  return (
    <Box flexDirection="column">
      <Text bold color="magenta" marginBottom={1}>🎨 Display & Interface</Text>
      
      {/* Theme Selection */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1} paddingY={1}>
          <Text bold color="magenta" marginBottom={1}>Theme</Text>
          
          <Box flexDirection="column" gap={1}>
            {themes.map((themeOption, index) => (
              <Text key={themeOption.value}>
                [T{index + 1}] <Text color={theme === themeOption.value ? "cyan" : "white"}>
                  {theme === themeOption.value ? "● " : "○ "}
                  {themeOption.label}
                </Text>
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
      
      {/* UI Options */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1} paddingY={1}>
          <Text bold color="blue" marginBottom={1}>Interface Options</Text>
          
          <Box flexDirection="column" gap={1}>
            <Text>
              [1] Tooltips: <Text color={showTooltips ? "green" : "red"}>
                {showTooltips ? "✓ Enabled" : "✗ Disabled"}
              </Text>
            </Text>
            <Text>
              [2] Grid: <Text color={showGrid ? "green" : "red"}>
                {showGrid ? "✓ Visible" : "✗ Hidden"}
              </Text>
            </Text>
            <Text>
              [3] Axes: <Text color={showAxes ? "green" : "red"}>
                {showAxes ? "✓ Visible" : "✗ Hidden"}
              </Text>
            </Text>
            <Text>
              [4] Auto-scroll: <Text color={autoScroll ? "green" : "red"}>
                {autoScroll ? "✓ Enabled" : "✗ Disabled"}
              </Text>
            </Text>
          </Box>
        </Box>
      </Box>
      
      {/* Performance Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1} paddingY={1}>
          <Text bold color="green" marginBottom={1}>Performance</Text>
          
          <Box flexDirection="column" gap={1}>
            <Text>Refresh Rate: {refreshRate}ms</Text>
            <Text dimColor>[R] Adjust refresh rate</Text>
          </Box>
        </Box>
      </Box>
      
      {/* Logging Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} paddingY={1}>
          <Text bold color="yellow" marginBottom={1}>Logging</Text>
          
          <Box flexDirection="column" gap={1}>
            {logLevels.map((level, index) => (
              <Text key={level.value}>
                [L{index + 1}] <Text color={logLevel === level.value ? "cyan" : "white"}>
                  {logLevel === level.value ? "● " : "○ "}
                  {level.label}
                </Text>
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
      
      {/* Current Status */}
      <Box marginTop={1}>
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
          <Text bold color="white" marginBottom={1}>Current Display Settings</Text>
          <Text>Theme: {theme}</Text>
          <Text>Refresh: {refreshRate}ms</Text>
          <Text>Log Level: {logLevel}</Text>
          <Text>UI Elements: {[showTooltips && "Tooltips", showGrid && "Grid", showAxes && "Axes"].filter(Boolean).join(", ") || "None"}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default DisplaySettings;