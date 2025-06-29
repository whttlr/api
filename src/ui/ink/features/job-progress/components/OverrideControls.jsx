/**
 * Override Controls Component
 * 
 * Real-time feed rate and spindle speed override controls with input editing.
 * 
 * @module OverrideControls
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Override Control Item Component
 * @param {Object} props - Component props
 * @param {string} props.label - Control label
 * @param {string} props.icon - Control icon
 * @param {string} props.shortcut - Keyboard shortcut
 * @param {number} props.value - Current value
 * @param {boolean} props.selected - Selection status
 * @param {boolean} props.editing - Edit mode status
 * @param {string} props.editInput - Edit input value
 */
function OverrideControlItem({ 
  label, 
  icon, 
  shortcut, 
  value, 
  selected, 
  editing, 
  editInput 
}) {
  const displayValue = editing ? `${editInput}_` : `${value}%`;
  const borderColor = editing ? 'yellow' : (selected ? 'cyan' : undefined);
  
  return (
    <Box marginBottom={1}>
      <Box 
        borderStyle={selected || editing ? 'single' : undefined}
        borderColor={borderColor}
        paddingX={selected || editing ? 1 : 0}
      >
        <Text color={selected ? 'cyan' : 'white'}>
          {icon} {label}: {displayValue} [{shortcut}]
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Override Instructions Component
 */
function OverrideInstructions() {
  return (
    <Text dimColor marginTop={1}>
      Override range: 10% - 200% | Current values affect execution speed
    </Text>
  );
}

/**
 * Override Controls Component
 * Real-time control interface for feed rate and spindle speed
 */
export function OverrideControls({ 
  job = {}, 
  selectedControl = 0, 
  editingOverride = null, 
  feedOverrideInput = '', 
  spindleOverrideInput = '' 
}) {
  
  return (
    <Box marginBottom={2} paddingX={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="blue" paddingX={1} paddingY={1}>
        <Text bold color="blue" marginBottom={1}>🎛️ Real-time Controls:</Text>
        
        <OverrideControlItem
          label="Feed Rate"
          icon="🚀"
          shortcut="F"
          value={job.feedOverride || 100}
          selected={selectedControl === 0}
          editing={editingOverride === 'feed'}
          editInput={feedOverrideInput}
        />
        
        <OverrideControlItem
          label="Spindle Speed"
          icon="🌪️"
          shortcut="R"
          value={job.spindleOverride || 100}
          selected={selectedControl === 1}
          editing={editingOverride === 'spindle'}
          editInput={spindleOverrideInput}
        />
        
        <OverrideInstructions />
      </Box>
    </Box>
  );
}

// Default export
export default OverrideControls;