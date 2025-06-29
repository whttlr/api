/**
 * Job Controls Component
 * 
 * Main job control interface with pause/resume, stop, and navigation instructions.
 * 
 * @module JobControls
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Control Button Component
 * @param {Object} props - Component props
 * @param {boolean} props.selected - Selection status
 * @param {string} props.variant - Button variant style
 * @param {string} props.children - Button content
 */
function ControlButton({ selected, variant, children }) {
  const getColor = () => {
    if (variant === 'primary') return 'green';
    if (variant === 'warning') return 'yellow';
    if (variant === 'danger') return 'red';
    return 'white';
  };

  return (
    <Box 
      borderStyle={selected ? 'single' : undefined}
      borderColor={selected ? 'cyan' : undefined}
      paddingX={selected ? 1 : 0}
    >
      <Text color={getColor()} bold={selected}>
        {children}
      </Text>
    </Box>
  );
}

/**
 * Job Action Buttons Component
 * @param {Object} props - Component props
 * @param {Object} props.job - Job information object
 * @param {number} props.selectedControl - Selected control index
 */
function JobActionButtons({ job, selectedControl }) {
  return (
    <Box gap={2}>
      <ControlButton 
        selected={selectedControl === 2}
        variant={job.isPaused ? 'primary' : 'warning'}
      >
        {job.isPaused ? '▶ Resume [Space]' : '⏸ Pause [Space]'}
      </ControlButton>
      
      <ControlButton 
        selected={selectedControl === 3}
        variant="danger"
      >
        🛑 Stop Job [S]
      </ControlButton>
    </Box>
  );
}

/**
 * Control Instructions Component
 * @param {Object} props - Component props
 * @param {boolean} props.editingOverride - Whether override is being edited
 */
function ControlInstructions({ editingOverride }) {
  return (
    <Box marginTop={2}>
      <Text dimColor>
        {editingOverride 
          ? 'Type new percentage (10-200), Enter to apply, Esc to cancel'
          : 'F - Feed Override | R - Spindle Override | Space - Pause/Resume | S - Stop'
        }
      </Text>
    </Box>
  );
}

/**
 * Job Controls Component
 * Complete job control interface
 */
export function JobControls({ 
  job = {}, 
  selectedControl = 0, 
  editingOverride = null 
}) {
  
  return (
    <Box marginTop={2} paddingX={1}>
      <Box flexDirection="column">
        <JobActionButtons job={job} selectedControl={selectedControl} />
        
        <ControlInstructions editingOverride={editingOverride} />
      </Box>
    </Box>
  );
}

// Default export
export default JobControls;