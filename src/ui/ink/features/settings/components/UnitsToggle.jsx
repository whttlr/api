import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';

export function UnitsToggle({ currentUnits, onUnitsChange }) {
  const units = ['mm', 'inch'];

  useInput((input, key) => {
    if (input === 'u') {
      toggleUnits();
    } else if (input === 'm') {
      onUnitsChange('mm');
    } else if (input === 'i') {
      onUnitsChange('inch');
    }
  });

  const toggleUnits = () => {
    const newUnits = currentUnits === 'mm' ? 'inch' : 'mm';
    onUnitsChange(newUnits);
  };

  const getUnitDescription = (unit) => {
    switch (unit) {
      case 'mm':
        return 'Metric (millimeters)';
      case 'inch':
        return 'Imperial (inches)';
      default:
        return unit;
    }
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Units Configuration
        </Text>
      </Box>

      <Box marginBottom={2}>
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>
              Current Units: 
              <Text color="yellow" marginLeft={1}>
                {getUnitDescription(currentUnits)}
              </Text>
            </Text>
          </Box>

          <Text dimColor>
            This setting affects position display, jogging distances, and feed rates.
          </Text>
        </Box>
      </Box>

      <Box marginBottom={2}>
        <Box gap={2}>
          {units.map(unit => (
            <Button
              key={unit}
              selected={currentUnits === unit}
              onPress={() => onUnitsChange(unit)}
              variant={currentUnits === unit ? 'primary' : 'default'}
            >
              {getUnitDescription(unit)}
            </Button>
          ))}
        </Box>
      </Box>

      <Box marginBottom={2}>
        <Button
          onPress={toggleUnits}
          variant="default"
        >
          Toggle Units
        </Button>
      </Box>

      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Unit Conversion Notes:</Text>
        </Box>
        
        <Box flexDirection="column" marginLeft={2}>
          <Text dimColor>
            • 1 inch = 25.4 mm
          </Text>
          <Text dimColor>
            • Position values are converted automatically
          </Text>
          <Text dimColor>
            • Feed rates maintain their numeric values
          </Text>
          <Text dimColor>
            • Machine limits should be adjusted accordingly
          </Text>
        </Box>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>
          Hotkeys: U (Toggle) | M (Metric) | I (Imperial)
        </Text>
      </Box>
    </Box>
  );
}