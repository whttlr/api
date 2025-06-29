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
  const { setError, showSidebar, hideSidebar } = useAppState();
  
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
    // For validation feedback, confirm almost all commands
    // Only skip the most basic status queries
    const cmd = command.trim().toUpperCase();
    return !cmd.match(/^\?$|\$\$$|\$#$|\$G$/);
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
    
    // Validate the command
    const validation = validateGcodeCommand(commandInput);

    // Show confirmation/validation if not skipped and command needs confirmation
    // Always show for validation feedback, even for invalid commands
    if (!skipConfirmation && shouldConfirmCommand(commandInput.trim())) {
      setConfirmationCommand(commandInput.trim());
      setShowConfirmation(true);
      
      // Show confirmation in sidebar with validation details
      showSidebar({
        type: 'command-confirmation',
        title: validation.isValid ? 'Confirm Command' : 'Command Validation',
        data: {
          command: commandInput.trim(),
          isConnected: state.connection.isConnected,
          validation: validation,
          onConfirm: () => {
            setShowConfirmation(false);
            hideSidebar();
            // Only execute if valid
            if (validation.isValid) {
              executeCommandDirectly(commandInput.trim());
            } else {
              setError(`Cannot execute invalid command: ${validation.errors.join(', ')}`);
            }
          },
          onCancel: () => {
            setShowConfirmation(false);
            hideSidebar();
            setConfirmationCommand('');
          }
        }
      });
      return;
    }

    // For commands that don't need confirmation, still check validity before execution
    if (!validation.isValid) {
      setError(`Invalid command: ${validation.errors.join(', ')}`);
      return;
    }

    // Execute the command directly
    await executeCommandDirectly(commandInput.trim());
  }, [commandInput, isExecuting, skipConfirmation, shouldConfirmCommand, executeCommandDirectly, setError, showSidebar, hideSidebar, state.connection.isConnected]);

  /**
   * Handle confirmation dialog input from global keyboard handler
   * @param {string} input - User input
   * @param {Object} key - Key event object
   */
  const handleConfirmationInput = useCallback((input, key) => {
    if (!showConfirmation) return false; // Not handling confirmation
    
    if (input === 'y' || key.return) {
      // Yes - execute the command
      setShowConfirmation(false);
      hideSidebar();
      executeCommandDirectly(confirmationCommand);
      return true;
    } else if (input === 'n' || key.escape) {
      // No - cancel
      setShowConfirmation(false);
      hideSidebar();
      setConfirmationCommand('');
      return true;
    } else if (input === 'd') {
      // Don't ask again - set preference and execute
      setSkipConfirmation(true);
      setShowConfirmation(false);
      hideSidebar();
      executeCommandDirectly(confirmationCommand);
      return true;
    }
    
    return false; // Didn't handle the input
  }, [confirmationCommand, executeCommandDirectly, showConfirmation, hideSidebar]);

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