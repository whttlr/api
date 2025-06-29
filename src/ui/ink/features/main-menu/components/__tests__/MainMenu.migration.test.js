/**
 * MainMenu Migration Test
 * 
 * Tests to verify the MainMenu migration to SelectableList maintains
 * all existing functionality while using the new standardized component.
 */

import React from 'react';
import { render } from 'ink-testing-library';
import { MainMenu } from '../MainMenu.jsx';

// Mock the contexts and components
jest.mock('../../../../shared/contexts/index.js', () => ({
  useAppState: () => ({
    navigateTo: jest.fn()
  })
}));

jest.mock('../../../../shared/components/interactive/SelectableList.jsx', () => ({
  SelectableList: ({ items, onSelect, onNavigate, renderItem }) => {
    // Mock SelectableList that renders items and handles basic interaction
    return (
      <div data-testid="selectable-list">
        {items.map((item, index) => (
          <div key={item.id} data-testid={`menu-item-${item.id}`}>
            {renderItem ? renderItem(item, index === 0, index) : item.title}
          </div>
        ))}
      </div>
    );
  }
}));

describe('MainMenu Migration', () => {
  test('should render without crashing', () => {
    const { lastFrame } = render(<MainMenu />);
    expect(lastFrame()).toBeDefined();
  });

  test('should display application title', () => {
    const { lastFrame } = render(<MainMenu />);
    expect(lastFrame()).toContain('CNC G-Code Control System');
  });

  test('should display subtitle', () => {
    const { lastFrame } = render(<MainMenu />);
    expect(lastFrame()).toContain('Select an option to continue');
  });

  test('should use SelectableList component', () => {
    const { getByTestId } = render(<MainMenu />);
    expect(getByTestId('selectable-list')).toBeDefined();
  });

  test('should render all menu items', () => {
    const { getByTestId } = render(<MainMenu />);
    
    // Check that all expected menu items are rendered
    expect(getByTestId('menu-item-gcode-execution')).toBeDefined();
    expect(getByTestId('menu-item-file-browser')).toBeDefined();
    expect(getByTestId('menu-item-manual-control')).toBeDefined();
    expect(getByTestId('menu-item-connection')).toBeDefined();
    expect(getByTestId('menu-item-settings')).toBeDefined();
    expect(getByTestId('menu-item-quit')).toBeDefined();
  });

  test('should display instructions', () => {
    const { lastFrame } = render(<MainMenu />);
    expect(lastFrame()).toContain('Use ↑↓ keys or shortcuts, Enter to select');
  });

  test('should have proper menu item structure', () => {
    const { getMenuItems } = require('../MainMenu.jsx');
    const items = getMenuItems();
    
    // Check that all items have required properties
    items.forEach(item => {
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('key');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('icon');
    });
  });

  test('should find menu items by ID', () => {
    const { findMenuItem } = require('../MainMenu.jsx');
    
    const connectionItem = findMenuItem('connection');
    expect(connectionItem).toBeDefined();
    expect(connectionItem.title).toBe('Connection');
    
    const nonExistentItem = findMenuItem('non-existent');
    expect(nonExistentItem).toBeNull();
  });
});

describe('MainMenu Data Structure', () => {
  test('should have standardized menu item format', () => {
    const { getMenuItems } = require('../MainMenu.jsx');
    const items = getMenuItems();
    
    items.forEach(item => {
      // Check standardized format for SelectableList
      expect(typeof item.id).toBe('string');
      expect(typeof item.title).toBe('string');
      expect(typeof item.key).toBe('string');
      expect(typeof item.description).toBe('string');
      expect(typeof item.icon).toBe('string');
      
      // Ensure icons are present
      expect(item.icon.length).toBeGreaterThan(0);
      
      // Ensure descriptions are not empty
      expect(item.description.length).toBeGreaterThan(0);
    });
  });

  test('should maintain all original functionality', () => {
    const { getMenuItems } = require('../MainMenu.jsx');
    const items = getMenuItems();
    
    // Check that we have all expected menu items
    const expectedIds = [
      'gcode-execution',
      'file-browser', 
      'manual-control',
      'connection',
      'settings',
      'quit'
    ];
    
    const actualIds = items.map(item => item.id);
    expectedIds.forEach(id => {
      expect(actualIds).toContain(id);
    });
  });
});