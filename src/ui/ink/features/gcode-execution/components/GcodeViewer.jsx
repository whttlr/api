import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';
import { useFileSelector } from '../hooks/useFileSelector.js';
import { useGcodeExecution } from '../hooks/useGcodeExecution.js';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import { truncateText } from '../../../shared/utils/formatting.js';

export function GcodeViewer() {
  const { selectedFile, fileContent, getFileStats } = useFileSelector();
  const { validationResult, validateGcode, executeGcode } = useGcodeExecution();
  const { navigateTo, goBack } = useAppState();
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showValidation, setShowValidation] = useState(false);

  const maxVisibleLines = 15;

  useInput((input, key) => {
    if (key.escape) {
      goBack();
    } else if (key.upArrow) {
      setScrollPosition(Math.max(0, scrollPosition - 1));
    } else if (key.downArrow) {
      const lines = fileContent.split('\n');
      setScrollPosition(Math.min(lines.length - maxVisibleLines, scrollPosition + 1));
    } else if (key.return) {
      handleExecute();
    } else if (input === 'v') {
      handleValidate();
    }
  });

  useEffect(() => {
    if (fileContent && !showValidation) {
      validateGcode(fileContent);
      setShowValidation(true);
    }
  }, [fileContent, validateGcode, showValidation]);

  const handleValidate = () => {
    if (fileContent) {
      validateGcode(fileContent);
      setShowValidation(true);
    }
  };

  const handleExecute = async () => {
    if (!fileContent) return;

    const success = await executeGcode(fileContent);
    if (success) {
      navigateTo('gcode-run');
    }
  };

  const handleSave = () => {
    console.log('Save As functionality not implemented yet');
  };

  if (!selectedFile || !fileContent) {
    return (
      <Box flexDirection="column" alignItems="center" justifyContent="center" height="100%">
        <Text color="yellow">
          No file selected or file could not be loaded
        </Text>
        <Box marginTop={1}>
          <Button onPress={goBack}>
            Back
          </Button>
        </Box>
      </Box>
    );
  }

  const lines = fileContent.split('\n');
  const stats = getFileStats();
  const visibleLines = lines.slice(scrollPosition, scrollPosition + maxVisibleLines);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          G-Code Preview
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text bold>File: {selectedFile.name}</Text>
        </Box>
        <Box gap={4}>
          <Text>
            Lines: {stats.totalLines} ({stats.gcodeLines} G-code)
          </Text>
          <Text>
            Size: {(selectedFile.size / 1024).toFixed(1)} KB
          </Text>
        </Box>
      </Box>

      {showValidation && validationResult && (
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text bold color={validationResult.isValid ? 'green' : 'red'}>
              Validation: {validationResult.isValid ? 'PASSED' : 'FAILED'}
            </Text>
          </Box>
          
          {validationResult.issues.length > 0 && (
            <Text color="red">
              {validationResult.issues.length} errors found
            </Text>
          )}
          
          {validationResult.warnings.length > 0 && (
            <Text color="yellow">
              {validationResult.warnings.length} warnings
            </Text>
          )}
          
          <Text dimColor>
            Estimated time: {validationResult.stats.estimatedTime}s
          </Text>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={2} height={maxVisibleLines + 2}>
        <Box borderStyle="single" borderColor="gray">
          <Box flexDirection="column" paddingX={1}>
            <Box marginBottom={1}>
              <Text bold dimColor>
                Preview (Lines {scrollPosition + 1}-{Math.min(scrollPosition + maxVisibleLines, lines.length)})
              </Text>
            </Box>
            
            {visibleLines.map((line, index) => {
              const lineNumber = scrollPosition + index + 1;
              const isComment = line.trim().startsWith(';') || line.trim().startsWith('(');
              const isEmpty = !line.trim();
              
              return (
                <Box key={lineNumber}>
                  <Text dimColor>
                    {lineNumber.toString().padStart(4, ' ')}: 
                  </Text>
                  <Text 
                    color={isEmpty ? 'gray' : isComment ? 'yellow' : 'white'}
                    dimColor={isEmpty || isComment}
                  >
                    {truncateText(line || ' ', 70)}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>
        
        {lines.length > maxVisibleLines && (
          <Box marginTop={1}>
            <Text dimColor>
              Scroll: ↑↓ keys | {scrollPosition + 1}/{Math.max(1, lines.length - maxVisibleLines + 1)}
            </Text>
          </Box>
        )}
      </Box>

      <Box gap={2}>
        <Button 
          onPress={handleExecute}
          variant="primary"
          disabled={!validationResult?.isValid}
        >
          Execute
        </Button>

        <Button 
          onPress={handleValidate}
          variant="default"
        >
          Re-validate
        </Button>

        <Button 
          onPress={handleSave}
          variant="default"
        >
          Save As
        </Button>

        <Button 
          onPress={goBack}
          variant="default"
        >
          Back
        </Button>
      </Box>

      <Box marginTop={2}>
        <Text dimColor>
          Hotkeys: Enter (Execute) | V (Validate) | ↑↓ (Scroll) | Esc (Back)
        </Text>
      </Box>
    </Box>
  );
}