import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';
import { ProgressBar } from '../../../shared/components/ProgressBar.jsx';
import { useGcodeExecution } from '../hooks/useGcodeExecution.js';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import { formatTime } from '../../../shared/utils/formatting.js';

export function GcodeRunner() {
  const { 
    executionState, 
    pauseExecution, 
    resumeExecution, 
    stopExecution,
    resetExecution 
  } = useGcodeExecution();
  const { goBack } = useAppState();
  const [executionLog, setExecutionLog] = useState([]);

  useInput((input, key) => {
    if (key.escape && !executionState.isExecuting) {
      goBack();
    } else if (input === ' ') {
      if (executionState.isExecuting) {
        if (executionState.isPaused) {
          resumeExecution();
        } else {
          pauseExecution();
        }
      }
    } else if (input === 's' && executionState.isExecuting) {
      stopExecution();
    }
  });

  useEffect(() => {
    if (executionState.status === 'completed') {
      setExecutionLog(prev => [...prev, {
        timestamp: Date.now(),
        message: `Execution completed successfully in ${formatTime(executionState.elapsedTime)}`,
        type: 'success'
      }]);
    } else if (executionState.status === 'error') {
      setExecutionLog(prev => [...prev, {
        timestamp: Date.now(),
        message: `Execution failed: ${executionState.error}`,
        type: 'error'
      }]);
    } else if (executionState.status === 'stopped') {
      setExecutionLog(prev => [...prev, {
        timestamp: Date.now(),
        message: 'Execution stopped by user',
        type: 'warning'
      }]);
    }
  }, [executionState.status, executionState.elapsedTime, executionState.error]);

  const getStatusColor = () => {
    switch (executionState.status) {
      case 'running': return 'green';
      case 'paused': return 'yellow';
      case 'completed': return 'blue';
      case 'error': return 'red';
      case 'stopped': return 'yellow';
      default: return 'white';
    }
  };

  const getStatusText = () => {
    switch (executionState.status) {
      case 'running': return 'Running';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      case 'stopped': return 'Stopped';
      default: return 'Idle';
    }
  };

  const handleReset = () => {
    resetExecution();
    setExecutionLog([]);
    goBack();
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="green">
          G-Code Execution
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text bold color={getStatusColor()}>
            Status: {getStatusText()}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <ProgressBar 
            progress={executionState.progress} 
            width={60}
            color={getStatusColor()}
          />
        </Box>

        <Box gap={4}>
          <Text>
            Line: {executionState.currentLine}/{executionState.totalLines}
          </Text>
          <Text>
            Elapsed: {formatTime(executionState.elapsedTime)}
          </Text>
          <Text>
            Remaining: {formatTime(executionState.estimatedTimeRemaining)}
          </Text>
        </Box>
      </Box>

      {executionState.isExecuting && (
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text bold>Current Operation:</Text>
          </Box>
          <Box paddingX={2}>
            <Text dimColor>
              Executing line {executionState.currentLine}...
            </Text>
          </Box>
        </Box>
      )}

      {executionLog.length > 0 && (
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text bold>Execution Log:</Text>
          </Box>
          <Box flexDirection="column" paddingX={2} height={6}>
            {executionLog.slice(-5).map((entry, index) => (
              <Text 
                key={index}
                color={entry.type === 'success' ? 'green' : 
                      entry.type === 'error' ? 'red' : 'yellow'}
              >
                {new Date(entry.timestamp).toLocaleTimeString()}: {entry.message}
              </Text>
            ))}
          </Box>
        </Box>
      )}

      <Box gap={2}>
        {executionState.isExecuting ? (
          <>
            <Button 
              onPress={executionState.isPaused ? resumeExecution : pauseExecution}
              variant={executionState.isPaused ? 'primary' : 'warning'}
            >
              {executionState.isPaused ? 'Resume' : 'Pause'}
            </Button>

            <Button 
              onPress={stopExecution}
              variant="danger"
            >
              Stop
            </Button>
          </>
        ) : (
          <>
            {(executionState.status === 'completed' || 
              executionState.status === 'error' || 
              executionState.status === 'stopped') && (
              <Button 
                onPress={handleReset}
                variant="primary"
              >
                Done
              </Button>
            )}

            <Button 
              onPress={goBack}
              variant="default"
            >
              Back
            </Button>
          </>
        )}
      </Box>

      <Box marginTop={2}>
        <Text dimColor>
          {executionState.isExecuting ? 
            'Hotkeys: Space (Pause/Resume) | S (Stop)' : 
            'Hotkeys: Esc (Back)'
          }
        </Text>
      </Box>
    </Box>
  );
}