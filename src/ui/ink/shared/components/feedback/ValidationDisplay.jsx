/**
 * ValidationDisplay Component
 * 
 * Standardized validation feedback component that unifies all error, warning,
 * and suggestion display patterns across the application.
 * 
 * @module ValidationDisplay
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * ValidationDisplay Component
 * Unified component for all validation feedback patterns
 */
export function ValidationDisplay({
  validation = {},
  variant = 'detailed',
  showIcons = true,
  maxItems = null,
  compact = false
}) {
  const {
    isValid = true,
    errors = [],
    warnings = [],
    suggestions = [],
    info = []
  } = validation;
  
  // Return nothing if validation is valid and no additional messages
  if (isValid && errors.length === 0 && warnings.length === 0 && suggestions.length === 0 && info.length === 0) {
    return null;
  }
  
  /**
   * Get icon for message type
   */
  const getIcon = (type) => {
    if (!showIcons) return '';
    
    const icons = {
      error: '❌',
      warning: '⚠️',
      suggestion: '💡',
      info: 'ℹ️'
    };
    
    return icons[type] || '';
  };
  
  /**
   * Get color for message type
   */
  const getColor = (type) => {
    const colors = {
      error: 'red',
      warning: 'yellow',
      suggestion: 'green',
      info: 'blue'
    };
    
    return colors[type] || 'white';
  };
  
  /**
   * Render message list
   */
  const renderMessages = (messages, type) => {
    if (messages.length === 0) return null;
    
    const icon = getIcon(type);
    const color = getColor(type);
    const displayMessages = maxItems ? messages.slice(0, maxItems) : messages;
    const hasMore = maxItems && messages.length > maxItems;
    
    if (compact) {
      return (
        <Box key={type}>
          <Text color={color}>
            {icon && `${icon} `}
            {displayMessages.join(', ')}
            {hasMore && ` (+${messages.length - maxItems} more)`}
          </Text>
        </Box>
      );
    }
    
    return (
      <Box key={type} flexDirection="column">
        {displayMessages.map((message, index) => (
          <Box key={index}>
            <Text color={color}>
              {icon && `${icon} `}• {message}
            </Text>
          </Box>
        ))}
        {hasMore && (
          <Box>
            <Text color={color} dimColor>
              {icon && `${icon} `}• ... and {messages.length - maxItems} more {type}s
            </Text>
          </Box>
        )}
      </Box>
    );
  };
  
  /**
   * Get variant-specific styling
   */
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return { paddingX: 0, paddingY: 0, marginY: 0 };
      case 'inline':
        return { paddingX: 1, paddingY: 0, marginY: 0 };
      case 'bordered':
        return { 
          borderStyle: 'single', 
          borderColor: errors.length > 0 ? 'red' : warnings.length > 0 ? 'yellow' : 'gray',
          paddingX: 1, 
          paddingY: 1,
          marginY: 1
        };
      case 'detailed':
      default:
        return { paddingX: 1, paddingY: 1, marginY: 1 };
    }
  };
  
  const styles = getVariantStyles();
  
  return (
    <Box flexDirection="column" {...styles}>
      {/* Errors first (highest priority) */}
      {renderMessages(errors, 'error')}
      
      {/* Warnings second */}
      {renderMessages(warnings, 'warning')}
      
      {/* Suggestions third */}
      {renderMessages(suggestions, 'suggestion')}
      
      {/* Info last */}
      {renderMessages(info, 'info')}
    </Box>
  );
}

/**
 * Validation result helper for creating consistent validation objects
 */
export function createValidationResult(isValid = true, messages = {}) {
  return {
    isValid,
    errors: messages.errors || [],
    warnings: messages.warnings || [],
    suggestions: messages.suggestions || [],
    info: messages.info || []
  };
}

/**
 * Validation result builder for chaining validation checks
 */
export class ValidationBuilder {
  constructor() {
    this.result = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      info: []
    };
  }
  
  addError(message) {
    this.result.errors.push(message);
    this.result.isValid = false;
    return this;
  }
  
  addWarning(message) {
    this.result.warnings.push(message);
    return this;
  }
  
  addSuggestion(message) {
    this.result.suggestions.push(message);
    return this;
  }
  
  addInfo(message) {
    this.result.info.push(message);
    return this;
  }
  
  build() {
    return this.result;
  }
}

export default ValidationDisplay;