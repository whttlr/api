import React from 'react';
import { Box, Text } from 'ink';

export function Modal({ 
  isOpen, 
  title, 
  children, 
  onClose, 
  width = 60, 
  height = 20 
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <Box
      position="absolute"
      top={2}
      left="50%"
      marginLeft={-Math.floor(width / 2)}
      width={width}
      height={height}
      borderStyle="double"
      borderColor="white"
      backgroundColor="black"
      flexDirection="column"
    >
      {title && (
        <Box 
          borderStyle="single" 
          borderBottom={true}
          borderColor="gray"
          paddingX={1}
          marginBottom={1}
        >
          <Text bold color="white">
            {title}
          </Text>
        </Box>
      )}
      
      <Box 
        flexDirection="column" 
        paddingX={1}
        flex={1}
      >
        {children}
      </Box>
      
      <Box 
        borderStyle="single" 
        borderTop={true}
        borderColor="gray"
        paddingX={1}
        justifyContent="center"
      >
        <Text dimColor>
          Press ESC to close
        </Text>
      </Box>
    </Box>
  );
}