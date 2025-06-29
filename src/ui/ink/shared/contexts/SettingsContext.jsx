/**
 * Settings Context
 * 
 * Manages user preferences and machine settings with localStorage persistence.
 * Includes unit conversion utilities and setting management.
 * 
 * @module SettingsContext
 */

import React, { createContext, useContext, useState } from 'react';
import { warn } from '../../../../lib/logger/LoggerService.js';
import { 
  getDisplayUnit, 
  getDisplayValue, 
  formatPosition 
} from '../services/UnitConverter.js';

const SettingsContext = createContext();

/**
 * Load settings from localStorage or use defaults
 * @returns {Object} Settings object with user and machine sections
 */
const loadSettingsFromStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem('cnc-app-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure all properties exist
        return {
          user: { 
            units: 'metric',
            theme: 'default',
            statusUpdateRate: 500,
            commandTimeout: 5000,
            ...parsed.user
          },
          machine: {
            limits: {
              x: { min: -150, max: 150 },
              y: { min: -150, max: 150 },
              z: { min: -50, max: 50 }
            },
            speeds: {
              travel: 3000,
              feed: 1000
            },
            spindle: {
              minSpeed: 0,
              maxSpeed: 24000,
              defaultSpeed: 12000,
              defaultDirection: 'clockwise'
            },
            safeHeight: 5,
            jogSpeeds: {
              slow: 100,
              medium: 500,
              fast: 1000
            },
            ...parsed.machine
          }
        };
      }
    }
  } catch (error) {
    // Silently fail in environments without localStorage (like Node.js/CLI)
  }
  
  // Return defaults if localStorage fails or is empty
  return {
    user: { 
      units: 'metric', // 'metric' or 'imperial'
      theme: 'default',
      statusUpdateRate: 500,
      commandTimeout: 5000
    },
    machine: {
      limits: {
        x: { min: -150, max: 150 },
        y: { min: -150, max: 150 },
        z: { min: -50, max: 50 }
      },
      speeds: {
        travel: 3000,
        feed: 1000
      },
      spindle: {
        minSpeed: 0,
        maxSpeed: 24000,
        defaultSpeed: 12000,
        defaultDirection: 'clockwise'
      },
      safeHeight: 5,
      jogSpeeds: {
        slow: 100,
        medium: 500,
        fast: 1000
      }
    }
  };
};

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
const saveSettingsToStorage = (settings) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('cnc-app-settings', JSON.stringify(settings));
    }
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
};

/**
 * Initial settings state loaded from storage
 */
export const initialSettingsState = loadSettingsFromStorage();

/**
 * Settings Provider Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export function SettingsProvider({ children }) {
  const [state, setState] = useState(initialSettingsState);
  
  /**
   * Update user settings
   * @param {Object} newSettings - New user settings to merge
   */
  const updateUserSettings = (newSettings) => {
    setState(prev => {
      const newState = {
        ...prev,
        user: { ...prev.user, ...newSettings }
      };
      saveSettingsToStorage(newState);
      return newState;
    });
  };
  
  /**
   * Update machine settings
   * @param {Object} newSettings - New machine settings to merge
   */
  const updateMachineSettings = (newSettings) => {
    setState(prev => {
      const newState = {
        ...prev,
        machine: { ...prev.machine, ...newSettings }
      };
      saveSettingsToStorage(newState);
      return newState;
    });
  };

  /**
   * Toggle between metric and imperial units
   */
  const toggleUnits = () => {
    setState(prev => {
      const newState = {
        ...prev,
        user: {
          ...prev.user,
          units: prev.user.units === 'metric' ? 'imperial' : 'metric'
        }
      };
      saveSettingsToStorage(newState);
      return newState;
    });
  };

  /**
   * Reset settings to defaults
   */
  const resetToDefaults = () => {
    const defaults = loadSettingsFromStorage();
    setState(defaults);
    saveSettingsToStorage(defaults);
  };

  /**
   * Export settings as JSON
   * @returns {string} JSON string of current settings
   */
  const exportSettings = () => {
    return JSON.stringify(state, null, 2);
  };

  /**
   * Import settings from JSON
   * @param {string} jsonString - JSON string of settings to import
   * @throws {Error} If JSON is invalid
   */
  const importSettings = (jsonString) => {
    try {
      const imported = JSON.parse(jsonString);
      
      // Validate structure
      if (!imported.user || !imported.machine) {
        throw new Error('Invalid settings format');
      }
      
      // Merge with current state to ensure all required properties exist
      const newState = {
        user: { ...state.user, ...imported.user },
        machine: { ...state.machine, ...imported.machine }
      };
      
      setState(newState);
      saveSettingsToStorage(newState);
    } catch (error) {
      throw new Error(`Failed to import settings: ${error.message}`);
    }
  };

  /**
   * Get setting value by path (e.g., 'user.units' or 'machine.safeHeight')
   * @param {string} path - Dot-separated path to setting
   * @param {any} defaultValue - Default value if setting not found
   * @returns {any} Setting value
   */
  const getSetting = (path, defaultValue = null) => {
    const parts = path.split('.');
    let current = state;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  };

  /**
   * Set setting value by path
   * @param {string} path - Dot-separated path to setting
   * @param {any} value - Value to set
   */
  const setSetting = (path, value) => {
    const parts = path.split('.');
    const section = parts[0]; // 'user' or 'machine'
    const settingPath = parts.slice(1);
    
    if (section === 'user') {
      const newUserSettings = { ...state.user };
      let current = newUserSettings;
      
      for (let i = 0; i < settingPath.length - 1; i++) {
        if (!current[settingPath[i]]) {
          current[settingPath[i]] = {};
        }
        current = current[settingPath[i]];
      }
      
      current[settingPath[settingPath.length - 1]] = value;
      updateUserSettings(newUserSettings);
    } else if (section === 'machine') {
      const newMachineSettings = { ...state.machine };
      let current = newMachineSettings;
      
      for (let i = 0; i < settingPath.length - 1; i++) {
        if (!current[settingPath[i]]) {
          current[settingPath[i]] = {};
        }
        current = current[settingPath[i]];
      }
      
      current[settingPath[settingPath.length - 1]] = value;
      updateMachineSettings(newMachineSettings);
    }
  };
  
  const contextValue = {
    state, 
    updateUserSettings,
    updateMachineSettings,
    toggleUnits,
    resetToDefaults,
    exportSettings,
    importSettings,
    getSetting,
    setSetting,
    
    // Utility functions (from UnitConverter service)
    getDisplayUnit: (units = state.user.units) => getDisplayUnit(units),
    getDisplayValue: (value, units = state.user.units) => getDisplayValue(value, units),
    formatPosition: (value, units = state.user.units, precision) => formatPosition(value, units, precision)
  };
  
  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

/**
 * Hook to use settings functionality
 * @returns {Object} Settings context methods and state
 */
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

/**
 * Hook to use only user settings
 * @returns {Object} User settings and update methods
 */
export function useUserSettings() {
  const { state, updateUserSettings, toggleUnits } = useSettings();
  return {
    userSettings: state.user,
    updateUserSettings,
    toggleUnits
  };
}

/**
 * Hook to use only machine settings
 * @returns {Object} Machine settings and update methods
 */
export function useMachineSettings() {
  const { state, updateMachineSettings } = useSettings();
  return {
    machineSettings: state.machine,
    updateMachineSettings
  };
}

/**
 * Hook to use only unit conversion utilities
 * @returns {Object} Unit conversion functions
 */
export function useUnits() {
  const { state, getDisplayUnit, getDisplayValue, formatPosition, toggleUnits } = useSettings();
  return {
    currentUnits: state.user.units,
    getDisplayUnit,
    getDisplayValue,
    formatPosition,
    toggleUnits
  };
}

export { loadSettingsFromStorage, saveSettingsToStorage };
export default SettingsContext;