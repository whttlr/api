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
 * Connection Instructions Panel
 * @param {Object} props - Component props
 * @param {Object} props.connection - Connection state object
 * @param {Array} props.availablePorts - Available ports array
 */
function ConnectionInstructions({ connection, availablePorts }) {
  const hasNoPorts = !availablePorts || availablePorts.length === 0;
  
  return (
    <Box flexDirection="column" paddingX={2}>
      {/* Status */}
      <Box marginBottom={2}>
        <Text bold color="cyan">Connection Status</Text>
      </Box>
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

      {/* Instructions based on state */}
      {hasNoPorts ? (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="yellow" bold>⚠️ No CNC controllers detected</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>• Ensure your CNC controller is connected via USB</Text>
            <Text>• Check that drivers are installed for your controller</Text>
            <Text>• Press 'r' to refresh port discovery</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Auto-refresh every 10 seconds when disconnected</Text>
          </Box>
        </Box>
      ) : connection.isConnected ? (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="green" bold>✅ Connected to {connection.port}</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>• CNC machine is ready for commands</Text>
            <Text>• Press 'd' to disconnect</Text>
            <Text>• Press ESC to return to main menu</Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={2}>
          <Text color="blue" bold>📡 CNC controllers found</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>• Use ↑/↓ to navigate available ports</Text>
            <Text>• Press Enter to connect to selected port</Text>
            <Text>• Press 'r' to refresh port list</Text>
          </Box>
        </Box>
      )}

      {/* Keyboard shortcuts */}
      <Box flexDirection="column" marginTop={2} borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
        <Text bold color="yellow" marginBottom={1}>Keyboard Shortcuts:</Text>
        <Text color="green">↑/↓     </Text><Text>Navigate ports</Text>
        <Text color="green">Enter   </Text><Text>Connect to selected port</Text>
        <Text color="green">r       </Text><Text>Refresh port list</Text>
        {connection.isConnected && (
          <>
            <Text color="green">d       </Text><Text>Disconnect</Text>
          </>
        )}
        <Text color="green">ESC     </Text><Text>Back to main menu</Text>
        <Text color="green">?       </Text><Text>Toggle help</Text>
      </Box>
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
    <Box flexDirection="column" height="100%" width="100%">
      {/* Header */}
      <Box paddingX={2} paddingY={1}>
        <Text bold color="cyan">
          🔌 Connection Management
        </Text>
      </Box>

      {/* Two-column layout */}
      <Box flex={1} flexDirection="row" width="100%">
        {/* Left column - Port Selection */}
        <Box width="50%" flexDirection="column" paddingX={2}>
          <Box marginBottom={1}>
            <Text bold color="yellow">Available Ports</Text>
          </Box>
          
          <PortSelector
            ports={availablePorts}
            selectedIndex={selectedPortIndex}
            connectedPort={connection.port}
            onSelect={handlePortSelect}
          />

          <Box marginTop={2}>
            <ConnectionControls
              isConnected={connection.isConnected}
              onRefresh={handleRefresh}
              onDisconnect={handleDisconnect}
            />
          </Box>
        </Box>

        {/* Right column - Instructions */}
        <Box width="50%" flexDirection="column" borderStyle="single" borderColor="gray">
          <ConnectionInstructions 
            connection={connection} 
            availablePorts={availablePorts} 
          />
        </Box>
      </Box>
    </Box>
  );
}

// Default export
export default ConnectionScreen;