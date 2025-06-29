/**
 * Jog Controls Component
 * 
 * Standardized step size controls for machine jogging operations.
 * 
 * @module JogControls
 */

import React from 'react';
import { Box, Text } from 'ink';
import { SelectableList } from '../../../shared/components/interactive/SelectableList.jsx';
import { getDisplayUnit } from '../services/ManualControlService.js';

/**
 * Step Size Selector Component
 * Standardized step size selection using SelectableList
 */
export function StepSizeSelector({ 
  currentStepSize = 1, 
  onStepSizeChange = () => {} 
}) {
  
  const stepSizes = [
    { 
      id: '0.001', 
      title: '0.001', 
      description: `0.001 ${getDisplayUnit()}`,
      icon: '📏',
      value: 0.001,
      key: '1' 
    },
    { 
      id: '0.01', 
      title: '0.01', 
      description: `0.01 ${getDisplayUnit()}`,
      icon: '📏',
      value: 0.01,
      key: '2' 
    },
    { 
      id: '0.1', 
      title: '0.1', 
      description: `0.1 ${getDisplayUnit()}`,
      icon: '📏',
      value: 0.1,
      key: '3' 
    },
    { 
      id: '1', 
      title: '1', 
      description: `1 ${getDisplayUnit()}`,
      icon: '📏',
      value: 1,
      key: '4' 
    },
    { 
      id: '10', 
      title: '10', 
      description: `10 ${getDisplayUnit()}`,
      icon: '📏',
      value: 10,
      key: '5' 
    }
  ];

  const handleStepSizeSelect = (stepSize) => {
    onStepSizeChange(stepSize.value);
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan" marginBottom={1}>
        Step Size
      </Text>
      <SelectableList
        items={stepSizes}
        selectedId={currentStepSize.toString()}
        onSelect={handleStepSizeSelect}
        variant="compact"
        showIcons={true}
        showDescriptions={true}
        keyboardEnabled={true}
        emptyMessage="No step sizes available"
      />
    </Box>
  );
}

// Deprecated - keeping for compatibility
export function JogControls(props) {
  return <StepSizeSelector {...props} />;
}

export default JogControls;