/**
 * Recent Files Component
 * 
 * Displays recently accessed G-code files with quick access shortcuts.
 * 
 * @module RecentFiles
 */

import React from 'react';
import { Box, Text } from 'ink';
import { basename, extname } from 'path';
import { getFileIcon } from '../services/FileBrowserService.js';

/**
 * Recent File Item Component
 * @param {Object} props - Component props
 * @param {string} props.filePath - File path
 * @param {number} props.index - File index
 */
function RecentFileItem({ filePath, index }) {
  const icon = getFileIcon(extname(filePath));
  const fileName = basename(filePath);
  
  return (
    <Box key={`browser-recent-${filePath}`} marginTop={1}>
      <Text>
        <Text color="green">[{index + 1}]</Text>
        <Text dimColor> {icon} {fileName}</Text>
      </Text>
    </Box>
  );
}

/**
 * Recent Files Component
 * Displays list of recently accessed files with quick access
 */
export function RecentFiles({ recentFiles = [] }) {
  if (recentFiles.length === 0) {
    return null;
  }

  return (
    <Box marginBottom={2} paddingX={1}>
      <Box flexDirection="column">
        <Text bold color="cyan">Recent Files (press 1-3 for quick access):</Text>
        {recentFiles.slice(0, 3).map((filePath, index) => (
          <RecentFileItem
            key={filePath}
            filePath={filePath}
            index={index}
          />
        ))}
      </Box>
    </Box>
  );
}

// Default export
export default RecentFiles;