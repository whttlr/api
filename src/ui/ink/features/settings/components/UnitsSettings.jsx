/**
 * Units Settings Component
 * 
 * Configuration interface for measurement units and display preferences.
 * 
 * @module UnitsSettings
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Units Settings Component
 * Interface for units and measurement configuration
 */
export function UnitsSettings({ 
  settings = {}, 
  onUpdate = () => {} 
}) {
  
  const {
    units = 'metric',
    decimalPlaces = 3,
    displayMode = 'decimal',
    coordinateSystem = 'machine'
  } = settings;
  
  const unitOptions = [
    { value: 'metric', label: 'Metric (mm)', symbol: 'mm' },
    { value: 'imperial', label: 'Imperial (inches)', symbol: 'in' }
  ];
  
  const displayModes = [
    { value: 'decimal', label: 'Decimal (10.5)' },
    { value: 'fractional', label: 'Fractional (10 1/2)' }
  ];
  
  return (
    <Box flexDirection="column">
      <Text bold color="blue" marginBottom={1}>📏 Units & Display</Text>
      
      {/* Units Selection */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1} paddingY={1}>
          <Text bold color="blue" marginBottom={1}>Measurement Units</Text>
          
          <Box flexDirection="column" gap={1}>
            {unitOptions.map((option, index) => (
              <Text key={option.value}>
                [{index + 1}] <Text color={units === option.value ? "cyan" : "white"}>
                  {units === option.value ? "● " : "○ "}
                  {option.label}
                </Text>
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
      
      {/* Display Precision */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1} paddingY={1}>
          <Text bold color="green" marginBottom={1}>Display Precision</Text>
          
          <Box flexDirection="column" gap={1}>
            <Text>Decimal Places: {decimalPlaces}</Text>
            <Text>Example: {(123.456789).toFixed(decimalPlaces)} {units === 'metric' ? 'mm' : 'in'}</Text>
            <Text dimColor>[+/-] Adjust decimal places</Text>
          </Box>
        </Box>
      </Box>
      
      {/* Display Mode */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} paddingY={1}>
          <Text bold color="yellow" marginBottom={1}>Display Format</Text>
          
          <Box flexDirection="column" gap={1}>
            {displayModes.map((mode, index) => (
              <Text key={mode.value}>
                [D{index + 1}] <Text color={displayMode === mode.value ? "cyan" : "white"}>
                  {displayMode === mode.value ? "● " : "○ "}
                  {mode.label}
                </Text>
              </Text>
            ))}
          </Box>
        </Box>
      </Box>
      
      {/* Coordinate System */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1} paddingY={1}>
          <Text bold color="magenta" marginBottom={1}>Default Coordinate System</Text>
          
          <Box flexDirection="column" gap={1}>
            <Text>
              [C1] <Text color={coordinateSystem === 'machine' ? "cyan" : "white"}>
                {coordinateSystem === 'machine' ? "● " : "○ "}
                Machine Coordinates
              </Text>
            </Text>
            <Text>
              [C2] <Text color={coordinateSystem === 'work' ? "cyan" : "white"}>
                {coordinateSystem === 'work' ? "● " : "○ "}
                Work Coordinates
              </Text>
            </Text>
          </Box>
        </Box>
      </Box>
      
      {/* Current Settings Summary */}
      <Box marginTop={1}>
        <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
          <Text bold color="white" marginBottom={1}>Current Settings</Text>
          <Text>Units: {units === 'metric' ? 'Metric (mm)' : 'Imperial (inches)'}</Text>
          <Text>Precision: {decimalPlaces} decimal places</Text>
          <Text>Format: {displayMode === 'decimal' ? 'Decimal' : 'Fractional'}</Text>
          <Text>Coordinates: {coordinateSystem === 'machine' ? 'Machine' : 'Work'}</Text>
        </Box>
      </Box>
    </Box>
  );
}

export default UnitsSettings;