/**
 * StandardInput Component
 * 
 * Standardized input component that unifies all text input patterns across
 * the application. Provides consistent keyboard handling, validation, and
 * cross-platform compatibility.
 * 
 * @module StandardInput
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';
import { ValidationDisplay } from '../feedback/ValidationDisplay.jsx';

/**
 * StandardInput Component
 * Unified component for all text input patterns
 */
export function StandardInput({
  value = '',
  onChange = () => {},
  onSubmit = () => {},
  onCancel = () => {},
  validation = null,
  type = 'text',
  placeholder = '',
  maxLength = null,
  required = false,
  disabled = false,
  autoFocus = false,
  showValidation = true,
  mask = null,
  allowedChars = null
}) {
  const [internalValue, setInternalValue] = useState(value);
  const [isEditMode, setIsEditMode] = useState(autoFocus);
  const [cursorPosition, setCursorPosition] = useState(value.length);
  const [validationResult, setValidationResult] = useState(null);
  
  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
    setCursorPosition(value.length);
  }, [value]);
  
  // Validate input
  useEffect(() => {
    if (validation && typeof validation === 'function') {
      const result = validation(internalValue);
      setValidationResult(result);
    }
  }, [internalValue, validation]);
  
  /**
   * Get type-specific character filtering
   */
  const getTypeFilter = () => {
    switch (type) {
      case 'number':
        return /^[0-9.-]$/;
      case 'integer':
        return /^[0-9-]$/;
      case 'gcode':
        return /^[A-Za-z0-9\s.+-]$/;
      case 'command':
        return /^[A-Za-z0-9\s$!@#%^&*()_+=\[\]{}|;:'"<>?,./-]$/;
      case 'filename':
        return /^[A-Za-z0-9\s._-]$/;
      case 'text':
      default:
        return null; // Allow all characters
    }
  };
  
  /**
   * Check if character is allowed
   */
  const isCharAllowed = (char) => {
    // Custom allowed characters override type filtering
    if (allowedChars) {
      return allowedChars.test ? allowedChars.test(char) : allowedChars.includes(char);
    }
    
    // Type-based filtering
    const typeFilter = getTypeFilter();
    if (typeFilter) {
      return typeFilter.test(char);
    }
    
    return true;
  };
  
  /**
   * Apply input mask
   */
  const applyMask = (value) => {
    if (!mask) return value;
    
    // Common mask patterns
    if (mask === 'phone') {
      return value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    if (mask === 'gcode-coordinate') {
      return value.toUpperCase().replace(/([XYZ])(\d)/g, '$1$2');
    }
    
    return value;
  };
  
  /**
   * Handle keyboard input
   */
  useInput((input, key) => {
    if (disabled) return;
    
    // Enter edit mode on any keypress if not in edit mode
    if (!isEditMode && !key.escape) {
      setIsEditMode(true);
      return;
    }
    
    if (!isEditMode) return;
    
    // Handle special keys
    if (key.escape) {
      setIsEditMode(false);
      setInternalValue(value); // Reset to original value
      setCursorPosition(value.length);
      onCancel();
      return;
    }
    
    if (key.return) {
      setIsEditMode(false);
      const finalValue = applyMask(internalValue);
      onChange(finalValue);
      onSubmit(finalValue);
      return;
    }
    
    // Backspace/Delete handling (cross-platform)
    if (key.backspace || key.delete || input === '\u0008' || input === '\u007f') {
      if (cursorPosition > 0) {
        const newValue = internalValue.slice(0, cursorPosition - 1) + internalValue.slice(cursorPosition);
        setInternalValue(newValue);
        setCursorPosition(cursorPosition - 1);
        onChange(newValue);
      }
      return;
    }
    
    // Arrow key navigation
    if (key.leftArrow) {
      setCursorPosition(Math.max(0, cursorPosition - 1));
      return;
    }
    
    if (key.rightArrow) {
      setCursorPosition(Math.min(internalValue.length, cursorPosition + 1));
      return;
    }
    
    if (key.home) {
      setCursorPosition(0);
      return;
    }
    
    if (key.end) {
      setCursorPosition(internalValue.length);
      return;
    }
    
    // Character input
    if (input && input.length === 1) {
      // Check character filtering
      if (!isCharAllowed(input)) {
        return;
      }
      
      // Check max length
      if (maxLength && internalValue.length >= maxLength) {
        return;
      }
      
      // Insert character at cursor position
      const newValue = internalValue.slice(0, cursorPosition) + input + internalValue.slice(cursorPosition);
      setInternalValue(newValue);
      setCursorPosition(cursorPosition + 1);
      onChange(newValue);
    }
  });
  
  /**
   * Render the input display
   */
  const renderInput = () => {
    const displayValue = internalValue || placeholder;
    const isPlaceholder = !internalValue && placeholder;
    
    if (!isEditMode) {
      return (
        <Text color={isPlaceholder ? 'gray' : 'white'}>
          {displayValue || '(empty)'}
        </Text>
      );
    }
    
    // Show cursor in edit mode
    const beforeCursor = internalValue.slice(0, cursorPosition);
    const atCursor = internalValue.charAt(cursorPosition) || ' ';
    const afterCursor = internalValue.slice(cursorPosition + 1);
    
    return (
      <Text>
        {beforeCursor}
        <Text inverse>{atCursor}</Text>
        {afterCursor}
      </Text>
    );
  };
  
  /**
   * Get border color based on validation state
   */
  const getBorderColor = () => {
    if (disabled) return 'gray';
    if (!validationResult) return isEditMode ? 'cyan' : 'gray';
    
    if (validationResult.errors?.length > 0) return 'red';
    if (validationResult.warnings?.length > 0) return 'yellow';
    return 'green';
  };
  
  return (
    <Box flexDirection="column">
      {/* Input field */}
      <Box 
        borderStyle="single" 
        borderColor={getBorderColor()}
        paddingX={1}
      >
        {renderInput()}
      </Box>
      
      {/* Validation feedback */}
      {showValidation && validationResult && (
        <ValidationDisplay 
          validation={validationResult}
          variant="compact"
          maxItems={3}
        />
      )}
      
      {/* Help text */}
      {isEditMode && (
        <Box marginTop={1}>
          <Text dimColor>
            [Enter] Save • [Esc] Cancel
            {type === 'gcode' && ' • G-code commands only'}
            {maxLength && ` • Max ${maxLength} chars`}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * Input validation helpers
 */
export const InputValidators = {
  required: (value) => ({
    isValid: Boolean(value?.trim()),
    errors: value?.trim() ? [] : ['This field is required']
  }),
  
  minLength: (min) => (value) => ({
    isValid: !value || value.length >= min,
    errors: value && value.length < min ? [`Minimum ${min} characters required`] : []
  }),
  
  maxLength: (max) => (value) => ({
    isValid: !value || value.length <= max,
    errors: value && value.length > max ? [`Maximum ${max} characters allowed`] : []
  }),
  
  gcode: (value) => {
    const errors = [];
    const warnings = [];
    
    if (value) {
      // Basic G-code validation
      if (!/^[GM]\d+/.test(value.trim())) {
        errors.push('G-code commands should start with G or M followed by numbers');
      }
      
      // Check for dangerous commands
      const dangerous = ['M112', 'M999'];
      if (dangerous.some(cmd => value.includes(cmd))) {
        warnings.push('Dangerous command detected - use with caution');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  },
  
  number: (value) => ({
    isValid: !value || !isNaN(parseFloat(value)),
    errors: value && isNaN(parseFloat(value)) ? ['Must be a valid number'] : []
  })
};

export default StandardInput;