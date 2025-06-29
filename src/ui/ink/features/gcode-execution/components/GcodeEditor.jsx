import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '../../../shared/components/TextInput.jsx';
import { Button } from '../../../shared/components/Button.jsx';
import { useGcodeExecution } from '../hooks/useGcodeExecution.js';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';

export function GcodeEditor() {
  const [gcode, setGcode] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const { validationResult, validateGcode, executeGcode } = useGcodeExecution();
  const { navigateTo, goBack } = useAppState();

  useInput((input, key) => {
    if (key.escape) {
      goBack();
    } else if (key.ctrl && input === 's') {
      handleSave();
    }
  });

  const handleGcodeChange = (newGcode) => {
    setGcode(newGcode);
    setShowValidation(false);
  };

  const handleValidate = () => {
    validateGcode(gcode);
    setShowValidation(true);
  };

  const handleExecute = async () => {
    if (!gcode.trim()) {
      return;
    }

    const success = await executeGcode(gcode);
    if (success) {
      navigateTo('gcode-run');
    }
  };

  const handleSave = () => {
    console.log('Save functionality not implemented yet');
  };

  const handleClear = () => {
    setGcode('');
    setShowValidation(false);
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          Enter G-Code
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>
          Enter your G-code commands below. Use Ctrl+S to save, Enter to execute.
        </Text>
      </Box>

      <Box marginBottom={2}>
        <TextInput
          value={gcode}
          onChange={handleGcodeChange}
          placeholder="Enter G-code here... (e.g., G28\nG01 X10 Y10 F1000)"
          multiline={true}
          focus={true}
          width={80}
        />
      </Box>

      {showValidation && validationResult && (
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text bold color={validationResult.isValid ? 'green' : 'red'}>
              Validation Results: {validationResult.isValid ? 'PASSED' : 'FAILED'}
            </Text>
          </Box>

          {validationResult.issues.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="red">Errors:</Text>
              {validationResult.issues.slice(0, 5).map((issue, index) => (
                <Text key={index} color="red">
                  Line {issue.line}: {issue.message}
                </Text>
              ))}
              {validationResult.issues.length > 5 && (
                <Text dimColor>
                  ... and {validationResult.issues.length - 5} more errors
                </Text>
              )}
            </Box>
          )}

          {validationResult.warnings.length > 0 && (
            <Box flexDirection="column" marginBottom={1}>
              <Text bold color="yellow">Warnings:</Text>
              {validationResult.warnings.slice(0, 3).map((warning, index) => (
                <Text key={index} color="yellow">
                  Line {warning.line}: {warning.message}
                </Text>
              ))}
              {validationResult.warnings.length > 3 && (
                <Text dimColor>
                  ... and {validationResult.warnings.length - 3} more warnings
                </Text>
              )}
            </Box>
          )}

          <Box>
            <Text dimColor>
              Stats: {validationResult.stats.totalLines} lines, 
              ~{validationResult.stats.estimatedTime}s estimated
            </Text>
          </Box>
        </Box>
      )}

      <Box gap={2}>
        <Button 
          onPress={handleValidate}
          variant="default"
        >
          Validate
        </Button>

        <Button 
          onPress={handleExecute}
          variant="primary"
          disabled={!gcode.trim() || (showValidation && !validationResult?.isValid)}
        >
          Execute
        </Button>

        <Button 
          onPress={handleSave}
          variant="default"
        >
          Save
        </Button>

        <Button 
          onPress={handleClear}
          variant="warning"
        >
          Clear
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
          Hotkeys: Ctrl+S (Save) | Enter (Execute) | Esc (Back)
        </Text>
      </Box>
    </Box>
  );
}