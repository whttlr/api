/**
 * Command Confirmation Component
 * 
 * Safety confirmation dialog for G-code command execution with
 * connection status awareness and user preference options.
 * Now using standardized ConfirmationModal.
 * 
 * @module CommandConfirmation
 */

import React from 'react';
import { Box, Text } from 'ink';
import { ConfirmationModal } from '../../../shared/components/modal/ConfirmationModal.jsx';

/**
 * Command Confirmation Component
 * Safety dialog for confirming G-code command execution using standardized ConfirmationModal
 */
export function CommandConfirmation({ 
  command = '', 
  isConnected = false, 
  isOpen = true,
  onConfirm = () => {},
  onCancel = () => {},
  onDontAskAgain = () => {}
}) {
  
  // Create connection-aware message
  const message = isConnected 
    ? "This command will control your CNC machine. Are you sure?"
    : "This command would control your CNC machine when connected. Continue to see validation?";
  
  // Connection status details
  const details = !isConnected 
    ? "ℹ️ No machine connected - command will be validated but not executed"
    : null;
  
  // Determine variant based on connection status
  const variant = isConnected ? 'warning' : 'info';
  
  // Custom button text based on connection status
  const confirmText = isConnected ? "Execute" : "Validate";
  
  return (
    <ConfirmationModal
      isOpen={isOpen}
      title="Confirm Command Execution"
      message={`About to execute: ${command}`}
      details={details}
      variant={variant}
      confirmText={confirmText}
      cancelText="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      defaultButton="cancel"
      showShortcuts={true}
      width={60}
    />
  );
}

// Default export
export default CommandConfirmation;