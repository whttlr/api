/**
 * SelectableList Component
 * 
 * Standardized selectable list component that unifies all list selection patterns
 * across the application. Provides consistent keyboard navigation, visual styling,
 * and interaction patterns.
 * 
 * @module SelectableList
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { useInput } from 'ink';

/**
 * SelectableList Component
 * Unified component for all list selection patterns in the application
 */
export function SelectableList({
  items = [],
  selectedId = null,
  onSelect = () => {},
  onNavigate = () => {},
  renderItem = null,
  variant = 'bordered',
  showIcons = true,
  showDescriptions = true,
  keyboardEnabled = true,
  emptyMessage = 'No items available',
  maxHeight = null
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  // Update selected index when selectedId prop changes
  useEffect(() => {
    if (selectedId) {
      const index = items.findIndex(item => item.id === selectedId);
      if (index !== -1) {
        setSelectedIndex(index);
      }
    }
  }, [selectedId, items]);
  
  // Filter out disabled items for navigation
  const enabledItems = items.filter(item => !item.disabled);
  const enabledIndex = enabledItems.findIndex(item => item.id === items[selectedIndex]?.id);
  
  /**
   * Handle keyboard navigation
   */
  useInput((input, key) => {
    if (!keyboardEnabled || items.length === 0) return;
    
    // Arrow key navigation
    if (key.upArrow) {
      const newIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
      setSelectedIndex(newIndex);
      onNavigate('up', items[newIndex]);
    }
    
    if (key.downArrow) {
      const newIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
      setSelectedIndex(newIndex);
      onNavigate('down', items[newIndex]);
    }
    
    // Selection
    if (key.return && items[selectedIndex] && !items[selectedIndex].disabled) {
      onSelect(items[selectedIndex]);
    }
    
    // Number key shortcuts
    const numberKey = parseInt(input);
    if (!isNaN(numberKey) && numberKey > 0 && numberKey <= items.length) {
      const targetIndex = numberKey - 1;
      if (!items[targetIndex].disabled) {
        setSelectedIndex(targetIndex);
        onSelect(items[targetIndex]);
      }
    }
    
    // Letter key shortcuts
    if (input && input.length === 1) {
      const matchingItem = items.find(item => 
        item.key === input && !item.disabled
      );
      if (matchingItem) {
        const index = items.indexOf(matchingItem);
        setSelectedIndex(index);
        onSelect(matchingItem);
      }
    }
  });
  
  /**
   * Default item renderer
   */
  const defaultRenderItem = (item, isSelected, index) => {
    const prefix = isSelected ? '→ ' : '  ';
    const icon = showIcons && item.icon ? `${item.icon} ` : '';
    const shortcut = item.key ? `[${item.key}] ` : `[${index + 1}] `;
    const title = item.title || item.label || item.name || 'Untitled';
    const description = showDescriptions && item.description ? ` - ${item.description}` : '';
    
    return (
      <Text color={isSelected ? 'cyan' : item.disabled ? 'gray' : 'white'}>
        {prefix}{shortcut}{icon}{title}{description}
      </Text>
    );
  };
  
  /**
   * Get variant-specific styling
   */
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return { borderStyle: undefined, paddingX: 0, paddingY: 0 };
      case 'detailed':
        return { borderStyle: 'double', paddingX: 2, paddingY: 1, borderColor: 'blue' };
      case 'bordered':
      default:
        return { borderStyle: 'single', paddingX: 1, paddingY: 1, borderColor: 'gray' };
    }
  };
  
  const styles = getVariantStyles();
  const itemRenderer = renderItem || defaultRenderItem;
  
  // Handle empty state
  if (items.length === 0) {
    return (
      <Box width="100%" {...styles}>
        <Text dimColor>{emptyMessage}</Text>
      </Box>
    );
  }
  
  // Prepare items for rendering
  const itemsToRender = maxHeight ? items.slice(0, maxHeight) : items;
  
  return (
    <Box flexDirection="column" width="100%" {...styles}>
      {itemsToRender.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <Box key={item.id || index} width="100%">
            {itemRenderer(item, isSelected, index)}
          </Box>
        );
      })}
      
      {maxHeight && items.length > maxHeight && (
        <Box marginTop={1} width="100%">
          <Text dimColor>... and {items.length - maxHeight} more items</Text>
        </Box>
      )}
    </Box>
  );
}

export default SelectableList;