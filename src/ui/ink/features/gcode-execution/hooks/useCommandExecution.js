/**
 * Command Execution Hook
 * 
 * Manages G-code command execution state, validation, confirmation,
 * and interaction with the CNC system.
 * 
 * @module useCommandExecution
 */

import { useState, useCallback, useEffect } from 'react';
import { useCNC, useAppState } from '../../../shared/contexts/index.js';
import { validateGcodeCommand } from '../services/GcodeValidator.js';

/**
 * Command execution management hook
 * @returns {Object} Command execution state and actions
 */
export function useCommandExecution() {
  const { state, sendCommand, gcodeSender, addToHistory } = useCNC();
  const { setError } = useAppState();
  
  // Command input state
  const [commandInput, setCommandInput] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  
  // Command validation state
  const [commandValidation, setCommandValidation] = useState(null);
  
  // Confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationCommand, setConfirmationCommand] = useState('');
  const [skipConfirmation, setSkipConfirmation] = useState(false);

  /**
   * Update validation when command input changes
   */
  useEffect(() => {
    if (commandInput.trim()) {
      const validation = validateGcodeCommand(commandInput);
      setCommandValidation(validation);
    } else {
      setCommandValidation(null);
    }
  }, [commandInput]);

  /**
   * Check if command should be confirmed before execution
   * @param {string} command - G-code command to check
   * @returns {boolean} Whether confirmation is needed
   */
  const shouldConfirmCommand = useCallback((command) => {
    const cmd = command.trim().toUpperCase();
    
    // Always confirm movement commands
    if (cmd.match(/^G[01]/)) return true;
    
    // Always confirm spindle commands
    if (cmd.match(/^M[345]/)) return true;
    
    // Always confirm homing and system commands
    if (cmd.match(/^\$H|\$RST|!|~|%/)) return true;
    
    // Don't confirm simple status queries
    if (cmd.match(/^\?|\$\$|\$#|\$G/)) return false;
    
    // Confirm everything else by default for safety
    return true;
  }, []);

  /**
   * Execute command directly without confirmation
   * @param {string} command - G-code command to execute
   */
  const executeCommandDirectly = useCallback(async (command) => {
    // Check connection status before execution
    if (!state.connection.isConnected) {
      setError('Machine not connected. Please connect first.');
      return;
    }

    setIsExecuting(true);
    try {
      await sendCommand(command);
      // Add to command history
      addToHistory(command);
      setCommandInput('');
    } catch (err) {
      setError(`Command failed: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  }, [state.connection.isConnected, sendCommand, addToHistory, setError]);

  /**
   * Main command execution function
   */
  const executeCommand = useCallback(async () => {
    if (!commandInput.trim() || isExecuting) return;
    
    // Validate the command before execution
    const validation = validateGcodeCommand(commandInput);
    
    // Block execution if there are errors
    if (!validation.isValid) {
      setError(`Invalid command: ${validation.errors.join(', ')}`);
      return;
    }

    // Show confirmation if not skipped and command is potentially dangerous
    if (!skipConfirmation && shouldConfirmCommand(commandInput.trim())) {
      setConfirmationCommand(commandInput.trim());
      setShowConfirmation(true);
      return;
    }

    // Execute the command directly
    await executeCommandDirectly(commandInput.trim());
  }, [commandInput, isExecuting, skipConfirmation, shouldConfirmCommand, executeCommandDirectly, setError]);

  /**
   * Handle confirmation dialog input
   * @param {string} input - User input
   * @param {Object} key - Key event object
   */
  const handleConfirmationInput = useCallback((input, key) => {
    if (input === 'y' || key.return) {
      // Yes - execute the command
      setShowConfirmation(false);
      executeCommandDirectly(confirmationCommand);
    } else if (input === 'n' || key.escape) {
      // No - cancel
      setShowConfirmation(false);
      setConfirmationCommand('');
    } else if (input === 'd') {
      // Don't ask again - set preference and execute
      setSkipConfirmation(true);
      setShowConfirmation(false);
      executeCommandDirectly(confirmationCommand);
    }
  }, [confirmationCommand, executeCommandDirectly]);

  /**
   * Execute emergency stop
   */
  const executeEmergencyStop = useCallback(async () => {
    // Check connection before attempting emergency stop
    if (!state.connection.isConnected) {
      setError('Emergency stop not available: Machine not connected');
      return;
    }
    
    try {
      await gcodeSender.emergencyStop();
    } catch (err) {
      setError(`Emergency stop failed: ${err.message}`);
    }
  }, [state.connection.isConnected, gcodeSender, setError]);

  /**
   * Reset confirmation preferences
   */
  const resetConfirmationPreference = useCallback(() => {
    setSkipConfirmation(false);
  }, []);

  /**
   * Clear command input and related state
   */
  const clearCommand = useCallback(() => {
    setCommandInput('');
    setCommandValidation(null);
    setIsEditMode(false);
  }, []);

  return {
    // State
    commandInput,
    isEditMode,
    isExecuting,
    commandValidation,
    showConfirmation,
    confirmationCommand,
    skipConfirmation,
    
    // Actions
    setCommandInput,
    setIsEditMode,
    executeCommand,
    executeEmergencyStop,
    handleConfirmationInput,
    resetConfirmationPreference,
    clearCommand,
    
    // Computed state
    hasValidCommand: commandValidation?.isValid ?? false,
    canExecute: !isExecuting && commandInput.trim().length > 0,
    isConnected: state.connection.isConnected
  };
}

/**
 * Command validation hook for real-time feedback
 * @param {string} command - Command to validate
 * @returns {Object} Validation result
 */
export function useCommandValidation(command) {
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    if (command && command.trim()) {
      const result = validateGcodeCommand(command);
      setValidation(result);
    } else {
      setValidation(null);
    }
  }, [command]);

  return validation;
}

/**
 * Command history hook for managing execution history
 * @returns {Object} History state and actions
 */
export function useCommandHistory() {
  const { state } = useCNC();
  const [selectedIndex, setSelectedIndex] = useState(0);

  const history = state.commands?.history || [];

  const selectCommand = useCallback((index) => {
    if (index >= 0 && index < history.length) {
      setSelectedIndex(index);
      return history[index];
    }
    return null;
  }, [history]);

  const getSelectedCommand = useCallback(() => {
    return history[selectedIndex] || null;
  }, [history, selectedIndex]);

  return {
    history,
    selectedIndex,
    selectedCommand: getSelectedCommand(),
    setSelectedIndex,
    selectCommand,
    hasHistory: history.length > 0
  };
}

// Default export
export default useCommandExecution;