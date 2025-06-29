/**
 * ConfirmationModal Component
 * 
 * Standardized confirmation modal component that unifies all confirmation
 * dialog patterns across the application.
 * 
 * @module ConfirmationModal
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';

/**
 * ConfirmationModal Component
 * Unified component for all confirmation dialog patterns
 */
export function ConfirmationModal({
  isOpen = false,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  details = null,
  variant = 'info',
  confirmText = 'Yes',
  cancelText = 'No',
  onConfirm = () => {},
  onCancel = () => {},
  defaultButton = 'cancel',
  showShortcuts = true,
  width = 50
}) {
  
  // Don't render if not open
  if (!isOpen) return null;
  
  /**
   * Handle keyboard input
   */
  useInput((input, key) => {
    // ESC always cancels
    if (key.escape) {
      onCancel();
      return;
    }
    
    // Enter confirms or cancels based on default
    if (key.return) {
      if (defaultButton === 'confirm') {
        onConfirm();
      } else {
        onCancel();
      }
      return;
    }
    
    // Y/N shortcuts
    if (input?.toLowerCase() === 'y') {
      onConfirm();
      return;
    }
    
    if (input?.toLowerCase() === 'n') {
      onCancel();
      return;
    }
    
    // Tab to switch default button (future enhancement)
  });
  
  /**
   * Get variant-specific styling
   */
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          borderColor: 'yellow',
          titleColor: 'yellow',
          icon: '⚠️'
        };
      case 'danger':
        return {
          borderColor: 'red',
          titleColor: 'red',
          icon: '🚨'
        };
      case 'success':
        return {
          borderColor: 'green',
          titleColor: 'green',
          icon: '✅'
        };
      case 'info':
      default:
        return {
          borderColor: 'blue',
          titleColor: 'blue',
          icon: 'ℹ️'
        };
    }
  };
  
  const styles = getVariantStyles();
  
  /**
   * Render button with highlighting
   */
  const renderButton = (text, isDefault, shortcut) => {
    const buttonText = showShortcuts && shortcut ? `[${shortcut}] ${text}` : text;
    
    return (
      <Box 
        borderStyle={isDefault ? 'single' : undefined}
        borderColor={isDefault ? styles.borderColor : undefined}
        paddingX={1}
      >
        <Text color={isDefault ? styles.titleColor : 'white'}>
          {buttonText}
        </Text>
      </Box>
    );
  };
  
  return (
    <Box
      position="absolute"
      top={5}
      left="50%"
      transform="translateX(-50%)"
      width={width}
      flexDirection="column"
      borderStyle="double"
      borderColor={styles.borderColor}
      paddingX={2}
      paddingY={1}
      backgroundColor="black"
    >
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={styles.titleColor}>
          {styles.icon} {title}
        </Text>
      </Box>
      
      {/* Separator */}
      <Box marginBottom={1}>
        <Text color={styles.borderColor}>
          {'─'.repeat(width - 6)}
        </Text>
      </Box>
      
      {/* Message */}
      <Box marginBottom={1}>
        <Text wrap="wrap">{message}</Text>
      </Box>
      
      {/* Details (optional) */}
      {details && (
        <Box marginBottom={1}>
          <Text dimColor wrap="wrap">{details}</Text>
        </Box>
      )}
      
      {/* Buttons */}
      <Box justifyContent="space-between" marginTop={1}>
        <Box gap={2}>
          {renderButton(confirmText, defaultButton === 'confirm', 'Y')}
          {renderButton(cancelText, defaultButton === 'cancel', 'N')}
        </Box>
        
        {showShortcuts && (
          <Box>
            <Text dimColor>[ESC] Cancel</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Pre-configured confirmation modal variants
 */
export const ConfirmationModals = {
  /**
   * Dangerous action confirmation
   */
  DangerousAction: (props) => (
    <ConfirmationModal
      variant="danger"
      title="Dangerous Action"
      confirmText="I Understand"
      cancelText="Cancel"
      defaultButton="cancel"
      {...props}
    />
  ),
  
  /**
   * Delete confirmation
   */
  Delete: (props) => (
    <ConfirmationModal
      variant="warning"
      title="Delete Item"
      message="This action cannot be undone."
      confirmText="Delete"
      cancelText="Keep"
      defaultButton="cancel"
      {...props}
    />
  ),
  
  /**
   * Save changes confirmation
   */
  SaveChanges: (props) => (
    <ConfirmationModal
      variant="info"
      title="Save Changes"
      message="Do you want to save your changes?"
      confirmText="Save"
      cancelText="Discard"
      defaultButton="confirm"
      {...props}
    />
  ),
  
  /**
   * Command execution confirmation
   */
  ExecuteCommand: (props) => (
    <ConfirmationModal
      variant="warning"
      title="Execute Command"
      confirmText="Execute"
      cancelText="Cancel"
      defaultButton="cancel"
      {...props}
    />
  ),
  
  /**
   * Emergency stop confirmation
   */
  EmergencyStop: (props) => (
    <ConfirmationModal
      variant="danger"
      title="Emergency Stop"
      message="This will immediately stop all machine operations."
      confirmText="STOP NOW"
      cancelText="Cancel"
      defaultButton="confirm"
      {...props}
    />
  )
};

export default ConfirmationModal;