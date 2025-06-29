/**
 * Machine Settings Component
 * 
 * Configuration interface for machine-specific parameters including
 * limits, speeds, and hardware settings.
 * 
 * @module MachineSettings
 */

import React from 'react';
import { Box, Text } from 'ink';
import { UnitConverter } from '../../../shared/services/UnitConverter.js';

/**
 * Machine Settings Component
 * Interface for machine configuration parameters
 */
export function MachineSettings({ 
  settings = {}, 
  onUpdate = () => {} 
}) {
  
  const {
    limits = { 
      x: { min: -100, max: 100 }, 
      y: { min: -100, max: 100 }, 
      z: { min: -50, max: 50 }
    },
    speeds = { 
      travel: 3000, 
      feed: 1000 
    },
    spindle = {
      minSpeed: 0,
      maxSpeed: 24000,
      defaultSpeed: 12000,
      defaultDirection: 'clockwise'
    },
    units = 'metric'
  } = settings;
  
  /**
   * Handle limit changes for min/max ranges
   */
  const handleLimitChange = (axis, type, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= -1000 && numValue <= 1000) {
      const newLimits = {
        ...limits,
        [axis]: {
          ...limits[axis],
          [type]: numValue
        }
      };
      
      // Ensure min <= max
      if (type === 'min' && numValue > limits[axis].max) {
        newLimits[axis].max = numValue;
      } else if (type === 'max' && numValue < limits[axis].min) {
        newLimits[axis].min = numValue;
      }
      
      onUpdate({
        ...settings,
        limits: newLimits
      });
    }
  };
  
  /**
   * Handle speed changes
   */
  const handleSpeedChange = (type, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 10000) {
      onUpdate({
        ...settings,
        speeds: { ...speeds, [type]: numValue }
      });
    }
  };
  
  /**
   * Handle spindle changes
   */
  const handleSpindleChange = (property, value) => {
    if (property === 'defaultDirection') {
      onUpdate({
        ...settings,
        spindle: { ...spindle, [property]: value }
      });
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 50000) {
        onUpdate({
          ...settings,
          spindle: { ...spindle, [property]: numValue }
        });
      }
    }
  };
  
  const displayUnit = UnitConverter.getDisplayUnit(units);
  
  return (
    <Box flexDirection="column">
      <Text bold color="cyan" marginBottom={1}>🔧 Machine Configuration</Text>
      
      {/* Machine Limits */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1} paddingY={1}>
          <Text bold color="blue" marginBottom={1}>Travel Limits ({displayUnit})</Text>
          
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="column">
              <Text bold>X-Axis:</Text>
              <Text>  Min: {limits.x.min} {displayUnit}  Max: {limits.x.max} {displayUnit}</Text>
              <Text dimColor>  [X] Adjust X limits</Text>
            </Box>
            <Box flexDirection="column">
              <Text bold>Y-Axis:</Text>
              <Text>  Min: {limits.y.min} {displayUnit}  Max: {limits.y.max} {displayUnit}</Text>
              <Text dimColor>  [Y] Adjust Y limits</Text>
            </Box>
            <Box flexDirection="column">
              <Text bold>Z-Axis:</Text>
              <Text>  Min: {limits.z.min} {displayUnit}  Max: {limits.z.max} {displayUnit}</Text>
              <Text dimColor>  [Z] Adjust Z limits</Text>
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Speed Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1} paddingY={1}>
          <Text bold color="green" marginBottom={1}>Travel and Feed Limits ({displayUnit}/min)</Text>
          
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="column">
              <Text bold>Travel Speed:</Text>
              <Text>  {speeds.travel} {displayUnit}/min</Text>
              <Text dimColor>  [T] Adjust travel speed</Text>
            </Box>
            <Box flexDirection="column">
              <Text bold>Feed Speed:</Text>
              <Text>  {speeds.feed} {displayUnit}/min</Text>
              <Text dimColor>  [F] Adjust feed speed</Text>
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Spindle Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1} paddingY={1}>
          <Text bold color="magenta" marginBottom={1}>Spindle Configuration</Text>
          
          <Box flexDirection="column" gap={1}>
            <Box flexDirection="column">
              <Text bold>Speed Range:</Text>
              <Text>  Min: {spindle.minSpeed} RPM  Max: {spindle.maxSpeed} RPM</Text>
              <Text dimColor>  [S] Adjust speed range</Text>
            </Box>
            <Box flexDirection="column">
              <Text bold>Default Speed:</Text>
              <Text>  {spindle.defaultSpeed} RPM</Text>
              <Text dimColor>  [D] Adjust default speed</Text>
            </Box>
            <Box flexDirection="column">
              <Text bold>Default Direction:</Text>
              <Text>  {spindle.defaultDirection === 'clockwise' ? 'Clockwise (M3)' : 'Counter-clockwise (M4)'}</Text>
              <Text dimColor>  [R] Toggle direction</Text>
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Warning */}
      <Box marginTop={1}>
        <Text color="yellow">⚠️ Changes require machine restart to take effect</Text>
      </Box>
    </Box>
  );
}

export default MachineSettings;