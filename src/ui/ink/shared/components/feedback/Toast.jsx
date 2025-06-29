/**
 * Toast Notification Components
 * 
 * Non-intrusive notification system with auto-dismiss and manual dismissal.
 * Supports different message types with appropriate styling and icons.
 * 
 * @module Toast
 */

import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useToast } from '../../contexts/ToastContext.js';

/**
 * Individual Toast Message Component
 * @param {Object} props - Component props
 * @param {Object} props.toast - Toast object with id, type, message, duration
 * @param {Function} props.onDismiss - Callback to dismiss this toast
 * @param {boolean} props.interactive - Whether toast can be dismissed with ESC
 * @param {boolean} props.compact - Whether to use compact layout
 */
export function ToastMessage({ 
  toast, 
  onDismiss, 
  interactive = true,
  compact = false 
}) {
  const { type, message } = toast;
  
  const getToastStyle = () => {
    switch (type) {
      case 'error':
        return { borderColor: 'red', textColor: 'red' };
      case 'success':
        return { borderColor: 'green', textColor: 'green' };
      case 'warning':
        return { borderColor: 'yellow', textColor: 'yellow' };
      case 'info':
        return { borderColor: 'cyan', textColor: 'cyan' };
      default:
        return { borderColor: 'blue', textColor: 'blue' };
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'error': return '❌';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '💬';
    }
  };
  
  const style = getToastStyle();
  
  useInput((input, key) => {
    if (interactive && key.escape) {
      onDismiss();
    }
  });
  
  if (compact) {
    return (
      <Box paddingX={1}>
        <Text color={style.textColor}>
          {getIcon()} {message}
        </Text>
      </Box>
    );
  }
  
  return (
    <Box 
      borderStyle="round" 
      borderColor={style.borderColor}
      paddingX={1}
      paddingY={0}
      flexDirection="column"
      minWidth={30}
      maxWidth={50}
    >
      <Box>
        <Text color={style.textColor}>
          {getIcon()} {message}
        </Text>
      </Box>
      {interactive && (
        <Box justifyContent="flex-end" marginTop={1}>
          <Text dimColor>[ESC] Dismiss</Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Toast Notifications Container
 * Displays all active toasts in a stack
 * @param {Object} props - Component props
 * @param {string} props.position - Position ('top-right', 'top-left', 'bottom-right', 'bottom-left')
 * @param {number} props.maxToasts - Maximum number of toasts to show
 * @param {boolean} props.interactive - Whether toasts can be dismissed manually
 */
export function ToastNotifications({ 
  position = 'top-right',
  maxToasts = 5,
  interactive = true 
}) {
  const { toasts, removeToast } = useToast();
  
  if (toasts.length === 0) return null;
  
  const visibleToasts = toasts.slice(0, maxToasts);
  
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return { top: 1, left: 1 };
      case 'bottom-right':
        return { bottom: 1, right: 1 };
      case 'bottom-left':
        return { bottom: 1, left: 1 };
      default: // top-right
        return { top: 1, right: 1 };
    }
  };
  
  return (
    <Box 
      position="absolute" 
      {...getPositionStyles()}
      flexDirection="column" 
      gap={1}
      width={50}
    >
      {visibleToasts.map(toast => (
        <ToastMessage 
          key={toast.id} 
          toast={toast} 
          onDismiss={() => removeToast(toast.id)}
          interactive={interactive}
        />
      ))}
      {toasts.length > maxToasts && (
        <Box paddingX={1}>
          <Text dimColor>
            ... and {toasts.length - maxToasts} more
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Inline Toast (for embedding in forms/screens)
 * @param {Object} props - Component props
 * @param {string} props.message - Toast message
 * @param {string} props.type - Toast type
 * @param {boolean} props.show - Whether to show the toast
 * @param {Function} props.onDismiss - Dismiss callback
 */
export function InlineToast({ 
  message, 
  type = 'info', 
  show = false,
  onDismiss 
}) {
  if (!show) return null;
  
  const toast = { type, message, id: 'inline' };
  
  return (
    <ToastMessage 
      toast={toast}
      onDismiss={onDismiss}
      interactive={!!onDismiss}
      compact={false}
    />
  );
}

/**
 * Toast Banner (full-width notification)
 * @param {Object} props - Component props
 * @param {string} props.message - Banner message
 * @param {string} props.type - Banner type
 * @param {boolean} props.show - Whether to show the banner
 * @param {Function} props.onDismiss - Dismiss callback
 */
export function ToastBanner({ 
  message, 
  type = 'info', 
  show = false,
  onDismiss 
}) {
  if (!show) return null;
  
  const getStyle = () => {
    switch (type) {
      case 'error':
        return { backgroundColor: 'red', color: 'white' };
      case 'success':
        return { backgroundColor: 'green', color: 'white' };
      case 'warning':
        return { backgroundColor: 'yellow', color: 'black' };
      default:
        return { backgroundColor: 'cyan', color: 'black' };
    }
  };
  
  const getIcon = () => {
    switch (type) {
      case 'error': return '❌';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };
  
  const style = getStyle();
  
  useInput((input, key) => {
    if (onDismiss && key.escape) {
      onDismiss();
    }
  });
  
  return (
    <Box 
      backgroundColor={style.backgroundColor}
      paddingX={2}
      paddingY={1}
      justifyContent="space-between"
      width="100%"
    >
      <Text color={style.color} bold>
        {getIcon()} {message}
      </Text>
      {onDismiss && (
        <Text color={style.color} dimColor>
          [ESC] Dismiss
        </Text>
      )}
    </Box>
  );
}

/**
 * Hook to quickly show toasts
 * @returns {Object} Toast helper functions
 */
export function useToastHelpers() {
  const { showError, showSuccess, showWarning, showInfo } = useToast();
  
  return {
    showError: (error, context) => showError(error, context),
    showSuccess: (message) => showSuccess(message),
    showWarning: (message) => showWarning(message),
    showInfo: (message) => showInfo(message),
    
    // Convenience methods
    notifySuccess: (action) => showSuccess(`${action} completed successfully`),
    notifyError: (action, error) => showError(`${action} failed: ${error}`, 'action'),
    notifyConnected: (port) => showSuccess(`Connected to ${port}`),
    notifyDisconnected: () => showInfo('Disconnected from machine'),
    notifyJobComplete: () => showSuccess('Job completed successfully'),
    notifyJobStopped: () => showWarning('Job stopped by user'),
    notifyEmergencyStop: () => showError('Emergency stop activated', 'emergency')
  };
}

// Default export
export default ToastNotifications;