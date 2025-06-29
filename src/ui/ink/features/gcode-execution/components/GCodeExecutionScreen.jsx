/**
 * G-Code Execution Screen Component
 * 
 * Simplified interface for executing individual G-code commands with validation
 * and real-time feedback.
 * 
 * @module GCodeExecutionScreen
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState, useCNC } from '../../../shared/contexts/index.js';
import { CommandInput } from './CommandInput.jsx';
import { useCommandExecution } from '../hooks/useCommandExecution.js';


/**
 * G-Code Execution Screen Component
 * Simplified screen for executing individual G-code commands
 */
export function GCodeExecutionScreen() {
  const { goBack, navigateTo, showSidebar, hideSidebar, state: appState } = useAppState();
  const { state } = useCNC();
  
  const {
    commandInput,
    setCommandInput,
    isEditMode,
    setIsEditMode,
    isExecuting,
    commandValidation,
    showConfirmation,
    confirmationCommand,
    skipConfirmation,
    executeCommand,
    handleConfirmationInput
  } = useCommandExecution();

  useInput((input, key) => {
    // Handle confirmation mode first (when sidebar is showing confirmation)
    if (showConfirmation && appState.sidebar.type === 'command-confirmation') {
      const handled = handleConfirmationInput(input, key);
      if (handled) return;
    }
    
    // Handle edit mode (delegated to CommandInput component)
    if (isEditMode) {
      return; // CommandInput component handles this
    }
    
    // Normal navigation mode
    if (key.escape) {
      // If sidebar is open, close it first, otherwise go back
      if (appState.sidebar.isOpen) {
        hideSidebar();
      } else {
        goBack();
      }
    }
    
    // G-code reference shortcut
    if (input === 'r') {
      if (appState.sidebar.isOpen) {
        hideSidebar();
      } else {
        showSidebar({ type: 'gcode-reference', title: 'G-code Reference' });
      }
    }
    
    // Global job progress hotkey
    if (input === 'j' && state.job.isRunning) {
      navigateTo('job-progress');
    }
  });

  return (
    <Box flexDirection="column" height="100%" width="100%">
      <Box flex={1} flexDirection="column" width="100%" paddingY={1}>
        {/* Header */}
        <Box marginBottom={2} paddingX={1}>
          <Text bold color="green">
            G-Code Execution
          </Text>
        </Box>


        {/* Command input */}
        <Box flex={1}>
          <CommandInput
            commandInput={commandInput}
            setCommandInput={setCommandInput}
            isEditMode={isEditMode}
            setIsEditMode={setIsEditMode}
            isExecuting={isExecuting}
            commandValidation={commandValidation}
            skipConfirmation={skipConfirmation}
            onExecute={executeCommand}
          />
        </Box>

        {/* Footer hint */}
        <Box paddingX={1} marginTop={1}>
          <Text dimColor>
            Press 'r' for G-code reference, ESC to go back
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// Default export
export default GCodeExecutionScreen;