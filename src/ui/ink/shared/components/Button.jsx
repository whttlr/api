import React from 'react';
import { Box, Text } from 'ink';

export function Button({ 
  children, 
  onPress, 
  variant = 'default', 
  selected = false, 
  disabled = false,
  width = 'auto',
  ...props 
}) {
  const getButtonStyle = () => {
    if (disabled) {
      return { color: 'gray', dimColor: true };
    }
    
    if (selected) {
      switch (variant) {
        case 'primary':
          return { color: 'black', backgroundColor: 'green' };
        case 'danger':
          return { color: 'white', backgroundColor: 'red' };
        case 'warning':
          return { color: 'black', backgroundColor: 'yellow' };
        default:
          return { color: 'black', backgroundColor: 'white' };
      }
    }
    
    switch (variant) {
      case 'primary':
        return { color: 'green' };
      case 'danger':
        return { color: 'red' };
      case 'warning':
        return { color: 'yellow' };
      default:
        return { color: 'white' };
    }
  };

  const style = getButtonStyle();

  return (
    <Box 
      borderStyle={selected ? 'double' : 'single'} 
      borderColor={style.color}
      paddingX={1}
      width={width}
      {...props}
    >
      <Text 
        {...style}
        bold={selected}
      >
        {children}
      </Text>
    </Box>
  );
}