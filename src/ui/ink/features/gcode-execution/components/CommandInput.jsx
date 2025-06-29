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

/**
 * G-code Command Validation Function
 * @param {string} value - Command input value
 * @returns {Object} Validation result
 */
function validateGcodeCommand(value) {
  if (!value || !value.trim()) {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: ['Enter a G-code command (e.g., G0 X10 Y20)']
    };
  }

  const errors = [];
  const warnings = [];
  const suggestions = [];

  const trimmedValue = value.trim().toUpperCase();

  // Basic G-code validation
  if (!/^[GM$]\w*/.test(trimmedValue)) {
    if (!/^[A-Z0-9\s\.\-]+$/.test(trimmedValue)) {
      errors.push('Invalid characters - use only letters, numbers, spaces, dots, and dashes');
    } else {
      warnings.push('Command should start with G, M, or $ (e.g., G0, M3, $$)');
    }
  }

  // Check for dangerous commands
  const dangerousCommands = ['M112', 'M999', '$RST'];
  if (dangerousCommands.some(cmd => trimmedValue.includes(cmd))) {
    warnings.push('⚠️ DANGEROUS COMMAND - This will reset or emergency stop the machine');
  }

  // Provide suggestions for common commands
  if (trimmedValue.startsWith('G0') || trimmedValue.startsWith('G1')) {
    if (!/[XYZ]/.test(trimmedValue)) {
      suggestions.push('Add coordinates: G0 X10 Y20 Z5');
    }
  }

  if (trimmedValue === '$$') {
    suggestions.push('This will show all GRBL settings');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

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
 * Command Help Component
 */
function CommandHelp() {
  return (
    <Box marginBottom={2}>
      <Text dimColor>Common commands: G0/G1 (move), G28 (home), M3/M5 (spindle), $$ (settings)</Text>
    </Box>
  );
}

/**
 * Instructions Component
 * @param {Object} props - Component props
 * @param {boolean} props.isEditMode - Edit mode status
 * @param {boolean} props.skipConfirmation - Skip confirmation preference
 */
function Instructions({ isEditMode, skipConfirmation }) {
  return (
    <Box flexDirection="column">
      <Box>
        <Text dimColor>
          {isEditMode 
            ? "Type G-code command, Enter to execute (with confirmation), Esc to cancel"
            : "Press Enter or 'E' to start typing a command"
          }
        </Text>
      </Box>
      
      {skipConfirmation && (
        <Box marginTop={1}>
          <Text color="yellow" dimColor>ℹ️ Safety confirmations disabled - commands execute immediately</Text>
        </Box>
      )}
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
      
      <CommandHelp />
      
      <Instructions isEditMode={isEditMode} skipConfirmation={skipConfirmation} />
    </Box>
  );
}

// Default export
export default CommandInput;