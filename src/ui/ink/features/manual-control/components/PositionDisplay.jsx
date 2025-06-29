/**
 * Position Display Component
 * 
 * Shows current machine and work coordinates with active movement indicators.
 * 
 * @module PositionDisplay
 */

import React from 'react';
import { Box, Text } from 'ink';
import { formatPosition, getDisplayUnit } from '../services/ManualControlService.js';

/**
 * Position Display Component
 * Shows machine and work coordinates with movement status
 */
export function PositionDisplay({ 
  machinePosition = { x: 0, y: 0, z: 0 }, 
  workOffset = { x: 0, y: 0, z: 0 }, 
  activeDirection = null 
}) {
  
  const workPosition = {
    x: machinePosition.x - workOffset.x,
    y: machinePosition.y - workOffset.y,
    z: machinePosition.z - workOffset.z
  };

  return (
    <Box marginBottom={2} paddingX={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
        <Text bold color="white" marginBottom={1}>📍 Position Information:</Text>
        
        <Text>
          Machine: X:{formatPosition(machinePosition.x)} Y:{formatPosition(machinePosition.y)} Z:{formatPosition(machinePosition.z)} {getDisplayUnit()}
        </Text>
        
        <Text>
          Work: X:{formatPosition(workPosition.x)} Y:{formatPosition(workPosition.y)} Z:{formatPosition(workPosition.z)} {getDisplayUnit()}
        </Text>
        
        {activeDirection && (
          <Text color="green" bold>
            🎯 Moving {activeDirection}
          </Text>
        )}
      </Box>
    </Box>
  );
}

// Default export
export default PositionDisplay;