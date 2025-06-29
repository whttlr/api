/**
 * File Preview Component
 * 
 * Displays G-code file content with analysis, statistics, and execution controls.
 * 
 * @module FilePreview
 */

import React from 'react';
import { Box, Text } from 'ink';
import { basename } from 'path';
import { formatFileSize, formatTime } from '../services/FileBrowserService.js';

/**
 * Preview Header Component
 * @param {Object} props - Component props
 * @param {string} props.currentFile - Current file path
 */
function PreviewHeader({ currentFile }) {
  return (
    <Box marginBottom={1} paddingX={1}>
      <Text bold color="cyan">
        File Preview: {basename(currentFile)}
      </Text>
    </Box>
  );
}

/**
 * File Analysis Display Component
 * @param {Object} props - Component props
 * @param {Object} props.fileStats - File statistics object
 */
function FileAnalysis({ fileStats }) {
  if (!fileStats) return null;

  const getComplexityColor = () => {
    if (fileStats.codeLines < 50) return 'green';
    if (fileStats.codeLines < 200) return 'yellow';
    return 'red';
  };

  const getComplexityText = () => {
    if (fileStats.codeLines < 50) return 'Simple';
    if (fileStats.codeLines < 200) return 'Medium';
    return 'Complex';
  };

  return (
    <Box marginBottom={2} paddingX={1}>
      <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
        <Text bold color="white" marginBottom={1}>File Analysis</Text>
        
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Text>Lines: <Text color="cyan">{fileStats.totalLines}</Text></Text>
          <Text>Code: <Text color="cyan">{fileStats.codeLines}</Text></Text>
          <Text>Size: <Text color="cyan">{formatFileSize(fileStats.size)}</Text></Text>
        </Box>
        
        <Box flexDirection="row" justifyContent="space-between" marginBottom={1}>
          <Text>Runtime: <Text color="cyan">{formatTime(fileStats.estimatedTime)}</Text></Text>
          <Text>Modified: <Text color="cyan">{fileStats.modified ? new Date(fileStats.modified).toLocaleDateString() : 'Unknown'}</Text></Text>
        </Box>
        
        <Text dimColor>
          Complexity: <Text color={getComplexityColor()}>
            {getComplexityText()}
          </Text>
        </Text>
      </Box>
    </Box>
  );
}

/**
 * File Content Display Component
 * @param {Object} props - Component props
 * @param {string} props.fileContent - File content string
 * @param {Object} props.fileStats - File statistics object
 */
function FileContentDisplay({ fileContent, fileStats }) {
  if (!fileContent) {
    return (
      <Box flex={1} paddingX={1}>
        <Text color="yellow">Loading file content...</Text>
      </Box>
    );
  }

  const lines = fileContent.split('\n').slice(0, 15);
  
  return (
    <Box flex={1} paddingX={1}>
      <Box flexDirection="column">
        <Text bold color="white" marginBottom={1}>File Content (first 15 lines):</Text>
        {lines.map((line, index) => (
          <Text 
            key={`line-${index}-${line.slice(0, 10).replace(/\s/g, '')}`} 
            dimColor={line.trim().startsWith(';')}
          >
            {(index + 1).toString().padStart(3, ' ')}: {line}
          </Text>
        ))}
        {fileStats && fileStats.totalLines > 15 && (
          <Text dimColor>... and {fileStats.totalLines - 15} more lines</Text>
        )}
      </Box>
    </Box>
  );
}

/**
 * Preview Instructions Component
 */
function PreviewInstructions() {
  return (
    <Box paddingX={1}>
      <Text dimColor>
        E - Execute File | ESC - Back to Browser
      </Text>
    </Box>
  );
}

/**
 * File Preview Component
 * Complete file preview interface with analysis and content display
 */
export function FilePreview({ 
  currentFile = '', 
  fileContent = '', 
  fileStats = null, 
  onExecute = () => {} 
}) {

  if (!currentFile) {
    return (
      <Box flex={1} paddingX={1}>
        <Text color="yellow">No file selected for preview</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flex={1}>
      <PreviewHeader currentFile={currentFile} />
      
      <FileAnalysis fileStats={fileStats} />
      
      <FileContentDisplay fileContent={fileContent} fileStats={fileStats} />
      
      <PreviewInstructions />
    </Box>
  );
}

// Default export
export default FilePreview;