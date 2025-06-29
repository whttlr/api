import React from 'react';
import { Box, Text, useInput } from 'ink';
import { FileSelector } from '../../../shared/components/FileSelector.jsx';
import { Button } from '../../../shared/components/Button.jsx';
import { useFileSelector } from '../hooks/useFileSelector.js';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import { formatFileSize } from '../../../shared/utils/formatting.js';

export function GcodeSelector() {
  const { 
    files, 
    selectedFile, 
    loading, 
    selectFile, 
    refreshFiles,
    hasFiles,
    directory 
  } = useFileSelector();
  const { navigateTo, goBack } = useAppState();

  useInput((input, key) => {
    if (key.escape) {
      goBack();
    } else if (key.return && selectedFile) {
      handleViewFile();
    } else if (input === 'r') {
      refreshFiles();
    }
  });

  const handleFileSelect = (file) => {
    selectFile(file);
  };

  const handleViewFile = () => {
    if (selectedFile) {
      navigateTo('gcode-view');
    }
  };

  if (loading) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
        <Text>Loading files...</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          Select G-Code File
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          Directory: {directory}
        </Text>
      </Box>

      {!hasFiles ? (
        <Box flexDirection="column" alignItems="center" justifyContent="center" flex={1}>
          <Box marginBottom={2}>
            <Text color="yellow">
              No G-code files found in {directory}
            </Text>
          </Box>
          <Box marginBottom={2}>
            <Text dimColor>
              Supported extensions: .gcode, .nc, .tap
            </Text>
          </Box>
          <Button onPress={refreshFiles}>
            Refresh
          </Button>
        </Box>
      ) : (
        <Box flexDirection="column" flex={1}>
          <Box flex={1} marginBottom={2}>
            <FileSelector
              directory={directory}
              onSelect={handleFileSelect}
              focus={true}
            />
          </Box>

          {selectedFile && (
            <Box flexDirection="column" marginBottom={2}>
              <Box marginBottom={1}>
                <Text bold>Selected File:</Text>
              </Box>
              <Box flexDirection="column" marginLeft={2}>
                <Text>
                  Name: {selectedFile.name}
                </Text>
                <Text>
                  Size: {formatFileSize(selectedFile.size)}
                </Text>
                <Text>
                  Modified: {selectedFile.modified.toLocaleString()}
                </Text>
              </Box>
            </Box>
          )}

          <Box gap={2}>
            <Button 
              onPress={handleViewFile}
              variant="primary"
              disabled={!selectedFile}
            >
              View/Execute
            </Button>

            <Button 
              onPress={refreshFiles}
              variant="default"
            >
              Refresh
            </Button>

            <Button 
              onPress={goBack}
              variant="default"
            >
              Back
            </Button>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text dimColor>
          Use ↑↓ to navigate, Enter to select, R to refresh, Esc to go back
        </Text>
      </Box>
    </Box>
  );
}