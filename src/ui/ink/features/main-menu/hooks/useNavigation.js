/**
 * Navigation Hook
 * 
 * Custom hook for handling navigation logic and menu state management.
 * 
 * @module useNavigation
 */

import { useState, useCallback } from 'react';
import { useAppState } from '../../../shared/contexts/index.js';

/**
 * Navigation Hook
 * Provides navigation utilities and menu state management
 * 
 * @returns {Object} Navigation utilities
 */
export function useNavigation() {
  const { navigateTo, goBack, state } = useAppState();
  const [navigationHistory, setNavigationHistory] = useState([]);

  /**
   * Navigate to a screen with history tracking
   * @param {string} screenId - Screen identifier
   * @param {Object} options - Navigation options
   */
  const navigateWithHistory = useCallback((screenId, options = {}) => {
    if (options.trackHistory !== false) {
      setNavigationHistory(prev => [...prev, state.currentScreen]);
    }
    navigateTo(screenId);
  }, [navigateTo, state.currentScreen]);

  /**
   * Go back to previous screen
   * Uses history if available, otherwise uses default back behavior
   */
  const goBackWithHistory = useCallback(() => {
    if (navigationHistory.length > 0) {
      const previousScreen = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory(prev => prev.slice(0, -1));
      navigateTo(previousScreen);
    } else {
      goBack();
    }
  }, [navigationHistory, navigateTo, goBack]);

  /**
   * Clear navigation history
   */
  const clearHistory = useCallback(() => {
    setNavigationHistory([]);
  }, []);

  /**
   * Navigate to main menu
   */
  const goToMainMenu = useCallback(() => {
    clearHistory();
    navigateTo('main-menu');
  }, [navigateTo, clearHistory]);

  /**
   * Check if we can go back
   * @returns {boolean} True if back navigation is possible
   */
  const canGoBack = navigationHistory.length > 0 || state.previousScreen;

  /**
   * Get breadcrumb path
   * @returns {Array} Array of screen names in navigation path
   */
  const getBreadcrumbs = useCallback(() => {
    return [...navigationHistory, state.currentScreen];
  }, [navigationHistory, state.currentScreen]);

  return {
    // Navigation methods
    navigate: navigateWithHistory,
    goBack: goBackWithHistory,
    goToMainMenu,
    
    // History management
    clearHistory,
    canGoBack,
    getBreadcrumbs,
    
    // State
    currentScreen: state.currentScreen,
    previousScreen: state.previousScreen,
    navigationHistory,
    isTransitioning: state.transitionState !== 'idle'
  };
}

/**
 * Menu Selection Hook
 * Handles menu item selection and keyboard navigation
 * 
 * @param {Array} items - Array of menu items
 * @param {Function} onSelect - Selection callback
 * @returns {Object} Menu selection utilities
 */
export function useMenuSelection(items, onSelect) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  /**
   * Move selection up
   */
  const moveUp = useCallback(() => {
    setSelectedIndex(prev => Math.max(0, prev - 1));
  }, []);

  /**
   * Move selection down
   */
  const moveDown = useCallback(() => {
    setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
  }, [items.length]);

  /**
   * Select current item
   */
  const selectCurrent = useCallback(() => {
    if (items[selectedIndex]) {
      onSelect(items[selectedIndex]);
    }
  }, [items, selectedIndex, onSelect]);

  /**
   * Select item by key/shortcut
   * @param {string} key - Shortcut key
   */
  const selectByKey = useCallback((key) => {
    const item = items.find(item => item.key === key);
    if (item) {
      onSelect(item);
    }
  }, [items, onSelect]);

  /**
   * Reset selection to first item
   */
  const resetSelection = useCallback(() => {
    setSelectedIndex(0);
  }, []);

  return {
    selectedIndex,
    selectedItem: items[selectedIndex],
    setSelectedIndex,
    moveUp,
    moveDown,
    selectCurrent,
    selectByKey,
    resetSelection
  };
}

/**
 * Screen Transition Hook
 * Manages screen transition states and animations
 * 
 * @returns {Object} Transition utilities
 */
export function useScreenTransition() {
  const { state } = useAppState();
  const [isAnimating, setIsAnimating] = useState(false);

  /**
   * Get transition CSS classes (for future web version)
   * @returns {Object} CSS class names
   */
  const getTransitionClasses = useCallback(() => {
    return {
      container: `transition-${state.transitionState}`,
      entering: state.transitionState === 'entering',
      exiting: state.transitionState === 'exiting',
      idle: state.transitionState === 'idle'
    };
  }, [state.transitionState]);

  return {
    transitionState: state.transitionState,
    isAnimating,
    getTransitionClasses
  };
}

export default useNavigation;