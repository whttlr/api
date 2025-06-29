/**
 * Emergency Stop Modal Component
 * 
 * Critical safety modal for confirming emergency stop operations.
 * Provides clear warnings and confirmation before halting machine movement.
 * 
 * @module EmergencyStopModal
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';

/**
 * Emergency Stop Confirmation Modal
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onConfirm - Callback for confirming emergency stop
 * @param {Function} props.onCancel - Callback for cancelling emergency stop
 * @param {string} props.variant - Modal variant ('standard' or 'compact')
 */
export function EmergencyStopModal({ 
  isOpen, 
  onConfirm, 
  onCancel,
  variant = 'standard' 
}) {
  useInput((input, key) => {
    // Only handle input when modal is actually open
    if (!isOpen) return;
    
    if (key.return || input === 'y' || input === 'Y') {
      onConfirm();
    } else if (key.escape || input === 'n' || input === 'N') {
      onCancel();
    }
  });
  
  if (!isOpen) return null;
  
  if (variant === 'compact') {
    return (
      <Box
        position="absolute"
        top={8}
        left="50%"
        marginLeft={-20}
        width={40}
        height={6}
        borderStyle="double"
        borderColor="red"
        backgroundColor="black"
        flexDirection="column"
      >
        <Box paddingX={1} marginBottom={1}>
          <Text bold color="red">🚨 EMERGENCY STOP</Text>
        </Box>
        
        <Box paddingX={1} marginBottom={1}>
          <Text color="white">Halt all machine movement?</Text>
        </Box>
        
        <Box paddingX={1} justifyContent="space-between">
          <Text color="red">[Y] YES</Text>
          <Text color="green">[N] No</Text>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box
      position="absolute"
      top={5}
      left="50%"
      marginLeft={-25}
      width={50}
      height={10}
      borderStyle="double"
      borderColor="red"
      backgroundColor="black"
      flexDirection="column"
    >
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="red">
          🚨 EMERGENCY STOP CONFIRMATION
        </Text>
      </Box>
      
      <Box flexDirection="column" paddingX={1} flex={1} gap={1}>
        <Text color="white">
          This will immediately halt all machine movement!
        </Text>
        <Text color="yellow">
          • Current job will be stopped
        </Text>
        <Text color="yellow">
          • Machine position may be lost
        </Text>
        <Text color="yellow">
          • Manual reset will be required
        </Text>
        
        <Box marginTop={1}>
          <Text bold color="white">
            Are you sure you want to trigger emergency stop?
          </Text>
        </Box>
      </Box>
      
      <Box paddingX={1} justifyContent="space-between">
        <Text color="red">[Y] Yes, STOP NOW!</Text>
        <Text color="green">[N] Cancel</Text>
      </Box>
    </Box>
  );
}

/**
 * General Purpose Confirmation Modal
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {string} props.title - Modal title
 * @param {string} props.message - Confirmation message
 * @param {Array} props.warnings - Array of warning strings
 * @param {Function} props.onConfirm - Confirm callback
 * @param {Function} props.onCancel - Cancel callback
 * @param {string} props.confirmText - Text for confirm button
 * @param {string} props.cancelText - Text for cancel button
 * @param {string} props.confirmKey - Key for confirmation (default: 'y')
 * @param {string} props.cancelKey - Key for cancellation (default: 'n')
 */
export function ConfirmationModal({
  isOpen,
  title,
  message,
  warnings = [],
  onConfirm,
  onCancel,
  confirmText = 'Yes',
  cancelText = 'No',
  confirmKey = 'y',
  cancelKey = 'n'
}) {
  useInput((input, key) => {
    if (!isOpen) return;
    
    if (key.return || input.toLowerCase() === confirmKey.toLowerCase()) {
      onConfirm();
    } else if (key.escape || input.toLowerCase() === cancelKey.toLowerCase()) {
      onCancel();
    }
  });
  
  if (!isOpen) return null;
  
  const modalHeight = 6 + warnings.length;
  
  return (
    <Box
      position="absolute"
      top={6}
      left="50%"
      marginLeft={-25}
      width={50}
      height={modalHeight}
      borderStyle="double"
      borderColor="yellow"
      backgroundColor="black"
      flexDirection="column"
    >
      <Box paddingX={1} marginBottom={1}>
        <Text bold color="yellow">{title}</Text>
      </Box>
      
      <Box flexDirection="column" paddingX={1} flex={1}>
        <Text color="white">{message}</Text>
        
        {warnings.map((warning, index) => (
          <Text key={index} color="yellow">
            • {warning}
          </Text>
        ))}
      </Box>
      
      <Box paddingX={1} justifyContent="space-between">
        <Text color="red">
          [{confirmKey.toUpperCase()}] {confirmText}
        </Text>
        <Text color="green">
          [{cancelKey.toUpperCase()}] {cancelText}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Alert Modal (Information only, no confirmation)
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {string} props.title - Modal title
 * @param {string} props.message - Alert message
 * @param {string} props.type - Alert type ('info', 'warning', 'error', 'success')
 * @param {Function} props.onClose - Close callback
 */
export function AlertModal({
  isOpen,
  title,
  message,
  type = 'info',
  onClose
}) {
  useInput((input, key) => {
    if (!isOpen) return;
    
    if (key.return || key.escape || input === ' ') {
      onClose();
    }
  });
  
  if (!isOpen) return null;
  
  const getColorScheme = () => {
    switch (type) {
      case 'error':
        return { border: 'red', title: 'red', icon: '❌' };
      case 'warning':
        return { border: 'yellow', title: 'yellow', icon: '⚠️' };
      case 'success':
        return { border: 'green', title: 'green', icon: '✅' };
      default:
        return { border: 'cyan', title: 'cyan', icon: 'ℹ️' };
    }
  };
  
  const colors = getColorScheme();
  
  return (
    <Box
      position="absolute"
      top={8}
      left="50%"
      marginLeft={-20}
      width={40}
      height={6}
      borderStyle="single"
      borderColor={colors.border}
      backgroundColor="black"
      flexDirection="column"
    >
      <Box paddingX={1} marginBottom={1}>
        <Text bold color={colors.title}>
          {colors.icon} {title}
        </Text>
      </Box>
      
      <Box paddingX={1} marginBottom={1}>
        <Text color="white">{message}</Text>
      </Box>
      
      <Box paddingX={1} justifyContent="center">
        <Text dimColor>Press any key to close</Text>
      </Box>
    </Box>
  );
}

// Default export
export default EmergencyStopModal;