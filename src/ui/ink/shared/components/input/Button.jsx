/**
 * Button Components
 * 
 * Reusable button components with various styles and states for the CNC UI.
 * Includes standard buttons, icon buttons, and text-based selections.
 * 
 * @module Button
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Standard Button Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {boolean} props.selected - Whether button is selected/focused
 * @param {string} props.variant - Button style variant
 * @param {Function} props.onPress - Click handler (for documentation)
 * @param {boolean} props.disabled - Whether button is disabled
 * @param {number} props.width - Fixed width for button
 */
export function Button({ 
  children, 
  selected = false, 
  variant = 'default', 
  onPress,
  disabled = false,
  width 
}) {
  const getStyle = () => {
    if (disabled) {
      return { color: 'gray', borderColor: 'gray' };
    }
    
    if (selected) {
      switch (variant) {
        case 'primary': 
          return { color: 'green', borderColor: 'green' };
        case 'danger': 
          return { color: 'red', borderColor: 'red' };
        case 'warning': 
          return { color: 'yellow', borderColor: 'yellow' };
        case 'success':
          return { color: 'green', borderColor: 'green' };
        case 'info':
          return { color: 'cyan', borderColor: 'cyan' };
        default: 
          return { color: 'cyan', borderColor: 'cyan' };
      }
    }
    return { color: 'white', borderColor: 'gray' };
  };

  const style = getStyle();

  return (
    <Box 
      borderStyle={selected ? 'double' : 'single'} 
      borderColor={style.borderColor}
      paddingX={1}
      width={width}
      justifyContent="center"
    >
      <Text color={style.color} bold={selected} dimColor={disabled}>
        {children}
      </Text>
    </Box>
  );
}

/**
 * Text-based Selection Item (for condensed lists)
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Item content
 * @param {boolean} props.selected - Whether item is selected
 * @param {string} props.variant - Color variant
 * @param {string} props.prefix - Prefix text/symbol
 * @param {boolean} props.showArrow - Whether to show selection arrow
 */
export function SelectionItem({ 
  children, 
  selected = false, 
  variant = 'default',
  prefix = '',
  showArrow = true 
}) {
  const getColor = () => {
    switch (variant) {
      case 'danger': return 'red';
      case 'warning': return 'yellow';
      case 'success': return 'green';
      case 'info': return 'cyan';
      default: return 'white';
    }
  };

  const arrow = showArrow && selected ? '→ ' : '  ';
  const prefixText = prefix ? `${prefix} ` : '';

  return (
    <Text 
      bold={selected}
      color={getColor()}
      dimColor={!selected}
    >
      {arrow}{prefixText}{children}
    </Text>
  );
}

/**
 * Menu Item Component (keyboard shortcut + label)
 * @param {Object} props - Component props
 * @param {string} props.key - Keyboard shortcut key
 * @param {string} props.label - Item label
 * @param {boolean} props.selected - Whether item is selected
 * @param {string} props.variant - Color variant
 */
export function MenuItem({ 
  shortcutKey, 
  label, 
  selected = false, 
  variant = 'default' 
}) {
  return (
    <SelectionItem 
      selected={selected} 
      variant={variant}
      prefix={`[${shortcutKey}]`}
    >
      {label}
    </SelectionItem>
  );
}

/**
 * Icon Button Component
 * @param {Object} props - Component props
 * @param {string} props.icon - Icon/emoji to display
 * @param {string} props.label - Button label
 * @param {boolean} props.selected - Whether button is selected
 * @param {string} props.variant - Color variant
 * @param {boolean} props.compact - Whether to use compact layout
 */
export function IconButton({ 
  icon, 
  label, 
  selected = false, 
  variant = 'default',
  compact = false 
}) {
  const getColor = () => {
    switch (variant) {
      case 'danger': return 'red';
      case 'warning': return 'yellow';
      case 'success': return 'green';
      case 'info': return 'cyan';
      default: return selected ? 'cyan' : 'white';
    }
  };

  if (compact) {
    return (
      <Text color={getColor()} bold={selected} dimColor={!selected}>
        {icon} {label}
      </Text>
    );
  }

  return (
    <Box 
      borderStyle={selected ? 'double' : 'single'} 
      borderColor={selected ? getColor() : 'gray'}
      paddingX={1}
      alignItems="center"
    >
      <Text color={getColor()} bold={selected}>
        {icon} {label}
      </Text>
    </Box>
  );
}

/**
 * Toggle Button Component
 * @param {Object} props - Component props
 * @param {boolean} props.enabled - Whether toggle is enabled
 * @param {string} props.label - Toggle label
 * @param {string} props.enabledText - Text when enabled
 * @param {string} props.disabledText - Text when disabled
 * @param {boolean} props.selected - Whether button is selected/focused
 */
export function ToggleButton({ 
  enabled, 
  label, 
  enabledText = 'ON', 
  disabledText = 'OFF',
  selected = false 
}) {
  const statusColor = enabled ? 'green' : 'red';
  const statusText = enabled ? enabledText : disabledText;

  return (
    <Box 
      borderStyle={selected ? 'double' : 'single'} 
      borderColor={selected ? 'cyan' : 'gray'}
      paddingX={1}
      justifyContent="space-between"
      width={20}
    >
      <Text color={selected ? 'cyan' : 'white'} bold={selected}>
        {label}
      </Text>
      <Text color={statusColor} bold>
        {statusText}
      </Text>
    </Box>
  );
}

/**
 * Progress Button (shows progress bar inside button)
 * @param {Object} props - Component props
 * @param {string} props.label - Button label
 * @param {number} props.progress - Progress percentage (0-100)
 * @param {boolean} props.selected - Whether button is selected
 * @param {string} props.variant - Color variant
 */
export function ProgressButton({ 
  label, 
  progress = 0, 
  selected = false, 
  variant = 'default' 
}) {
  const getColor = () => {
    switch (variant) {
      case 'success': return 'green';
      case 'warning': return 'yellow';
      case 'danger': return 'red';
      default: return 'cyan';
    }
  };

  const normalizedProgress = Math.max(0, Math.min(100, progress));
  const barWidth = 20;
  const filledWidth = Math.round((normalizedProgress / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;

  return (
    <Box 
      borderStyle={selected ? 'double' : 'single'} 
      borderColor={selected ? getColor() : 'gray'}
      paddingX={1}
      flexDirection="column"
    >
      <Text color={selected ? getColor() : 'white'} bold={selected}>
        {label}
      </Text>
      <Box>
        <Text color={getColor()}>{'█'.repeat(filledWidth)}</Text>
        <Text color="gray">{'░'.repeat(emptyWidth)}</Text>
        <Text color="white"> {normalizedProgress.toFixed(0)}%</Text>
      </Box>
    </Box>
  );
}

// Default export
export default Button;