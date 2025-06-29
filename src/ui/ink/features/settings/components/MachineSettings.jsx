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
    limits = { x: 200, y: 200, z: 100 },
    speeds = { rapid: 3000, work: 1000, plunge: 300 },
    acceleration = { x: 500, y: 500, z: 100 },
    maxSpindle = 24000,
    units = 'metric'
  } = settings;
  
  /**
   * Handle limit changes
   */
  const handleLimitChange = (axis, value) => {
    if (value > 0 && value <= 1000) {
      onUpdate({
        ...settings,
        limits: { ...limits, [axis]: value }
      });
    }
  };
  
  /**
   * Handle speed changes
   */
  const handleSpeedChange = (type, value) => {
    if (value > 0 && value <= 10000) {
      onUpdate({
        ...settings,
        speeds: { ...speeds, [type]: value }
      });
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
          
          <Box gap={3}>
            <Box flexDirection="column">
              <Text>X-Axis: {limits.x} {displayUnit}</Text>
              <Text dimColor>[X] Adjust X limit</Text>
            </Box>
            <Box flexDirection="column">
              <Text>Y-Axis: {limits.y} {displayUnit}</Text>
              <Text dimColor>[Y] Adjust Y limit</Text>
            </Box>
            <Box flexDirection="column">
              <Text>Z-Axis: {limits.z} {displayUnit}</Text>
              <Text dimColor>[Z] Adjust Z limit</Text>
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Speed Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1} paddingY={1}>
          <Text bold color="green" marginBottom={1}>Speed Settings ({displayUnit}/min)</Text>
          
          <Box gap={3}>
            <Box flexDirection="column">
              <Text>Rapid: {speeds.rapid} {displayUnit}/min</Text>
              <Text dimColor>[R] Adjust rapid speed</Text>
            </Box>
            <Box flexDirection="column">
              <Text>Work: {speeds.work} {displayUnit}/min</Text>
              <Text dimColor>[W] Adjust work speed</Text>
            </Box>
            <Box flexDirection="column">
              <Text>Plunge: {speeds.plunge} {displayUnit}/min</Text>
              <Text dimColor>[P] Adjust plunge speed</Text>
            </Box>
          </Box>
        </Box>
      </Box>
      
      {/* Acceleration Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} paddingY={1}>
          <Text bold color="yellow" marginBottom={1}>Acceleration ({displayUnit}/s²)</Text>
          
          <Box gap={3}>
            <Box flexDirection="column">
              <Text>X: {acceleration.x} {displayUnit}/s²</Text>
            </Box>
            <Box flexDirection="column">
              <Text>Y: {acceleration.y} {displayUnit}/s²</Text>
            </Box>
            <Box flexDirection="column">
              <Text>Z: {acceleration.z} {displayUnit}/s²</Text>
            </Box>
          </Box>
          <Text dimColor marginTop={1}>[A] Adjust acceleration settings</Text>
        </Box>
      </Box>
      
      {/* Spindle Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" paddingX={1} paddingY={1}>
          <Text bold color="magenta" marginBottom={1}>Spindle Configuration</Text>
          
          <Text>Max Speed: {maxSpindle} RPM</Text>
          <Text dimColor>[S] Adjust spindle settings</Text>
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