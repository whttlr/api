/**
 * Movement Controls Component
 * 
 * Displays standardized movement controls as a non-selectable list.
 * 
 * @module MovementInstructions
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Movement Controls Display Component
 * Shows standardized movement controls as a formatted list
 */
export function MovementControlsDisplay() {
  const movementControls = [
    { icon: '↑', action: 'Y+', keys: 'Arrow Up / W' },
    { icon: '↓', action: 'Y-', keys: 'Arrow Down / S' },
    { icon: '←', action: 'X-', keys: 'Arrow Left / A' },
    { icon: '→', action: 'X+', keys: 'Arrow Right / D' },
    { icon: '🔺', action: 'Z+', keys: 'Q' },
    { icon: '🔻', action: 'Z-', keys: 'E' }
  ];

  return (
    <Box flexDirection="column">
      <Text bold color="white" marginBottom={1}>
        Movement Controls
      </Text>
      <Box flexDirection="column">
        {movementControls.map((control, index) => (
          <Box key={index} marginBottom={0}>
            <Text>
              <Text color="cyan">{control.icon}</Text> {control.action} - <Text dimColor>{control.keys}</Text>
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// Deprecated - keeping for compatibility
export function MovementInstructions() {
  return <MovementControlsDisplay />;
}

export default MovementInstructions;