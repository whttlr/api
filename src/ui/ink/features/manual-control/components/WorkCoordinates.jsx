/**
 * Work Coordinates Component
 * 
 * Standardized work coordinate system management using SelectableList.
 * 
 * @module WorkCoordinates
 */

import React from 'react';
import { Box, Text } from 'ink';
import { SelectableList } from '../../../shared/components/interactive/SelectableList.jsx';
import { formatPosition, getDisplayUnit } from '../services/ManualControlService.js';

/**
 * WCS Selector Component
 * Standardized work coordinate system selection using SelectableList
 */
export function WCSSelector({ 
  currentWCS = 'G54',
  machinePosition = { x: 0, y: 0, z: 0 },
  workOffsets = {},
  onWCSChange = () => {} 
}) {
  
  const wcsOptions = [
    { 
      id: 'G53', 
      title: 'G53 Machine', 
      description: `X${formatPosition(machinePosition.x)} Y${formatPosition(machinePosition.y)} Z${formatPosition(machinePosition.z)}`,
      icon: '🔧',
      key: '1' 
    },
    { 
      id: 'G54', 
      title: 'G54 Work #1', 
      description: `X${formatPosition(workOffsets.G54?.x || 0)} Y${formatPosition(workOffsets.G54?.y || 0)} Z${formatPosition(workOffsets.G54?.z || 0)}`,
      icon: '🏗',
      key: '2' 
    },
    { 
      id: 'G55', 
      title: 'G55 Work #2', 
      description: `X${formatPosition(workOffsets.G55?.x || 0)} Y${formatPosition(workOffsets.G55?.y || 0)} Z${formatPosition(workOffsets.G55?.z || 0)}`,
      icon: '🏗',
      key: '3' 
    },
    { 
      id: 'G56', 
      title: 'G56 Work #3', 
      description: `X${formatPosition(workOffsets.G56?.x || 0)} Y${formatPosition(workOffsets.G56?.y || 0)} Z${formatPosition(workOffsets.G56?.z || 0)}`,
      icon: '🏗',
      key: '4' 
    },
    { 
      id: 'G57', 
      title: 'G57 Work #4', 
      description: `X${formatPosition(workOffsets.G57?.x || 0)} Y${formatPosition(workOffsets.G57?.y || 0)} Z${formatPosition(workOffsets.G57?.z || 0)}`,
      icon: '🏗',
      key: '5' 
    }
  ];

  const handleWCSSelect = (wcs) => {
    onWCSChange(wcs.id);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="blue" marginBottom={1}>
        WCS
      </Text>
      <SelectableList
        items={wcsOptions}
        selectedId={currentWCS}
        onSelect={handleWCSSelect}
        variant="compact"
        showIcons={true}
        showDescriptions={true}
        keyboardEnabled={true}
        emptyMessage="No coordinate systems available"
      />
    </Box>
  );
}

// Deprecated - keeping for compatibility
export function WorkCoordinates(props) {
  return <WCSSelector {...props} />;
}

export default WorkCoordinates;