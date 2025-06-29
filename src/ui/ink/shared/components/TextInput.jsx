import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export function TextInput({ 
  value = '', 
  onChange, 
  onSubmit,
  placeholder = '',
  multiline = false,
  focus = false,
  width = 40,
  maxLength
}) {
  const [isFocused, setIsFocused] = useState(focus);
  const [cursor, setCursor] = useState(value.length);

  useInput((input, key) => {
    if (!isFocused) return;

    if (key.return) {
      if (multiline && !key.ctrl) {
        const newValue = value.slice(0, cursor) + '\n' + value.slice(cursor);
        onChange?.(newValue);
        setCursor(cursor + 1);
      } else {
        onSubmit?.(value);
      }
      return;
    }

    if (key.backspace) {
      if (cursor > 0) {
        const newValue = value.slice(0, cursor - 1) + value.slice(cursor);
        onChange?.(newValue);
        setCursor(cursor - 1);
      }
      return;
    }

    if (key.delete) {
      if (cursor < value.length) {
        const newValue = value.slice(0, cursor) + value.slice(cursor + 1);
        onChange?.(newValue);
      }
      return;
    }

    if (key.leftArrow) {
      setCursor(Math.max(0, cursor - 1));
      return;
    }

    if (key.rightArrow) {
      setCursor(Math.min(value.length, cursor + 1));
      return;
    }

    if (input && (!maxLength || value.length < maxLength)) {
      const newValue = value.slice(0, cursor) + input + value.slice(cursor);
      onChange?.(newValue);
      setCursor(cursor + 1);
    }
  });

  const displayValue = value || placeholder;
  const isPlaceholder = !value && placeholder;

  if (multiline) {
    const lines = displayValue.split('\n');
    return (
      <Box 
        flexDirection="column" 
        borderStyle={isFocused ? 'double' : 'single'}
        borderColor={isFocused ? 'green' : 'gray'}
        width={width}
        paddingX={1}
      >
        {lines.map((line, index) => (
          <Text 
            key={index}
            dimColor={isPlaceholder}
          >
            {line}
          </Text>
        ))}
        {isFocused && (
          <Text color="green">
            █
          </Text>
        )}
      </Box>
    );
  }

  return (
    <Box 
      borderStyle={isFocused ? 'double' : 'single'}
      borderColor={isFocused ? 'green' : 'gray'}
      width={width}
      paddingX={1}
    >
      <Text dimColor={isPlaceholder}>
        {displayValue}
      </Text>
      {isFocused && (
        <Text color="green">
          █
        </Text>
      )}
    </Box>
  );
}