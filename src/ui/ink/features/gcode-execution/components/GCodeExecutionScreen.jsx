/**
 * G-Code Execution Screen Component
 * 
 * Main interface for executing G-code commands with three modes:
 * - Command: Individual command entry with validation
 * - File: Execute G-code files with recent file access
 * - History: Browse and reuse command history
 * 
 * @module GCodeExecutionScreen
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState, useCNC } from '../../../shared/contexts/index.js';
import { CommandInput } from './CommandInput.jsx';
import { CommandHistory } from './CommandHistory.jsx';
import { FileExecution } from './FileExecution.jsx';
import { CommandConfirmation } from './CommandConfirmation.jsx';
import { useCommandExecution } from '../hooks/useCommandExecution.js';

/**
 * Mode Selector Component
 * @param {Object} props - Component props
 * @param {string} props.currentMode - Active mode
 * @param {Function} props.onModeChange - Mode change handler
 */
function ModeSelector({ currentMode, onModeChange }) {
  const modes = [
    { id: 'command', label: '[1] Command', key: '1' },
    { id: 'file', label: '[2] File', key: '2' },
    { id: 'history', label: '[3] History', key: '3' }
  ];

  return (
    <Box marginBottom={2} paddingX={1}>
      <Box gap={1}>
        {modes.map(mode => (
          <Box 
            key={mode.id}
            borderStyle={currentMode === mode.id ? 'single' : undefined}
            borderColor={currentMode === mode.id ? 'cyan' : undefined}
            paddingX={1}
          >
            <Text 
              color={currentMode === mode.id ? 'cyan' : 'white'}
              bold={currentMode === mode.id}
            >
              {mode.label}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Emergency Controls Component
 */
function EmergencyControls() {
  return (
    <Box marginTop={2} paddingX={1}>
      <Box justifyContent="space-between">
        <Text dimColor>
          Press ESC to go back, 1/2/3 to switch modes, Ctrl+X for emergency stop
        </Text>
        <Box 
          borderStyle="single" 
          borderColor="red"
          paddingX={1}
        >
          <Text color="red" bold>
            🚨 EMERGENCY STOP (Ctrl+X)
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

/**
 * G-Code Execution Screen Component
 * Main screen for executing G-code commands and files
 */
export function GCodeExecutionScreen() {
  const { goBack, navigateTo } = useAppState();
  const { state } = useCNC();
  const [currentMode, setCurrentMode] = useState('command');
  
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
    executeEmergencyStop,
    handleConfirmationInput
  } = useCommandExecution();

  useInput((input, key) => {
    // Handle confirmation mode first
    if (showConfirmation) {
      handleConfirmationInput(input, key);
      return;
    }
    
    // Handle edit mode (delegated to CommandInput component)
    if (isEditMode) {
      return; // CommandInput component handles this
    }
    
    // Normal navigation mode
    if (key.escape) {
      goBack();
    } else if (input === '1') {
      setCurrentMode('command');
    } else if (input === '2') {
      setCurrentMode('file');
    } else if (input === '3') {
      setCurrentMode('history');
    }
    
    // Global job progress hotkey
    if (input === 'j' && state.job.isRunning) {
      navigateTo('job-progress');
    }
    
    // Emergency stop hotkey (Ctrl+X)
    if (key.ctrl && input === 'x') {
      executeEmergencyStop();
    }
  });

  /**
   * Render content based on current mode
   */
  const renderModeContent = () => {
    switch (currentMode) {
      case 'command':
        return (
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
        );
      case 'file':
        return <FileExecution />;
      case 'history':
        return <CommandHistory />;
      default:
        return (
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
        );
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} flexDirection="column" paddingY={1}>
        {/* Header */}
        <Box marginBottom={2} paddingX={1}>
          <Text bold color="green">
            ⚡ G-Code Execution
          </Text>
        </Box>

        {/* Mode selector */}
        <ModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />

        {/* Command confirmation dialog */}
        {showConfirmation && (
          <CommandConfirmation
            command={confirmationCommand}
            isConnected={state.connection.isConnected}
            onConfirm={handleConfirmationInput}
          />
        )}

        {/* Mode content */}
        <Box flex={1}>
          {renderModeContent()}
        </Box>

        {/* Emergency controls */}
        <EmergencyControls />
      </Box>
      
    </Box>
  );
}

// Default export
export default GCodeExecutionScreen;