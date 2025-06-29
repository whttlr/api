/**
 * Directory Browser Component
 * 
 * Displays directory contents with file and folder navigation,
 * loading states, and error handling. Now using standardized SelectableList.
 * 
 * @module DirectoryBrowser
 */

import React from 'react';
import { Box, Text } from 'ink';
import { formatFileSize } from '../services/FileBrowserService.js';
import { SelectableList } from '../../../shared/components/interactive/SelectableList.jsx';

/**
 * Current Directory Display Component
 * @param {Object} props - Component props
 * @param {string} props.currentDirectory - Current directory path
 */
function CurrentDirectoryDisplay({ currentDirectory }) {
  return (
    <Box marginBottom={1} paddingX={1}>
      <Text>
        Directory: <Text color="cyan">{currentDirectory}</Text>
      </Text>
    </Box>
  );
}

/**
 * Loading State Component
 */
function LoadingState() {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" flex={1}>
      <Text color="yellow" bold>Scanning Directory...</Text>
      <Text dimColor marginTop={1}>
        Looking for G-code files (.gcode, .nc, .ngc, .cnc, .tap, .g, .prg...)
      </Text>
    </Box>
  );
}

/**
 * Error State Component
 * @param {Object} props - Component props
 * @param {string} props.error - Error message
 */
function ErrorState({ error }) {
  return (
    <Box flexDirection="column">
      <Text color="red" bold>Error Loading Directory</Text>
      <Text color="red" marginTop={1}>{error}</Text>
      <Text dimColor marginTop={1}>Press 'r' to retry or ESC to go back</Text>
    </Box>
  );
}

/**
 * Empty Directory Component
 */
function EmptyDirectory() {
  return (
    <Box flexDirection="column">
      <Text color="yellow">Empty Directory</Text>
      <Text dimColor marginTop={1}>No supported G-code files found in this directory</Text>
      <Text dimColor>Supported formats: .gcode, .nc, .ngc, .cnc, .tap, .g, .prg, .txt</Text>
    </Box>
  );
}

/**
 * Custom file item renderer for file browser
 * @param {Object} file - File object  
 * @param {boolean} isSelected - Whether file is selected
 * @param {number} index - File index
 */
function customFileRenderer(file, isSelected, index) {
  const prefix = isSelected ? '→ ' : '  ';
  const typeIndicator = file.type === 'directory' ? '[DIR]' : '[FILE]';
  const icon = file.type === 'directory' ? '📁' : 
               file.isParent ? '📂' : 
               '📄';
  const shortcut = `[${index + 1}] `;
  const fileName = file.name;
  const sizeInfo = file.type === 'file' ? ` (${formatFileSize(file.size)})` : '';
  
  return (
    <Box flexDirection="column">
      <Text 
        bold={isSelected}
        color={file.type === 'directory' ? 'cyan' : 'white'}
        dimColor={!isSelected}
      >
        {prefix}{shortcut}{icon} {typeIndicator} {fileName}{sizeInfo}
      </Text>
      {isSelected && file.type === 'file' && (
        <Box marginLeft={6} marginTop={0}>
          <Text dimColor>
            Modified: {file.modified ? new Date(file.modified).toLocaleDateString() : 'Unknown'}
            {' | '}Extension: {file.extension || 'N/A'}
          </Text>
        </Box>
      )}
    </Box>
  );
}

/**
 * File List Component using standardized SelectableList
 * @param {Object} props - Component props
 * @param {Array} props.files - Array of file objects
 * @param {number} props.selectedIndex - Selected file index
 * @param {Function} props.onSelect - File selection handler
 */
function FileList({ files, selectedIndex, onSelect }) {
  // Transform files into standardized format for SelectableList
  const fileItems = files.map((file, index) => ({
    id: file.path,
    title: file.name,
    key: (index + 1).toString(),
    description: file.type === 'directory' ? 'Directory' : `File (${formatFileSize(file.size)})`,
    icon: file.type === 'directory' ? '📁' : '📄',
    ...file // Include all original file properties
  }));

  return (
    <Box flexDirection="column">
      <Text dimColor marginBottom={1}>
        {files.filter(f => f.type === 'file').length} files, {files.filter(f => f.type === 'directory' && !f.isParent).length} folders
      </Text>
      <SelectableList
        items={fileItems}
        selectedId={fileItems[selectedIndex]?.id}
        onSelect={onSelect}
        renderItem={customFileRenderer}
        variant="compact"
        showIcons={false}
        showDescriptions={false}
        keyboardEnabled={true}
        emptyMessage="No files or directories found"
      />
    </Box>
  );
}

/**
 * Navigation Instructions Component
 */
function NavigationInstructions() {
  return (
    <Box paddingX={1}>
      <Text dimColor>
        ↑↓ Navigate | Enter - Select | P - Preview | E - Execute | 1-3 - Recent Files | R - Refresh | ESC - Back
      </Text>
    </Box>
  );
}

/**
 * Directory Browser Component
 * Main directory browsing interface
 */
export function DirectoryBrowser({ 
  files = [],
  selectedIndex = 0,
  currentDirectory = '',
  isLoading = false,
  error = null,
  onSelect = () => {},
  onRefresh = () => {}
}) {

  /**
   * Render content based on state
   */
  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }
    
    if (error) {
      return <ErrorState error={error} />;
    }
    
    if (files.length === 0) {
      return <EmptyDirectory />;
    }
    
    return <FileList files={files} selectedIndex={selectedIndex} onSelect={onSelect} />;
  };

  return (
    <Box flexDirection="column" flex={1}>
      <CurrentDirectoryDisplay currentDirectory={currentDirectory} />

      <Box flex={1} paddingX={1}>
        {renderContent()}
      </Box>

      <NavigationInstructions />
    </Box>
  );
}

// Default export
export default DirectoryBrowser;