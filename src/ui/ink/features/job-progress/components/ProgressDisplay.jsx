/**
 * Progress Display Component
 * 
 * Visual progress bar and completion statistics for running jobs.
 * 
 * @module ProgressDisplay
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Progress Bar Component
 * @param {Object} props - Component props
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {number} props.width - Progress bar width in characters
 */
function ProgressBar({ progress = 0, width = 40 }) {
  const filled = Math.floor((progress / 100) * width);
  const empty = width - filled;
  
  return (
    <Text>
      [
      <Text color="green">{'█'.repeat(filled)}</Text>
      <Text color="gray">{'░'.repeat(empty)}</Text>
      ] {progress}%
    </Text>
  );
}

/**
 * Progress Statistics Component
 * @param {Object} props - Component props
 * @param {Object} props.job - Job information object
 */
function ProgressStatistics({ job }) {
  return (
    <Box marginTop={1} gap={4}>
      <Text>
        Lines: <Text color="cyan">{job.currentLine || 0}</Text>/<Text color="white">{job.totalLines || 0}</Text>
      </Text>
      <Text>
        Completion: <Text color="green">{job.progress || 0}%</Text>
      </Text>
    </Box>
  );
}

/**
 * Progress Display Component
 * Complete progress visualization with bar and statistics
 */
export function ProgressDisplay({ job = {}, formatTime = (s) => `${s}s` }) {
  return (
    <Box marginBottom={2} paddingX={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="green" paddingX={1} paddingY={1}>
        <Text bold color="green" marginBottom={1}>📊 Job Progress:</Text>
        
        <ProgressBar progress={job.progress || 0} />
        
        <ProgressStatistics job={job} />
      </Box>
    </Box>
  );
}

// Default export
export default ProgressDisplay;