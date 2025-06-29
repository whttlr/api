/**
 * File Browser Hook
 * 
 * Manages file browser state, navigation, and file operations
 * with directory browsing and file preview capabilities.
 * 
 * @module useFileBrowser
 */

import { useState, useCallback, useMemo } from 'react';
import { useCNC } from '../../../shared/contexts/index.js';
import { sortFilesForDisplay, extractFileMetadata } from '../services/FileBrowserService.js';

/**
 * File browser management hook
 * @param {Object} config - Hook configuration
 * @param {number} config.selectedIndex - Currently selected file index
 * @param {Function} config.setSelectedIndex - Set selected index function
 * @param {string} config.currentMode - Current browser mode
 * @param {Function} config.setCurrentMode - Set current mode function
 * @returns {Object} Browser state and actions
 */
export function useFileBrowser({ 
  selectedIndex, 
  setSelectedIndex, 
  currentMode, 
  setCurrentMode 
}) {
  const { state, changeDirectory, loadFile, executeFile, refreshFiles } = useCNC();
  
  // Enhanced file list with metadata
  const enhancedFiles = useMemo(() => {
    const files = state.files?.availableFiles || [];
    const enhanced = files.map(extractFileMetadata);
    return sortFilesForDisplay(enhanced);
  }, [state.files?.availableFiles]);

  /**
   * Handle file or directory selection
   * @param {Object} file - Selected file object
   */
  const handleFileSelect = useCallback(async (file) => {
    if (file.type === 'directory') {
      await changeDirectory(file.path);
      setSelectedIndex(0);
    } else if (file.type === 'file') {
      await previewFile(file);
    }
  }, [changeDirectory, setSelectedIndex]);

  /**
   * Preview a file
   * @param {Object} file - File to preview
   */
  const previewFile = useCallback(async (file) => {
    try {
      await loadFile(file.path);
      setCurrentMode('preview');
    } catch (err) {
      // Error is handled in the context
      console.error('Failed to preview file:', err);
    }
  }, [loadFile, setCurrentMode]);

  /**
   * Execute selected file
   * @param {Object} file - File to execute
   */
  const executeSelectedFile = useCallback(async (file) => {
    try {
      await executeFile(file.path);
      setCurrentMode('execute');
    } catch (err) {
      console.error('Failed to execute file:', err);
    }
  }, [executeFile, setCurrentMode]);

  /**
   * Execute current file in preview
   */
  const executeCurrentFile = useCallback(async () => {
    const currentFile = state.files?.currentFile;
    if (currentFile) {
      try {
        await executeFile(currentFile);
        setCurrentMode('execute');
      } catch (err) {
        console.error('Failed to execute current file:', err);
      }
    }
  }, [state.files?.currentFile, executeFile, setCurrentMode]);

  /**
   * Navigate to parent directory
   */
  const navigateToParent = useCallback(async () => {
    const parentFile = enhancedFiles.find(f => f.isParent);
    if (parentFile) {
      await changeDirectory(parentFile.path);
      setSelectedIndex(0);
    }
  }, [enhancedFiles, changeDirectory, setSelectedIndex]);

  /**
   * Get current selection
   */
  const getCurrentSelection = useCallback(() => {
    return enhancedFiles[selectedIndex] || null;
  }, [enhancedFiles, selectedIndex]);

  /**
   * Check if current selection can be previewed
   */
  const canPreviewSelection = useCallback(() => {
    const selection = getCurrentSelection();
    return selection && selection.type === 'file' && selection.isGcodeFile;
  }, [getCurrentSelection]);

  /**
   * Check if current selection can be executed
   */
  const canExecuteSelection = useCallback(() => {
    const selection = getCurrentSelection();
    return selection && selection.type === 'file' && selection.isGcodeFile;
  }, [getCurrentSelection]);

  /**
   * Get directory statistics
   */
  const getDirectoryStats = useCallback(() => {
    const fileCount = enhancedFiles.filter(f => f.type === 'file').length;
    const dirCount = enhancedFiles.filter(f => f.type === 'directory' && !f.isParent).length;
    const gcodeFileCount = enhancedFiles.filter(f => f.type === 'file' && f.isGcodeFile).length;
    
    return {
      totalFiles: fileCount,
      totalDirectories: dirCount,
      gcodeFiles: gcodeFileCount,
      hasFiles: fileCount > 0,
      hasDirectories: dirCount > 0
    };
  }, [enhancedFiles]);

  // Browser state object
  const browserState = {
    files: enhancedFiles,
    selectedIndex,
    currentDirectory: state.files?.currentDirectory || '',
    currentFile: state.files?.currentFile,
    fileContent: state.files?.fileContent,
    fileStats: state.files?.fileStats,
    recentFiles: state.files?.recentFiles || [],
    isLoading: state.files?.isLoading || false,
    error: state.files?.error,
    stats: getDirectoryStats(),
    currentSelection: getCurrentSelection()
  };

  // Browser actions object
  const browserActions = {
    handleFileSelect,
    previewFile,
    executeSelectedFile,
    executeCurrentFile,
    navigateToParent,
    refreshFiles,
    getCurrentSelection,
    canPreviewSelection,
    canExecuteSelection
  };

  return {
    browserState,
    browserActions
  };
}

/**
 * File navigation hook for keyboard shortcuts
 * @param {Array} files - Array of files
 * @param {number} selectedIndex - Current selection index
 * @param {Function} setSelectedIndex - Index setter function
 * @returns {Object} Navigation functions
 */
export function useFileNavigation(files, selectedIndex, setSelectedIndex) {
  const moveUp = useCallback(() => {
    if (files.length > 0) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    }
  }, [files.length, selectedIndex, setSelectedIndex]);

  const moveDown = useCallback(() => {
    if (files.length > 0) {
      setSelectedIndex(Math.min(files.length - 1, selectedIndex + 1));
    }
  }, [files.length, selectedIndex, setSelectedIndex]);

  const moveToFirst = useCallback(() => {
    if (files.length > 0) {
      setSelectedIndex(0);
    }
  }, [files.length, setSelectedIndex]);

  const moveToLast = useCallback(() => {
    if (files.length > 0) {
      setSelectedIndex(files.length - 1);
    }
  }, [files.length, setSelectedIndex]);

  return {
    moveUp,
    moveDown,
    moveToFirst,
    moveToLast,
    canMoveUp: selectedIndex > 0,
    canMoveDown: selectedIndex < files.length - 1
  };
}

/**
 * Recent files hook for quick access
 * @param {Array} recentFiles - Array of recent file paths
 * @returns {Object} Recent files utilities
 */
export function useRecentFiles(recentFiles = []) {
  const getRecentFile = useCallback((index) => {
    return recentFiles[index] || null;
  }, [recentFiles]);

  const hasRecentFiles = recentFiles.length > 0;
  const recentFileCount = Math.min(recentFiles.length, 3);

  return {
    getRecentFile,
    hasRecentFiles,
    recentFileCount,
    recentFiles: recentFiles.slice(0, 3)
  };
}

// Default export
export default useFileBrowser;