/**
 * File Execution Component
 * 
 * Interface for executing G-code files with recent file access,
 * current file display, and job status monitoring.
 * 
 * @module FileExecution
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { basename } from 'path';
import { useCNC, useAppState } from '../../../shared/contexts/index.js';

/**
 * Current File Display Component
 * @param {Object} props - Component props
 * @param {string} props.currentFile - Current file path
 * @param {Object} props.fileStats - File statistics
 */
function CurrentFileDisplay({ currentFile, fileStats }) {
  if (!currentFile) return null;

  return (
    <Box marginBottom={2}>
      <Box flexDirection="column">
        <Text>
          Current: <Text color="green">{basename(currentFile)}</Text>
        </Text>
        {fileStats && (
          <Text dimColor>
            {fileStats.totalLines} lines, Est. time: {Math.floor(fileStats.estimatedTime / 60)}m {fileStats.estimatedTime % 60}s
          </Text>
        )}
      </Box>
    </Box>
  );
}

/**
 * Recent Files List Component
 * @param {Object} props - Component props
 * @param {Array} props.recentFiles - Recent file paths
 * @param {number} props.selectedIndex - Selected file index
 */
function RecentFilesList({ recentFiles, selectedIndex }) {
  if (recentFiles.length === 0) return null;

  return (
    <Box marginBottom={2}>
      <Box flexDirection="column">
        <Text bold color="white">Recent Files:</Text>
        {recentFiles.slice(0, 5).map((filePath, index) => (
          <Box key={`recent-file-${filePath}`} marginBottom={0}>
            <Text 
              bold={selectedIndex === index}
              dimColor={!(selectedIndex === index)}
              color={selectedIndex === index ? 'cyan' : undefined}
            >
              {selectedIndex === index ? '→ ' : '  '}
              [FILE] {basename(filePath)}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

/**
 * Job Status Display Component
 * @param {Object} props - Component props
 * @param {Object} props.job - Current job information
 */
function JobStatusDisplay({ job }) {
  if (!job.fileName) return null;

  const getStatusText = () => {
    if (job.isRunning) return <Text color="green"> Running ({job.progress}%)</Text>;
    if (job.error) return <Text color="red"> Error</Text>;
    return <Text color="gray"> Completed</Text>;
  };

  return (
    <Box marginBottom={2}>
      <Box flexDirection="column">
        <Text bold color="cyan">Current Job:</Text>
        <Text>
          {job.fileName} -
          {getStatusText()}
        </Text>
        
        {job.isRunning && (
          <Box marginTop={1}>
            <Box 
              borderStyle="single" 
              borderColor="cyan"
              paddingX={1}
            >
              <Text color="cyan" bold>
                [J] View Job Progress
              </Text>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

/**
 * Action Buttons Component
 * @param {Object} props - Component props
 * @param {boolean} props.hasCurrentFile - Whether a file is loaded
 */
function ActionButtons({ hasCurrentFile }) {
  return (
    <Box flexDirection="column" gap={1}>
      <Box marginBottom={2}>
        <Box 
          borderStyle="single" 
          borderColor="blue"
          paddingX={1}
        >
          <Text color="blue" bold>
            [F] Open File Browser
          </Text>
        </Box>
      </Box>
      
      {hasCurrentFile && (
        <Box marginBottom={2}>
          <Box 
            borderStyle="single" 
            borderColor="green"
            paddingX={1}
          >
            <Text color="green" bold>
              [Enter] Execute Current File
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}

/**
 * Connection Warning Component
 * @param {Object} props - Component props
 * @param {boolean} props.isConnected - Connection status
 */
function ConnectionWarning({ isConnected }) {
  if (isConnected) return null;

  return (
    <Box marginBottom={2}>
      <Text color="red">
        ⚠️ Machine not connected. Connect first to execute files.
      </Text>
    </Box>
  );
}

/**
 * Instructions Component
 */
function Instructions() {
  return (
    <Box>
      <Text dimColor>
        Use recent files or press F to browse for G-code files
      </Text>
    </Box>
  );
}

/**
 * File Execution Component
 * Interface for executing G-code files
 */
export function FileExecution() {
  const { state, executeFile } = useCNC();
  const { navigateTo } = useAppState();
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);

  const recentFiles = state.files?.recentFiles || [];
  const currentFile = state.files?.currentFile;
  const fileStats = state.files?.fileStats;
  const job = state.job || {};

  useInput((input, key) => {
    if (input === 'f') {
      // Navigate to file browser
      navigateTo('file-browser');
    } else if (key.return) {
      if (currentFile) {
        executeFile(currentFile);
      } else if (recentFiles.length > 0) {
        const selectedFile = recentFiles[selectedHistoryIndex];
        executeFile(selectedFile);
      }
    } else if (input === 'j' && job.isRunning) {
      navigateTo('job-progress');
    } else if (recentFiles.length > 0) {
      // Handle recent files navigation
      if (key.upArrow) {
        setSelectedHistoryIndex(Math.max(0, selectedHistoryIndex - 1));
      } else if (key.downArrow) {
        setSelectedHistoryIndex(Math.min(recentFiles.length - 1, selectedHistoryIndex + 1));
      }
    }
  });

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">G-Code File Execution</Text>
      </Box>
      
      <CurrentFileDisplay currentFile={currentFile} fileStats={fileStats} />
      
      <RecentFilesList recentFiles={recentFiles} selectedIndex={selectedHistoryIndex} />
      
      <JobStatusDisplay job={job} />
      
      <ActionButtons hasCurrentFile={!!currentFile} />
      
      <ConnectionWarning isConnected={state.connection?.isConnected} />
      
      <Instructions />
    </Box>
  );
}

// Default export
export default FileExecution;