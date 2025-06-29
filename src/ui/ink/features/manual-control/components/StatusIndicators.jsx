import React from 'react';
import { Box, Text } from 'ink';
import { useMachine } from '../../../shared/context/MachineContext.jsx';
import { useMachineStatus } from '../hooks/useMachineStatus.js';
import { formatTime } from '../../../shared/utils/formatting.js';

export function StatusIndicators() {
  const { state: machineState } = useMachine();
  const { isPolling, lastUpdate, getPollingInfo } = useMachineStatus();

  const getConnectionColor = () => {
    return machineState.connection.isConnected ? 'green' : 'red';
  };

  const getConnectionText = () => {
    if (machineState.connection.isConnected) {
      return `Connected (${machineState.connection.port})`;
    }
    return 'Disconnected';
  };

  const getStatusColor = (state) => {
    switch (state) {
      case 'Idle': return 'green';
      case 'Run': return 'blue';
      case 'Hold': return 'yellow';
      case 'Jog': return 'cyan';
      case 'Alarm': return 'red';
      case 'Door': return 'yellow';
      case 'Check': return 'magenta';
      case 'Home': return 'cyan';
      case 'Sleep': return 'gray';
      default: return 'white';
    }
  };

  const getUptimeDisplay = () => {
    if (!lastUpdate) return 'No data';
    const uptime = Date.now() - lastUpdate;
    return formatTime(uptime);
  };

  const pollingInfo = getPollingInfo();

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Status Indicators
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text bold>Connection</Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text>Status:</Text>
          <Text color={getConnectionColor()} bold>
            {getConnectionText()}
          </Text>
        </Box>

        {machineState.connection.isConnected && (
          <Box justifyContent="space-between" marginBottom={0}>
            <Text>Baud Rate:</Text>
            <Text color="white">
              {machineState.connection.baudRate}
            </Text>
          </Box>
        )}
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text bold>Machine State</Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text>Current State:</Text>
          <Text color={getStatusColor(machineState.status.state)} bold>
            {machineState.status.state}
          </Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text>Feed Rate:</Text>
          <Text color="white">
            {machineState.status.feedRate} mm/min
          </Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text>Spindle:</Text>
          <Text color={machineState.status.spindleSpeed > 0 ? 'green' : 'gray'}>
            {machineState.status.spindleSpeed} RPM {machineState.status.spindleDirection}
          </Text>
        </Box>
      </Box>

      <Box flexDirection="column" marginBottom={2}>
        <Box marginBottom={1}>
          <Text bold>Coordinate System</Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text>Active WCS:</Text>
          <Text color="yellow">
            {machineState.workCoordinateSystem}
          </Text>
        </Box>
      </Box>

      {machineState.alarms.length > 0 && (
        <Box flexDirection="column" marginBottom={2}>
          <Box marginBottom={1}>
            <Text bold color="red">
              Active Alarms ({machineState.alarms.length})
            </Text>
          </Box>
          {machineState.alarms.slice(0, 2).map((alarm, index) => (
            <Box key={index} marginBottom={0}>
              <Text color="red">
                • {alarm.message || `Alarm ${alarm.code}`}
              </Text>
            </Box>
          ))}
          {machineState.alarms.length > 2 && (
            <Text dimColor>
              ... and {machineState.alarms.length - 2} more
            </Text>
          )}
        </Box>
      )}

      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>System Status</Text>
        </Box>

        <Box justifyContent="space-between" marginBottom={0}>
          <Text>Status Polling:</Text>
          <Text color={isPolling ? 'green' : 'red'}>
            {isPolling ? 'Active' : 'Inactive'}
          </Text>
        </Box>

        {lastUpdate && (
          <>
            <Box justifyContent="space-between" marginBottom={0}>
              <Text>Last Update:</Text>
              <Text color="white">
                {new Date(lastUpdate).toLocaleTimeString()}
              </Text>
            </Box>

            <Box justifyContent="space-between" marginBottom={0}>
              <Text>Update Age:</Text>
              <Text color="white">
                {getUptimeDisplay()}
              </Text>
            </Box>
          </>
        )}

        <Box justifyContent="space-between" marginBottom={0}>
          <Text>History Size:</Text>
          <Text color="white">
            {pollingInfo.historySize} entries
          </Text>
        </Box>
      </Box>
    </Box>
  );
}