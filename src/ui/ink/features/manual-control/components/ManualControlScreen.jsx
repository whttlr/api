/**
 * Manual Control Screen Component
 * 
 * Complete manual machine control interface with jogging, homing,
 * work coordinate management, and position monitoring.
 * 
 * @module ManualControlScreen
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState, useCNC } from '../../../shared/contexts/index.js';
import { PositionDisplay } from './PositionDisplay.jsx';
import { StepSizeSelector } from './JogControls.jsx';
import { WCSSelector } from './WorkCoordinates.jsx';
import { MovementControlsDisplay } from './MovementInstructions.jsx';
import { CommandsSelector } from './CommandsSelector.jsx';
import { useManualControl } from '../hooks/useManualControl.js';

/**
 * Connection Warning Component
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Connection status
 */
function ConnectionWarning({ isConnected }) {
  if (isConnected) return null;

  return (
    <Box marginBottom={2} paddingX={1}>
      <Text color="red">
        ⚠️ Machine not connected. Connect first to enable manual control.
      </Text>
    </Box>
  );
}

/**
 * Movement Status Component
 * @param {Object} props - Component props
 * @param {boolean} props.isJogging - Jogging status
 * @param {string} props.activeDirection - Active movement direction
 */
function MovementStatus({ isJogging, activeDirection }) {
  if (!isJogging && !activeDirection) return null;

  return (
    <Box marginBottom={2} paddingX={1}>
      <Text color="yellow">
        ⏳ Moving...{activeDirection && ` (${activeDirection})`}
      </Text>
    </Box>
  );
}

/**
 * Manual Control Screen Component
 * Main interface for manual machine control
 */
export function ManualControlScreen() {
  const { goBack } = useAppState();
  const { state } = useCNC();
  
  const {
    jogDistance,
    setJogDistance,
    isJogging,
    activeDirection,
    currentWCS,
    setCurrentWCS,
    machinePosition,
    workOffsets,
    controlActions,
    handleJogInput,
    handleStepSizeChange,
    executeHome,
    executeReset,
    executeUnlock,
    handleWCSChange
  } = useManualControl();

  const handleCommandExecute = (action, command) => {
    switch (action) {
      case 'home':
        executeHome();
        break;
      case 'reset':
        executeReset();
        break;
      case 'unlock':
        executeUnlock();
        break;
      default:
        console.log('Unknown command:', action);
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      goBack();
    } else {
      // Let SelectableList components handle their own input
      // Movement controls are handled by handleJogInput
      handleJogInput(input, key);
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} flexDirection="column" paddingY={1}>
        {/* Header */}
        <Box marginBottom={2} paddingX={1}>
          <Text bold color="green">
            🎮 Manual Control
          </Text>
        </Box>

        <ConnectionWarning isConnected={state.connection?.isConnected} />

        {/* Position Display */}
        <Box marginBottom={2} paddingX={1}>
          <PositionDisplay 
            machinePosition={state.machine?.position || { x: 0, y: 0, z: 0 }}
            workOffset={workOffsets[currentWCS] || { x: 0, y: 0, z: 0 }}
            activeDirection={activeDirection}
          />
        </Box>

        {/* Movement Status */}
        <MovementStatus 
          isJogging={isJogging}
          activeDirection={activeDirection}
        />

        {/* 4-Column Layout: Movement Controls | Step Size | Commands | WCS */}
        <Box flex={1} flexDirection="row" gap={2} paddingX={1}>
          {/* Column 1: Movement Controls */}
          <Box flexDirection="column" width={25}>
            <MovementControlsDisplay />
          </Box>

          {/* Column 2: Step Size */}
          <Box flexDirection="column" width={20}>
            <StepSizeSelector
              currentStepSize={jogDistance}
              onStepSizeChange={handleStepSizeChange}
            />
          </Box>

          {/* Column 3: Commands */}
          <Box flexDirection="column" width={25}>
            <CommandsSelector
              onCommandExecute={handleCommandExecute}
            />
          </Box>

          {/* Column 4: WCS */}
          <Box flexDirection="column" width={30}>
            <WCSSelector
              currentWCS={currentWCS}
              machinePosition={state.machine?.position || { x: 0, y: 0, z: 0 }}
              workOffsets={workOffsets}
              onWCSChange={handleWCSChange}
            />
          </Box>
        </Box>

        {/* Instructions */}
        <Box marginTop={2} paddingX={1}>
          <Text dimColor>
            Movement: Arrow keys/WASD + Q/E for Z | Enter - Execute command | ESC - Back
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

// Default export
export default ManualControlScreen;