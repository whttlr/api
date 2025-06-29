/**
 * Commands Selector Component
 * 
 * Standardized command selection using SelectableList for machine commands.
 * 
 * @module CommandsSelector
 */

import React from 'react';
import { Box, Text } from 'ink';
import { SelectableList } from '../../../shared/components/interactive/SelectableList.jsx';

/**
 * Commands Selector Component
 * Standardized command selection using SelectableList
 */
export function CommandsSelector({ 
  onCommandExecute = () => {} 
}) {
  
  const commands = [
    { 
      id: 'home', 
      title: 'Home All Axes', 
      description: 'Move all axes to home position',
      icon: '🏠',
      key: 'H',
      action: 'home'
    },
    { 
      id: 'reset', 
      title: 'Reset Machine', 
      description: 'Reset machine state and clear alarms',
      icon: '🔄',
      key: 'R',
      action: 'reset'
    },
    { 
      id: 'unlock', 
      title: 'Unlock Machine', 
      description: 'Unlock machine for manual movement',
      icon: '🔓',
      key: 'U',
      action: 'unlock'
    }
  ];

  const handleCommandSelect = (command) => {
    onCommandExecute(command.action, command);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="orange" marginBottom={1}>
        Commands
      </Text>
      <SelectableList
        items={commands}
        selectedId={null}
        onSelect={handleCommandSelect}
        variant="compact"
        showIcons={true}
        showDescriptions={true}
        keyboardEnabled={true}
        emptyMessage="No commands available"
      />
    </Box>
  );
}

export default CommandsSelector;