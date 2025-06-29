import { useState, useCallback, useRef, useEffect } from 'react';
import { SettingsService } from '../services/SettingsService.js';
import { useSettings as useSettingsContext } from '../../../shared/context/SettingsContext.jsx';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';

export function useSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  
  const { state: settings, loadSettings, updateMachineSetting, updateUserSetting } = useSettingsContext();
  const { setError, setLoading } = useAppState();
  
  const settingsServiceRef = useRef(new SettingsService());

  const loadSettingsFromFile = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoading(true);
      
      const loadedSettings = await settingsServiceRef.current.loadSettings();
      loadSettings(loadedSettings);
      
      const validation = settingsServiceRef.current.validateSettings(loadedSettings);
      setValidationResult(validation);
      
      if (validation.warnings.length > 0) {
        console.warn('Settings validation warnings:', validation.warnings);
      }
      
      setIsDirty(false);
      return true;

    } catch (error) {
      setError(`Failed to load settings: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [loadSettings, setError, setLoading]);

  const saveSettingsToFile = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoading(true);
      
      const validation = settingsServiceRef.current.validateSettings(settings);
      setValidationResult(validation);
      
      if (!validation.isValid) {
        setError(`Cannot save invalid settings: ${validation.errors.join(', ')}`);
        return false;
      }
      
      const success = await settingsServiceRef.current.saveSettings(settings);
      
      if (success) {
        setIsDirty(false);
        return true;
      } else {
        setError('Failed to save settings');
        return false;
      }

    } catch (error) {
      setError(`Failed to save settings: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
      setLoading(false);
    }
  }, [settings, setError, setLoading]);

  const resetSettings = useCallback(() => {
    const defaultSettings = settingsServiceRef.current.getDefaultSettings();
    loadSettings(defaultSettings);
    setIsDirty(true);
    
    const validation = settingsServiceRef.current.validateSettings(defaultSettings);
    setValidationResult(validation);
  }, [loadSettings]);

  const updateSetting = useCallback((path, value) => {
    const [category, ...rest] = path.split('.');
    const settingPath = rest.join('.');
    
    if (category === 'machine') {
      updateMachineSetting(settingPath, value);
    } else if (category === 'user') {
      updateUserSetting(settingPath, value);
    }
    
    setIsDirty(true);
    
    const updatedSettings = settingsServiceRef.current.updateSetting(settings, path, value);
    const validation = settingsServiceRef.current.validateSettings(updatedSettings);
    setValidationResult(validation);
  }, [settings, updateMachineSetting, updateUserSetting]);

  const getSetting = useCallback((path) => {
    return settingsServiceRef.current.getSetting(settings, path);
  }, [settings]);

  const exportSettings = useCallback(() => {
    try {
      const exportData = settingsServiceRef.current.exportSettings(settings);
      return exportData;
    } catch (error) {
      setError(`Failed to export settings: ${error.message}`);
      return null;
    }
  }, [settings, setError]);

  const importSettings = useCallback((importData) => {
    try {
      const result = settingsServiceRef.current.importSettings(importData);
      
      if (result.success) {
        loadSettings(result.settings);
        setIsDirty(true);
        
        const validation = settingsServiceRef.current.validateSettings(result.settings);
        setValidationResult(validation);
        
        return {
          success: true,
          warnings: result.warnings
        };
      } else {
        setError(result.error);
        return {
          success: false,
          error: result.error
        };
      }

    } catch (error) {
      setError(`Failed to import settings: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }, [loadSettings, setError]);

  const hasUnsavedChanges = useCallback(() => {
    return isDirty;
  }, [isDirty]);

  useEffect(() => {
    loadSettingsFromFile();
  }, [loadSettingsFromFile]);

  return {
    settings,
    isLoading,
    isDirty,
    validationResult,
    loadSettings: loadSettingsFromFile,
    saveSettings: saveSettingsToFile,
    resetSettings,
    updateSetting,
    getSetting,
    exportSettings,
    importSettings,
    hasUnsavedChanges
  };
}