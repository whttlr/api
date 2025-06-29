/**
 * Connection Controls Component
 * 
 * Provides controls for connection management including refresh ports,
 * connect/disconnect actions, and keyboard shortcuts.
 * 
 * @module ConnectionControls
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Connection Action Instructions Component
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Current connection status
 */
function ActionInstructions({ isConnected }) {
  return (
    <Box marginTop={2}>
      <Text dimColor>
        ↑↓ Navigate ports | Enter - {isConnected ? "Disconnect" : "Connect"} | R - Refresh | D - Disconnect | ESC - Back
      </Text>
    </Box>
  );
}

/**
 * Connection Status Actions Component
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Current connection status
 * @param {Function} props.onRefresh - Refresh ports handler
 * @param {Function} props.onDisconnect - Disconnect handler
 */
function ConnectionActions({ isConnected, onRefresh, onDisconnect }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      {/* Additional action buttons could go here in the future */}
      {isConnected && (
        <Box marginBottom={1}>
          <Text color="green">
            ✅ Connected - Ready for operation
          </Text>
        </Box>
      )}
      
      {!isConnected && (
        <Box marginBottom={1}>
          <Text color="yellow">
            📡 Scanning for CNC controllers...
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Connection Tips Component
 * Provides helpful tips for connection troubleshooting
 */
function ConnectionTips() {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold color="cyan" marginBottom={1}>
        💡 Connection Tips:
      </Text>
      <Text dimColor>
        • Most GRBL controllers use 115200 baud rate
      </Text>
      <Text dimColor>
        • Arduino-based controllers typically appear as "USB Serial"
      </Text>
      <Text dimColor>
        • If no ports appear, check USB drivers and connections
      </Text>
    </Box>
  );
}

/**
 * Connection Controls Component
 * Main controls for managing CNC connections
 */
export function ConnectionControls({ 
  isConnected = false, 
  onRefresh = () => {}, 
  onDisconnect = () => {} 
}) {
  return (
    <Box flexDirection="column">
      <ConnectionActions 
        isConnected={isConnected}
        onRefresh={onRefresh}
        onDisconnect={onDisconnect}
      />
      
      <ActionInstructions isConnected={isConnected} />
      
      {!isConnected && <ConnectionTips />}
    </Box>
  );
}

// Default export
export default ConnectionControls;