import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';
import { TextInput } from '../../../shared/components/TextInput.jsx';
import { StatusBar } from '../../navigation/components/StatusBar.jsx';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import { useMachine } from '../../../shared/context/MachineContext.jsx';

export function AdvancedControlScreen() {
  const [commandInput, setCommandInput] = useState('');
  const [showCommandInput, setShowCommandInput] = useState(false);
  const [commandHistory, setCommandHistory] = useState([]);
  const [selectedWCS, setSelectedWCS] = useState('G54');
  
  const { goBack } = useAppState();
  const { state: machineState, setWorkCoordinateSystem } = useMachine();

  const workCoordinateSystems = ['G53', 'G54', 'G55', 'G56', 'G57', 'G58', 'G59'];

  useInput((input, key) => {
    if (showCommandInput) {
      if (key.escape) {
        setShowCommandInput(false);
        setCommandInput('');
      } else if (key.return) {
        handleCommandSubmit();
      }
      return;
    }

    if (key.escape) {
      goBack();
    } else if (input === 'c') {
      setShowCommandInput(true);
    } else if (input === 'w') {
      cycleWCS();
    } else if (input === 'r') {
      resetWorkCoordinates();
    }
  });

  const handleCommandSubmit = () => {
    if (commandInput.trim()) {
      executeCommand(commandInput.trim());
      setCommandHistory(prev => [...prev, {
        command: commandInput.trim(),
        timestamp: Date.now(),
        response: 'ok'
      }].slice(-10));
    }
    setCommandInput('');
    setShowCommandInput(false);
  };

  const executeCommand = (command) => {
    console.log(`Executing command: ${command}`);
  };

  const cycleWCS = () => {
    const currentIndex = workCoordinateSystems.indexOf(selectedWCS);
    const nextIndex = (currentIndex + 1) % workCoordinateSystems.length;
    const newWCS = workCoordinateSystems[nextIndex];
    setSelectedWCS(newWCS);
    setWorkCoordinateSystem(newWCS);
  };

  const setWCS = (wcs) => {
    setSelectedWCS(wcs);
    setWorkCoordinateSystem(wcs);
  };

  const resetWorkCoordinates = () => {
    executeCommand('G10 L20 P1 X0 Y0 Z0');
  };

  const handleProbeZ = () => {
    executeCommand('G38.2 Z-10 F100');
  };

  const handleSetWorkZero = () => {
    executeCommand('G10 L20 P1 X0 Y0 Z0');
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} padding={1}>
        <Box marginBottom={1}>
          <Text bold color="green">
            ⚙️ Advanced Control
          </Text>
        </Box>

        <Box flexDirection="row" gap={4}>
          <Box flexDirection="column" flex={1}>
            <Box marginBottom={2}>
              <Box marginBottom={1}>
                <Text bold color="cyan">
                  Work Coordinate System
                </Text>
              </Box>

              <Box justifyContent="space-between" marginBottom={1}>
                <Text bold>Active WCS:</Text>
                <Text color="yellow">
                  {machineState.workCoordinateSystem}
                </Text>
              </Box>

              <Box flexDirection="row" flexWrap="wrap" gap={1} marginBottom={2}>
                {workCoordinateSystems.map(wcs => (
                  <Button
                    key={wcs}
                    selected={selectedWCS === wcs}
                    onPress={() => setWCS(wcs)}
                    variant="default"
                  >
                    {wcs}
                  </Button>
                ))}
              </Box>

              <Box gap={1}>
                <Button
                  onPress={handleSetWorkZero}
                  variant="primary"
                >
                  Set Work Zero
                </Button>
                <Button
                  onPress={resetWorkCoordinates}
                  variant="warning"
                >
                  Reset Coordinates
                </Button>
              </Box>
            </Box>

            <Box marginBottom={2}>
              <Box marginBottom={1}>
                <Text bold color="cyan">
                  Probing
                </Text>
              </Box>

              <Box gap={1}>
                <Button
                  onPress={handleProbeZ}
                  variant="primary"
                >
                  Probe Z Surface
                </Button>
                <Button
                  onPress={() => executeCommand('G38.2 X-10 F100')}
                  variant="default"
                >
                  Probe X-
                </Button>
                <Button
                  onPress={() => executeCommand('G38.2 Y-10 F100')}
                  variant="default"
                >
                  Probe Y-
                </Button>
              </Box>
            </Box>

            <Box marginBottom={2}>
              <Box marginBottom={1}>
                <Text bold color="cyan">
                  Machine Functions
                </Text>
              </Box>

              <Box gap={1} marginBottom={1}>
                <Button
                  onPress={() => executeCommand('$X')}
                  variant="warning"
                >
                  Unlock Alarm
                </Button>
                <Button
                  onPress={() => executeCommand('$$')}
                  variant="default"
                >
                  View Settings
                </Button>
              </Box>

              <Box gap={1}>
                <Button
                  onPress={() => executeCommand('$RST=$')}
                  variant="danger"
                >
                  Reset Settings
                </Button>
                <Button
                  onPress={() => executeCommand('$RST=#')}
                  variant="danger"
                >
                  Reset Coordinates
                </Button>
              </Box>
            </Box>
          </Box>

          <Box flexDirection="column" flex={1}>
            {showCommandInput ? (
              <Box flexDirection="column" marginBottom={2}>
                <Box marginBottom={1}>
                  <Text bold>Send Command:</Text>
                </Box>
                <TextInput
                  value={commandInput}
                  onChange={setCommandInput}
                  onSubmit={handleCommandSubmit}
                  placeholder="Enter G-code or $ command..."
                  focus={true}
                  width={40}
                />
                <Box marginTop={1}>
                  <Text dimColor>
                    Enter to send, Esc to cancel
                  </Text>
                </Box>
              </Box>
            ) : (
              <Box marginBottom={2}>
                <Box marginBottom={1}>
                  <Text bold color="cyan">
                    Manual Command
                  </Text>
                </Box>
                <Button
                  onPress={() => setShowCommandInput(true)}
                  variant="primary"
                >
                  Send Command
                </Button>
              </Box>
            )}

            {commandHistory.length > 0 && (
              <Box flexDirection="column">
                <Box marginBottom={1}>
                  <Text bold color="cyan">
                    Command History
                  </Text>
                </Box>
                <Box flexDirection="column" height={10}>
                  {commandHistory.slice(-5).map((entry, index) => (
                    <Box key={index} marginBottom={0}>
                      <Text dimColor>
                        {new Date(entry.timestamp).toLocaleTimeString()}:
                      </Text>
                      <Text marginLeft={1}>
                        {entry.command}
                      </Text>
                      <Text marginLeft={1} color="green">
                        → {entry.response}
                      </Text>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </Box>

        <Box marginTop={2}>
          <Text dimColor>
            Hotkeys: C (Command) | W (Cycle WCS) | R (Reset Coords) | Esc (Back)
          </Text>
        </Box>
      </Box>
      
      <StatusBar />
    </Box>
  );
}