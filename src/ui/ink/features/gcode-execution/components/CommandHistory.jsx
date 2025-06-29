/**
 * Command History Component
 * 
 * Displays and manages G-code command execution history with
 * navigation, reuse capabilities, and status indicators.
 * 
 * @module CommandHistory
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useCNC } from '../../../shared/contexts/index.js';

/**
 * History Item Component
 * @param {Object} props - Component props
 * @param {Object} props.command - Command history item
 * @param {boolean} props.selected - Selection status
 */
function HistoryItem({ command, selected }) {
  const getVariant = () => {
    if (command.error) return 'danger';
    if (command.success) return 'primary';
    return 'default';
  };

  const getStatusColor = () => {
    if (command.error) return 'red';
    if (command.success) return 'green';
    return 'gray';
  };

  return (
    <Box 
      marginBottom={1}
      borderStyle={selected ? 'single' : undefined}
      borderColor={selected ? 'cyan' : undefined}
      paddingX={selected ? 1 : 0}
    >
      <Box flexDirection="column" width="100%">
        <Box>
          <Text color={selected ? 'cyan' : 'white'} bold={selected}>
            {selected ? '→ ' : '  '}{command.command}
          </Text>
        </Box>
        <Box marginLeft={2}>
          <Text color={getStatusColor()} dimColor>
            Response: {command.response || 'No response'}
          </Text>
        </Box>
        {command.timestamp && (
          <Box marginLeft={2}>
            <Text dimColor>
              {new Date(command.timestamp).toLocaleTimeString()}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Empty History Component
 */
function EmptyHistory() {
  return (
    <Box>
      <Text dimColor>No commands executed yet</Text>
    </Box>
  );
}

/**
 * Navigation Instructions Component
 */
function NavigationInstructions() {
  return (
    <Box marginTop={1}>
      <Text dimColor>
        Use ↑↓ to navigate, Enter to reuse command
      </Text>
    </Box>
  );
}

/**
 * Command History Component
 * Browse and reuse previously executed commands
 */
export function CommandHistory() {
  const { state } = useCNC();
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  
  const history = state.commands?.history || [];

  useInput((input, key) => {
    if (history.length === 0) return;

    if (key.upArrow) {
      setSelectedHistoryIndex(Math.max(0, selectedHistoryIndex - 1));
    } else if (key.downArrow) {
      setSelectedHistoryIndex(Math.min(history.length - 1, selectedHistoryIndex + 1));
    } else if (key.return) {
      const selectedCommand = history[selectedHistoryIndex];
      if (selectedCommand && !selectedCommand.error) {
        // TODO: Implement command reuse
        // This would typically set the command in the parent component
        // or navigate to command mode with the selected command
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">Command History ({history.length} commands)</Text>
      </Box>
      
      {history.length === 0 ? (
        <EmptyHistory />
      ) : (
        <Box flexDirection="column">
          {history.slice(0, 8).map((cmd, index) => (
            <HistoryItem
              key={`history-${cmd.timestamp || index}-${cmd.command.slice(0, 10)}`}
              command={cmd}
              selected={index === selectedHistoryIndex}
            />
          ))}
          
          <NavigationInstructions />
        </Box>
      )}
    </Box>
  );
}

// Default export
export default CommandHistory;