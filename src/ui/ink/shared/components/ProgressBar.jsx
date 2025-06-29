import React from 'react';
import { Box, Text } from 'ink';

export function ProgressBar({ 
  progress = 0, 
  width = 40, 
  showPercentage = true,
  color = 'green',
  backgroundColor = 'gray'
}) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const filledWidth = Math.floor((clampedProgress / 100) * width);
  const emptyWidth = width - filledWidth;

  const filledBar = '█'.repeat(filledWidth);
  const emptyBar = '░'.repeat(emptyWidth);

  return (
    <Box flexDirection="row" alignItems="center">
      <Box marginRight={1}>
        <Text color={color}>
          {filledBar}
        </Text>
        <Text color={backgroundColor}>
          {emptyBar}
        </Text>
      </Box>
      {showPercentage && (
        <Text>
          {clampedProgress.toFixed(1)}%
        </Text>
      )}
    </Box>
  );
}