/**
 * Time Tracking Component
 * 
 * Displays elapsed time, remaining time, and total estimates for job execution.
 * 
 * @module TimeTracking
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Time Tracking Component
 * Comprehensive time information for job execution
 */
export function TimeTracking({ job = {}, formatTime = (s) => `${s}s` }) {
  const elapsedTime = job.elapsedTime || 0;
  const remainingTime = job.estimatedTimeRemaining || 0;
  const totalEstimated = elapsedTime + remainingTime;

  return (
    <Box marginBottom={2} paddingX={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} paddingY={1}>
        <Text bold color="yellow" marginBottom={1}>⏱️ Time Tracking:</Text>
        
        <Box gap={4} marginBottom={1}>
          <Text>
            Elapsed: <Text color="cyan">{formatTime(elapsedTime)}</Text>
          </Text>
          <Text>
            Remaining: <Text color="yellow">{formatTime(remainingTime)}</Text>
          </Text>
        </Box>
        
        <Text dimColor>
          Total estimated: {formatTime(totalEstimated)}
        </Text>
      </Box>
    </Box>
  );
}

// Default export
export default TimeTracking;