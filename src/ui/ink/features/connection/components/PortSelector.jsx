/**
 * Port Selector Component
 * 
 * Displays available serial ports for CNC connection with selection interface.
 * Handles port listing, selection, and connection details display.
 * Now using standardized SelectableList component.
 * 
 * @module PortSelector
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { SelectableList } from '../../../shared/components/interactive/SelectableList.jsx';

/**
 * Custom port item renderer for port-specific styling and information
 * @param {Object} port - Port object
 * @param {boolean} isSelected - Whether port is selected
 * @param {number} index - Port index
 * @param {string} connectedPort - Currently connected port path
 */
function customPortRenderer(port, isSelected, index, connectedPort) {
  const prefix = isSelected ? '→ ' : '  ';
  const icon = '🔌';
  const shortcut = `[${index + 1}] `;
  const portPath = port.path;
  const manufacturer = port.manufacturer && port.manufacturer !== 'Unknown' 
    ? ` - ${port.manufacturer}` 
    : '';
  
  const isConnected = connectedPort === port.path;
  const statusColor = isConnected ? 'green' : (isSelected ? 'cyan' : 'white');
  
  return (
    <Box flexDirection="column">
      <Text color={statusColor} bold={isSelected}>
        {prefix}{shortcut}{icon} {portPath}{manufacturer}
        {isConnected && ' (Connected)'}
      </Text>
      {isSelected && (
        <Box marginLeft={4} marginTop={1}>
          <Text dimColor>
            Details: {port.vendorId !== 'Unknown' ? `VID:${port.vendorId} ` : ''}
            {port.productId !== 'Unknown' ? `PID:${port.productId} ` : ''}
            {port.serialNumber !== 'Unknown' ? `SN:${port.serialNumber}` : ''}
            {(!port.vendorId || port.vendorId === 'Unknown') && 
             (!port.productId || port.productId === 'Unknown') && 
             (!port.serialNumber || port.serialNumber === 'Unknown') && 
             'No additional details available'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * No Ports Found Display Component
 */
function NoPortsDisplay() {
  return (
    <Box marginBottom={2} flexDirection="column">
      <Text color="yellow">
        ⚠️ No CNC controllers detected
      </Text>
      <Text dimColor marginTop={1}>
        • Ensure your CNC controller is connected via USB
      </Text>
      <Text dimColor>
        • Check that drivers are installed for your controller
      </Text>
      <Text dimColor>
        • Press 'r' to refresh port discovery
      </Text>
      <Text dimColor marginTop={1}>
        Auto-refresh every 10 seconds when disconnected
      </Text>
    </Box>
  );
}

/**
 * Port Selector Component
 * Main component for displaying and selecting serial ports using standardized SelectableList
 */
export function PortSelector({ 
  ports = [], 
  selectedIndex = 0, 
  connectedPort = null, 
  onSelect = () => {} 
}) {
  // Transform ports into standardized SelectableList format
  const portItems = ports.map((port, index) => ({
    id: port.path,
    title: port.path,
    key: (index + 1).toString(),
    description: port.manufacturer && port.manufacturer !== 'Unknown' 
      ? port.manufacturer 
      : 'Serial Device',
    icon: '🔌',
    ...port // Include all original port properties
  }));

  const renderPortItem = (port, isSelected, index) => {
    return customPortRenderer(port, isSelected, index, connectedPort);
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={2}>
        <Text bold>Available Ports:</Text>
      </Box>

      {ports.length === 0 ? (
        <NoPortsDisplay />
      ) : (
        <Box flexDirection="column" marginBottom={2}>
          <Text dimColor marginBottom={1}>
            Found {ports.length} potential CNC controller{ports.length !== 1 ? 's' : ''}:
          </Text>
          <SelectableList
            items={portItems}
            selectedId={portItems[selectedIndex]?.id}
            onSelect={onSelect}
            renderItem={renderPortItem}
            variant="compact"
            showIcons={false}
            showDescriptions={false}
            keyboardEnabled={true}
            emptyMessage="No ports available"
          />
        </Box>
      )}
    </Box>
  );
}

// Default export
export default PortSelector;