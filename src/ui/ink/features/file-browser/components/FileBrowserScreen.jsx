/**
 * File Browser Screen Component
 * 
 * Main interface for browsing and managing G-code files with two modes:
 * - Browse: Navigate directories and select files
 * - Preview: View file content and statistics
 * 
 * @module FileBrowserScreen
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useAppState, useCNC } from '../../../shared/contexts/index.js';
import { DirectoryBrowser } from './DirectoryBrowser.jsx';
import { FilePreview } from './FilePreview.jsx';
import { RecentFiles } from './RecentFiles.jsx';
import { useFileBrowser } from '../hooks/useFileBrowser.js';

/**
 * Mode Content Renderer
 * @param {Object} props - Component props
 * @param {string} props.currentMode - Current browser mode
 * @param {Object} props.browserState - File browser state
 * @param {Object} props.browserActions - File browser actions
 */
function ModeContent({ currentMode, browserState, browserActions }) {
  switch (currentMode) {
    case 'browse':
      return (
        <DirectoryBrowser
          files={browserState.files}
          selectedIndex={browserState.selectedIndex}
          currentDirectory={browserState.currentDirectory}
          isLoading={browserState.isLoading}
          error={browserState.error}
          onSelect={browserActions.handleFileSelect}
          onRefresh={browserActions.refreshFiles}
        />
      );
    case 'preview':
      return (
        <FilePreview
          currentFile={browserState.currentFile}
          fileContent={browserState.fileContent}
          fileStats={browserState.fileStats}
          onExecute={browserActions.executeCurrentFile}
        />
      );
    default:
      return (
        <DirectoryBrowser
          files={browserState.files}
          selectedIndex={browserState.selectedIndex}
          currentDirectory={browserState.currentDirectory}
          isLoading={browserState.isLoading}
          error={browserState.error}
          onSelect={browserActions.handleFileSelect}
          onRefresh={browserActions.refreshFiles}
        />
      );
  }
}

/**
 * File Browser Screen Component
 * Main file browsing interface with directory navigation and file preview
 */
export function FileBrowserScreen() {
  const { goBack } = useAppState();
  const { state } = useCNC();
  const [currentMode, setCurrentMode] = useState('browse'); // 'browse', 'preview'
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    browserState,
    browserActions
  } = useFileBrowser({
    selectedIndex,
    setSelectedIndex,
    currentMode,
    setCurrentMode
  });

  useInput((input, key) => {
    if (key.escape) {
      if (currentMode === 'browse') {
        goBack();
      } else {
        setCurrentMode('browse');
      }
    } else if (currentMode === 'browse') {
      handleBrowseInput(input, key);
    } else if (currentMode === 'preview') {
      handlePreviewInput(input, key);
    }
  });

  /**
   * Handle input in browse mode
   */
  const handleBrowseInput = (input, key) => {
    const files = browserState.files;
    
    if (key.upArrow && files.length > 0) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow && files.length > 0) {
      setSelectedIndex(Math.min(files.length - 1, selectedIndex + 1));
    } else if (key.return && files.length > 0) {
      browserActions.handleFileSelect(files[selectedIndex]);
    } else if (input === 'r') {
      browserActions.refreshFiles();
    } else if (input === 'p' && files.length > 0) {
      const selectedFile = files[selectedIndex];
      if (selectedFile.type === 'file') {
        browserActions.previewFile(selectedFile);
      }
    } else if (input === 'e' && files.length > 0) {
      const selectedFile = files[selectedIndex];
      if (selectedFile.type === 'file') {
        browserActions.executeSelectedFile(selectedFile);
      }
    } else if (['1', '2', '3'].includes(input)) {
      // Quick access to recent files
      const recentIndex = parseInt(input) - 1;
      if (state.files.recentFiles[recentIndex]) {
        const recentFilePath = state.files.recentFiles[recentIndex];
        browserActions.previewFile({ path: recentFilePath, type: 'file' });
      }
    }
  };

  /**
   * Handle input in preview mode
   */
  const handlePreviewInput = (input, key) => {
    if (input === 'e' && browserState.currentFile) {
      browserActions.executeCurrentFile();
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} flexDirection="column" paddingY={1}>
        {/* Header */}
        <Box marginBottom={2} paddingX={1}>
          <Text bold color="green">
            G-Code File Browser
          </Text>
        </Box>

        {/* Recent Files (only in browse mode) */}
        {currentMode === 'browse' && state.files.recentFiles.length > 0 && (
          <RecentFiles recentFiles={state.files.recentFiles} />
        )}

        {/* Mode Content */}
        <ModeContent 
          currentMode={currentMode}
          browserState={browserState}
          browserActions={browserActions}
        />
      </Box>
    </Box>
  );
}

// Default export
export default FileBrowserScreen;