import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import { StatusBar } from '../../navigation/components/StatusBar.jsx';

const executionOptions = [
  {
    id: 'gcode-input',
    title: 'Enter G-Code Manually',
    description: 'Type or paste G-code commands directly',
    key: '1'
  },
  {
    id: 'gcode-select',
    title: 'Select G-Code File',
    description: 'Choose from existing G-code files',
    key: '2'
  }
];

export function ExecuteScreen() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { navigateTo, goBack } = useAppState();

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(executionOptions.length - 1, selectedIndex + 1));
    } else if (key.return) {
      handleSelect(executionOptions[selectedIndex]);
    } else if (key.escape) {
      goBack();
    } else {
      const option = executionOptions.find(opt => opt.key === input);
      if (option) {
        handleSelect(option);
      }
    }
  });

  function handleSelect(option) {
    navigateTo(option.id);
  }

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} flexDirection="column" alignItems="center" paddingY={4}>
        <Box marginBottom={2}>
          <Text bold color="green">
            🎯 G-Code Execution
          </Text>
        </Box>
        
        <Box marginBottom={3}>
          <Text dimColor>
            Choose how you want to provide G-code for execution
          </Text>
        </Box>

        <Box flexDirection="column" gap={1}>
          {executionOptions.map((option, index) => (
            <Box key={option.id} marginBottom={1}>
              <Button
                selected={index === selectedIndex}
                variant="default"
                width={60}
              >
                <Box justifyContent="space-between" width="100%">
                  <Text>
                    [{option.key}] {option.title}
                  </Text>
                </Box>
              </Button>
              {index === selectedIndex && (
                <Box marginTop={1} marginLeft={2}>
                  <Text dimColor>
                    {option.description}
                  </Text>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        <Box marginTop={3}>
          <Text dimColor>
            Use ↑↓ keys or number shortcuts, Enter to select, Esc to go back
          </Text>
        </Box>
      </Box>
      
      <StatusBar />
    </Box>
  );
}