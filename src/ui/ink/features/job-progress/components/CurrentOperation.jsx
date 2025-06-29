/**
 * Current Operation Component
 * 
 * Displays the currently executing G-code command with contextual information.
 * 
 * @module CurrentOperation
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Command Context Display Component
 * @param {Object} props - Component props
 * @param {string} props.command - Current G-code command
 */
function CommandContext({ command }) {
  const getCommandInfo = () => {
    if (command.includes('G0')) {
      return { icon: '🚄', description: 'Rapid positioning' };
    }
    if (command.includes('G1')) {
      return { icon: '🔧', description: 'Linear movement (cutting)' };
    }
    if (command.includes('M3')) {
      return { icon: '🌪️', description: 'Spindle start' };
    }
    if (command.includes('M5')) {
      return { icon: '🛑', description: 'Spindle stop' };
    }
    return null;
  };

  const info = getCommandInfo();
  if (!info) return null;

  return (
    <Text dimColor>{info.icon} {info.description}</Text>
  );
}

/**
 * Current Operation Component
 * Shows the currently executing command with line number and context
 */
export function CurrentOperation({ job = {} }) {
  if (!job.currentCommand) return null;

  return (
    <Box marginBottom={2} paddingX={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="cyan" paddingX={1} paddingY={1}>
        <Text bold color="cyan" marginBottom={1}>⚡ Current Operation:</Text>
        
        <Text color="white">
          Line {job.currentLine || 0}: <Text color="green">{job.currentCommand}</Text>
        </Text>
        
        <CommandContext command={job.currentCommand} />
      </Box>
    </Box>
  );
}

// Default export
export default CurrentOperation;