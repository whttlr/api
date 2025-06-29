/**
 * Command Input Component
 * 
 * Interactive G-code command entry with real-time validation,
 * edit mode support, and visual feedback.
 * 
 * @module CommandInput
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { debug } from '../../../../../lib/logger/LoggerService.js';
import { ValidationDisplay } from '../../../shared/components/feedback/ValidationDisplay.jsx';
import { StandardInput, InputValidators } from '../../../shared/components/input/StandardInput.jsx';
import { validateGcodeCommand } from '../services/GcodeValidator.js';

/**
 * Execution Status Component
 * @param {Object} props - Component props
 * @param {boolean} props.isExecuting - Execution status
 */
function ExecutionStatus({ isExecuting }) {
  if (!isExecuting) return null;

  return (
    <Box marginBottom={1}>
      <Text color="yellow">⏳ Executing command...</Text>
    </Box>
  );
}



/**
 * Command Input Component
 * Interactive G-code command entry interface using standardized StandardInput
 */
export function CommandInput({ 
  commandInput = '',
  setCommandInput = () => {},
  isEditMode = false,
  setIsEditMode = () => {},
  isExecuting = false,
  commandValidation = null,
  skipConfirmation = false,
  onExecute = () => {}
}) {

  /**
   * Handle command submission
   */
  const handleSubmit = (value) => {
    debug('G-code command submitted:', value);
    setCommandInput(value);
    onExecute();
  };

  /**
   * Handle command cancellation
   */
  const handleCancel = () => {
    debug('G-code command entry cancelled');
    setIsEditMode(false);
  };

  /**
   * Handle command value changes
   */
  const handleChange = (value) => {
    setCommandInput(value);
  };

  // Use external validation if provided, otherwise use built-in validation
  const validation = commandValidation || validateGcodeCommand(commandInput);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">G-Code Command Entry</Text>
      </Box>
      
      {/* StandardInput Component for G-code entry */}
      <Box marginBottom={2}>
        <StandardInput
          value={commandInput}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          validation={validateGcodeCommand}
          type="gcode"
          placeholder="Enter G-code command (e.g., G0 X10 Y20)"
          maxLength={100}
          autoFocus={isEditMode}
          showValidation={true}
        />
      </Box>
      
      <ExecutionStatus isExecuting={isExecuting} />
      
      {skipConfirmation && (
        <Box marginBottom={1}>
          <Text color="yellow" dimColor>ℹ️ Safety confirmations disabled - commands execute immediately</Text>
        </Box>
      )}
    </Box>
  );
}

// Default export
export default CommandInput;