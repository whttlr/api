/**
 * Connection Screen Component
 * 
 * Main interface for managing CNC machine connections with port selection,
 * status display, and connection controls.
 * 
 * @module ConnectionScreen
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState, useCNC } from '../../../shared/contexts/index.js';
import { ConnectionIndicator } from '../../../shared/components/index.js';
import { PortSelector } from './PortSelector.jsx';
import { ConnectionControls } from './ConnectionControls.jsx';

/**
 * Connection Status Display Component
 * @param {Object} props - Component props
 * @param {Object} props.connection - Connection state object
 */
function ConnectionStatus({ connection }) {
  return (
    <Box marginBottom={2}>
      <Text>
        Status: <ConnectionIndicator />
      </Text>
      {connection.lastError && (
        <Box marginTop={1}>
          <Text color="red">
            Error: {connection.lastError}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Connection Screen Component
 * Full-screen interface for managing machine connections
 */
export function ConnectionScreen() {
  const { goBack } = useAppState();
  const { state, connect, disconnect, refreshPorts } = useCNC();
  const [selectedPortIndex, setSelectedPortIndex] = useState(0);

  const availablePorts = state.availablePorts || [];
  const { connection } = state;

  /**
   * Handle port selection
   * @param {Object} port - Selected port object
   */
  const handlePortSelect = async (port) => {
    if (connection.isConnected) {
      await disconnect();
    } else {
      await connect(port.path);
    }
  };

  /**
   * Handle port refresh
   */
  const handleRefresh = () => {
    refreshPorts();
  };

  /**
   * Handle disconnect
   */
  const handleDisconnect = async () => {
    if (connection.isConnected) {
      await disconnect();
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      goBack();
      return;
    }

    // Handle custom shortcuts (SelectableList handles navigation internally)
    if (input === 'r') {
      handleRefresh();
    } else if (input === 'd' && connection.isConnected) {
      handleDisconnect();
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} flexDirection="column" paddingX={2} paddingY={1}>
        {/* Header */}
        <Box marginBottom={2}>
          <Text bold color="cyan">
            🔌 Connection Management
          </Text>
        </Box>

        {/* Connection Status */}
        <ConnectionStatus connection={connection} />

        {/* Port Selection */}
        <PortSelector
          ports={availablePorts}
          selectedIndex={selectedPortIndex}
          connectedPort={connection.port}
          onSelect={handlePortSelect}
        />

        {/* Connection Controls */}
        <ConnectionControls
          isConnected={connection.isConnected}
          onRefresh={handleRefresh}
          onDisconnect={handleDisconnect}
        />
      </Box>
      
    </Box>
  );
}

// Default export
export default ConnectionScreen;