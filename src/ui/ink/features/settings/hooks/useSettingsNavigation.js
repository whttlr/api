/**
 * useSettingsNavigation Hook
 * 
 * Navigation state management for settings sections and keyboard input handling.
 * 
 * @module useSettingsNavigation
 */

import { useState, useCallback } from 'react';
import { useInput } from 'ink';
import { useAppState } from '../../../shared/contexts/AppStateContext.jsx';

/**
 * Settings sections configuration
 */
const SETTINGS_SECTIONS = [
  {
    id: 'machine',
    key: '1',
    label: 'Machine',
    icon: '🔧',
    description: 'Machine limits, speeds, and hardware configuration'
  },
  {
    id: 'safety',
    key: '2',
    label: 'Safety',
    icon: '🛡️',
    description: 'Safety limits, emergency procedures, and protections'
  },
  {
    id: 'units',
    key: '3',
    label: 'Units',
    icon: '📏',
    description: 'Measurement units and display precision'
  },
  {
    id: 'display',
    key: '4',
    label: 'Display',
    icon: '🎨',
    description: 'Theme, interface options, and logging settings'
  }
];

/**
 * Settings Navigation Hook
 * @returns {Object} Navigation state and actions
 */
export function useSettingsNavigation() {
  const { goBack } = useAppState();
  const [currentSection, setCurrentSection] = useState('machine');
  
  /**
   * Navigate to a specific section
   * @param {string} sectionId - Section identifier
   */
  const navigateToSection = useCallback((sectionId) => {
    const section = SETTINGS_SECTIONS.find(s => s.id === sectionId);
    if (section) {
      setCurrentSection(sectionId);
    }
  }, []);
  
  /**
   * Handle keyboard input for navigation
   * @param {string} input - Input character
   * @param {Object} key - Key event object
   */
  const handleInput = useCallback((input, key) => {
    // Section navigation by number keys
    const section = SETTINGS_SECTIONS.find(s => s.key === input);
    if (section) {
      navigateToSection(section.id);
      return;
    }
    
    // ESC to go back
    if (key.escape) {
      goBack();
      return;
    }
  }, [navigateToSection, goBack]);
  
  // Set up input handling
  useInput(handleInput);
  
  return {
    currentSection,
    sections: SETTINGS_SECTIONS,
    navigateToSection,
    handleInput
  };
}

export default useSettingsNavigation;