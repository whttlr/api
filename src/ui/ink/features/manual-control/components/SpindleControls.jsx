import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Button } from '../../../shared/components/Button.jsx';
import { TextInput } from '../../../shared/components/TextInput.jsx';
import { useMachine } from '../../../shared/context/MachineContext.jsx';
import { useSettings } from '../../../shared/context/SettingsContext.jsx';
import { formatRpm } from '../../../shared/utils/formatting.js';

export function SpindleControls() {
  const [rpmInput, setRpmInput] = useState('');
  const [showRpmInput, setShowRpmInput] = useState(false);
  const [coolantOn, setCoolantOn] = useState(false);
  
  const { state: machineState, updateStatus } = useMachine();
  const { state: settings } = useSettings();

  useInput((input, key) => {
    if (showRpmInput) {
      if (key.escape) {
        setShowRpmInput(false);
        setRpmInput('');
      } else if (key.return) {
        handleRpmSubmit();
      }
      return;
    }

    if (input === 'm') {
      toggleSpindle();
    } else if (input === 'r') {
      setShowRpmInput(true);
      setRpmInput(machineState.status.spindleSpeed.toString());
    } else if (input === 'd') {
      toggleDirection();
    } else if (input === 'c') {
      toggleCoolant();
    } else if (input === ' ') {
      handleEmergencyStop();
    }
  });

  const toggleSpindle = () => {
    const newSpeed = machineState.status.spindleSpeed > 0 ? 0 : 1000;
    updateStatus({ spindleSpeed: newSpeed });
  };

  const toggleDirection = () => {
    const newDirection = machineState.status.spindleDirection === 'CW' ? 'CCW' : 'CW';
    updateStatus({ spindleDirection: newDirection });
  };

  const toggleCoolant = () => {
    setCoolantOn(!coolantOn);
  };

  const handleRpmSubmit = () => {
    const rpm = parseInt(rpmInput, 10);
    if (!isNaN(rpm) && rpm >= 0 && rpm <= settings.machine.limits.rpm.max) {
      updateStatus({ spindleSpeed: rpm });
    }
    setShowRpmInput(false);
    setRpmInput('');
  };

  const handleEmergencyStop = () => {
    updateStatus({ spindleSpeed: 0 });
    setCoolantOn(false);
  };

  const isSpindleRunning = machineState.status.spindleSpeed > 0;

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Spindle Controls
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Box justifyContent="space-between" marginBottom={0}>
          <Text bold>Speed:</Text>
          <Text color={isSpindleRunning ? 'green' : 'gray'}>
            {formatRpm(machineState.status.spindleSpeed)}
          </Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text bold>Direction:</Text>
          <Text color={isSpindleRunning ? 'green' : 'gray'}>
            {machineState.status.spindleDirection}
          </Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text bold>Status:</Text>
          <Text color={isSpindleRunning ? 'green' : 'gray'} bold>
            {isSpindleRunning ? 'RUNNING' : 'STOPPED'}
          </Text>
        </Box>
      </Box>

      {showRpmInput ? (
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text bold>Set RPM (0-{settings.machine.limits.rpm.max}):</Text>
          </Box>
          <TextInput
            value={rpmInput}
            onChange={setRpmInput}
            onSubmit={handleRpmSubmit}
            placeholder="Enter RPM..."
            focus={true}
            width={20}
          />
          <Box marginTop={1}>
            <Text dimColor>
              Enter to confirm, Esc to cancel
            </Text>
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text bold>Spindle Controls</Text>
          </Box>

          <Box gap={1} marginBottom={1}>
            <Button
              onPress={toggleSpindle}
              variant={isSpindleRunning ? 'danger' : 'primary'}
            >
              {isSpindleRunning ? 'Stop' : 'Start'}
            </Button>

            <Button
              onPress={() => setShowRpmInput(true)}
              variant="default"
            >
              Set RPM
            </Button>

            <Button
              onPress={toggleDirection}
              variant="default"
              disabled={isSpindleRunning}
            >
              {machineState.status.spindleDirection}
            </Button>
          </Box>
        </Box>
      )}

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text bold>Coolant Controls</Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={1}>
          <Text bold>Coolant:</Text>
          <Text color={coolantOn ? 'blue' : 'gray'} bold>
            {coolantOn ? 'ON' : 'OFF'}
          </Text>
        </Box>

        <Button
          onPress={toggleCoolant}
          variant={coolantOn ? 'warning' : 'default'}
        >
          {coolantOn ? 'Turn Off' : 'Turn On'}
        </Button>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Button
          onPress={handleEmergencyStop}
          variant="danger"
        >
          🛑 EMERGENCY STOP
        </Button>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          Hotkeys: M (Start/Stop) | R (Set RPM) | D (Direction) | C (Coolant) | Space (E-Stop)
        </Text>
      </Box>
    </Box>
  );
}