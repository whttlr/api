/**
 * Main Menu Component
 * 
 * Primary navigation menu for the CNC application with keyboard shortcuts
 * and visual selection indicators. Now using standardized SelectableList.
 * 
 * @module MainMenu
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../../../shared/contexts/index.js';
import { SelectableList } from '../../../shared/components/interactive/SelectableList.jsx';

/**
 * Menu Items Configuration
 */
const MENU_ITEMS = [
  { 
    id: 'gcode-execution', 
    title: 'Execute G-Code', 
    key: '1', 
    description: 'Enter or select G-code to execute',
    // icon: '⚙️'
  },
  { 
    id: 'file-browser', 
    title: 'File Browser', 
    key: '2', 
    description: 'Browse and manage G-code files',
    // icon: '📁'
  },
  { 
    id: 'manual-control', 
    title: 'Manual Control', 
    key: '3', 
    description: 'Manually control machine position and spindle',
    // icon: '🎮'
  },
  { 
    id: 'connection', 
    title: 'Connection', 
    key: 'c', 
    description: 'Manage machine connection',
    // icon: '🔌'
  },
  { 
    id: 'settings', 
    title: 'Settings', 
    key: '4', 
    description: 'Configure machine and user preferences',
    // icon: '⚙️'
  },
  { 
    id: 'quit', 
    title: 'Quit', 
    key: 'q', 
    description: 'Exit the application',
    // icon: '🚪'
  }
];

/**
 * Custom menu item renderer for special styling
 * @param {Object} item - Menu item object
 * @param {boolean} isSelected - Whether item is selected
 * @param {number} index - Item index
 */
function customMenuItemRenderer(item, isSelected, index) {
  const prefix = isSelected ? '→ ' : '  ';
  const icon = item.icon ? `${item.icon} ` : '';
  const shortcut = `[${item.key}] `;
  const title = item.title;
  
  return (
    <Text 
      bold={isSelected}
      color={item.id === 'quit' ? 'red' : 'white'}
      dimColor={!isSelected}
    >
      {prefix}{shortcut}{icon}{title}
    </Text>
  );
}

/**
 * Menu Description Display
 * @param {Object} props - Component props
 * @param {Object} props.selectedItem - Currently selected menu item
 */
function MenuDescription({ selectedItem }) {
  return (
    <Box marginTop={2} marginBottom={2} height={3} flexDirection="column" justifyContent="center" width="100%">
      <Box borderStyle="single" borderColor="gray" paddingX={2} paddingY={1} width="100%">
        <Text dimColor>
          {selectedItem?.description || 'Select an option to see description'}
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Main Menu Component
 * Handles navigation and menu item selection using standardized SelectableList
 */
export function MainMenu() {
  const [selectedItem, setSelectedItem] = useState(MENU_ITEMS[0]);
  const { navigateTo } = useAppState();

  const handleSelect = (item) => {
    if (item.id === 'quit') {
      process.exit(0);
    } else {
      navigateTo(item.id);
    }
  };

  const handleNavigate = (direction, item) => {
    setSelectedItem(item);
  };

  return (
    <Box flexDirection="column" width="100%" paddingY={2} paddingX={4}>
      {/* Application Title */}
      <Box marginBottom={2} justifyContent="center">
        <Text bold color="green">
          CNC G-Code Control System
        </Text>
      </Box>
      
      {/* Subtitle */}
      <Box marginBottom={3} justifyContent="center">
        <Text dimColor>
          Select an option to continue
        </Text>
      </Box>

      {/* Menu Items using SelectableList */}
      <Box flexDirection="column" width="100%">
        <SelectableList
          items={MENU_ITEMS}
          onSelect={handleSelect}
          onNavigate={handleNavigate}
          renderItem={customMenuItemRenderer}
          variant="compact"
          showIcons={false}
          showDescriptions={false}
          keyboardEnabled={true}
        />
      </Box>

      {/* Menu Description */}
      <MenuDescription selectedItem={selectedItem} />

      {/* Instructions */}
      <Box justifyContent="center" width="100%">
        <Text dimColor>
          Use ↑↓ keys or shortcuts, Enter to select
        </Text>
      </Box>
    </Box>
  );
}

/**
 * Get menu items (for external use)
 * @returns {Array} Array of menu item objects
 */
export function getMenuItems() {
  return [...MENU_ITEMS];
}

/**
 * Find menu item by ID
 * @param {string} id - Menu item ID
 * @returns {Object|null} Menu item object or null
 */
export function findMenuItem(id) {
  return MENU_ITEMS.find(item => item.id === id) || null;
}

// Default export
export default MainMenu;