/**
 * Status Bar Component
 * 
 * Displays comprehensive machine status, position, connection state,
 * and navigation shortcuts in a multi-row status bar layout.
 * 
 * @module StatusBar
 */

import React from 'react';
import { Box, Text } from 'ink';
import { useCNC, useSettings, useAppState } from '../../contexts/index.js';
import { getDisplayValue } from '../../services/UnitConverter.js';

/**
 * Connection Indicator Component
 * Shows current connection status with colored symbol
 */
export function ConnectionIndicator() {
  const { state } = useCNC();
  const { connection } = state;
  
  const getStatusColor = () => {
    switch (connection.status) {
      case 'connected': return 'green';
      case 'connecting': return 'yellow';
      case 'error': return 'red';
      default: return 'gray';
    }
  };
  
  const getStatusSymbol = () => {
    switch (connection.status) {
      case 'connected': return '●';
      case 'connecting': return '◐';
      case 'error': return '✖';
      default: return '○';
    }
  };
  
  return (
    <Text color={getStatusColor()}>
      {getStatusSymbol()} {connection.port || 'Not connected'}
    </Text>
  );
}

/**
 * Machine Position Display Component
 * @param {Object} props - Component props
 * @param {Object} props.position - Position object {x, y, z}
 * @param {string} props.label - Position label ('Work' or 'Machine')
 * @param {string} props.units - Unit system
 * @param {Function} props.formatPosition - Position formatting function
 * @param {string} props.color - Text color
 */
export function PositionDisplay({ position, label, units, formatPosition, color = 'white' }) {
  const formatCoord = (pos) => {
    if (!pos) return '0,0,0';
    return `${formatPosition(pos.x || 0, units)},${formatPosition(pos.y || 0, units)},${formatPosition(pos.z || 0, units)}`;
  };

  return (
    <Text>
      {label}: <Text color={color} bold>{formatCoord(position)}</Text>
    </Text>
  );
}

/**
 * Spindle Status Display Component
 * @param {Object} props - Component props
 * @param {Object} props.status - Machine status object
 */
export function SpindleStatus({ status }) {
  if (!status.spindleSpeed || status.spindleSpeed === 0) {
    return <Text color="gray">○ Off</Text>;
  }
  
  const direction = status.spindleDirection === 'CW' ? '↻' : 
                   status.spindleDirection === 'CCW' ? '↺' : '○';
  
  return (
    <Text color="green">
      {direction} {status.spindleSpeed}rpm
    </Text>
  );
}

/**
 * Feed Rate Display Component
 * @param {Object} props - Component props
 * @param {Object} props.status - Machine status object
 * @param {string} props.units - Unit system
 * @param {string} props.displayUnit - Display unit string
 */
export function FeedRateDisplay({ status, units, displayUnit }) {
  if (!status.feedRate || status.feedRate === 0) {
    return <Text color="gray">0 {displayUnit}/min</Text>;
  }
  
  const displayRate = getDisplayValue(status.feedRate, units);
  return (
    <Text color="cyan">
      {displayRate.toFixed(0)} {displayUnit}/min
    </Text>
  );
}

/**
 * Alarm Indicators Component
 * @param {Object} props - Component props
 * @param {Array} props.alarms - Array of alarm objects
 */
export function AlarmIndicators({ alarms = [] }) {
  if (!alarms.length) return null;
  
  return (
    <Box>
      <Text color="red" bold>🚨 ALARM</Text>
      {alarms.slice(0, 1).map((alarm, index) => (
        <Text key={index} color="red">Code {alarm.code}</Text>
      ))}
    </Box>
  );
}

/**
 * Limit Switch Status Component
 * @param {Object} props - Component props
 * @param {Object} props.limits - Limits status object
 */
export function LimitSwitchStatus({ limits }) {
  if (!limits) return null;
  
  const limitStates = [];
  if (limits.x) limitStates.push('X');
  if (limits.y) limitStates.push('Y');
  if (limits.z) limitStates.push('Z');
  
  if (limitStates.length === 0) return null;
  
  return (
    <Text color="yellow">
      🛑 Limits: {limitStates.join(',')}
    </Text>
  );
}

/**
 * Job Progress Indicator Component
 * @param {Object} props - Component props
 * @param {Object} props.job - Job state object
 */
export function JobProgressIndicator({ job }) {
  if (!job || !job.isRunning) return null;
  
  return (
    <Text color="cyan">
      Job: Line {job.currentLine || 0}/{job.totalLines || 0}
    </Text>
  );
}

/**
 * Navigation Shortcuts Component
 * @param {Object} props - Component props
 * @param {Object} props.job - Job state for conditional shortcuts
 */
export function NavigationShortcuts({ job }) {
  return (
    <Box gap={2}>
      <Text dimColor>[g] G-Code</Text>
      <Text dimColor>[f] Files</Text>
      {job && job.isRunning && <Text dimColor>[j] Job</Text>}
      <Text dimColor>[s] Settings</Text>
      <Text dimColor>[?] Help</Text>
    </Box>
  );
}

/**
 * Main Status Bar Component
 * Multi-row status display with machine information and navigation
 */
export function StatusBar() {
  const { state: cncState } = useCNC();
  const { state: settings, formatPosition, getDisplayUnit } = useSettings();
  const { state: appState } = useAppState();

  // Extract machine state information
  const status = cncState.machine.status || {};
  const machinePos = status.machinePosition || cncState.machine.position;
  const workPos = status.workPosition || cncState.machine.position;
  const alarms = status.alarms || [];
  const displayUnit = getDisplayUnit(settings.user.units);

  return (
    <Box 
      borderStyle="single" 
      borderTop={true}
      borderColor="gray"
      paddingX={1}
      flexDirection="column"
      width="100%"
    >
      {/* Top row - Machine status and connection */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={3}>
          <Text>
            Status: <Text 
              color={
                status.state === 'Idle' ? 'green' : 
                status.state === 'Run' ? 'cyan' : 
                status.state === 'Alarm' ? 'red' : 'yellow'
              } 
              bold
            >
              {status.state || 'Unknown'}
            </Text>
          </Text>
          <ConnectionIndicator />
          <AlarmIndicators alarms={alarms} />
          <LimitSwitchStatus limits={status.limits} />
        </Box>
        
        <Box gap={2}>
          {appState.isLoading && <Text color="yellow">⏳</Text>}
          <Text dimColor>
            [u] {settings.user.units === 'metric' ? 'Metric' : 'Imperial'}
          </Text>
        </Box>
      </Box>

      {/* Middle row - Position coordinates */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Box gap={4}>
          <PositionDisplay
            position={workPos}
            label="Work"
            units={settings.user.units}
            formatPosition={formatPosition}
            color="white"
          />
          <Text> {displayUnit}</Text>
          <PositionDisplay
            position={machinePos}
            label="Machine"
            units={settings.user.units}
            formatPosition={formatPosition}
            color="gray"
          />
          <Text> {displayUnit}</Text>
        </Box>
      </Box>

      {/* Bottom row - Spindle, feed rate, and navigation */}
      <Box justifyContent="space-between">
        <Box gap={3}>
          <Text>Spindle: <SpindleStatus status={status} /></Text>
          <Text>
            Feed: <FeedRateDisplay 
              status={status} 
              units={settings.user.units}
              displayUnit={displayUnit}
            />
          </Text>
          <JobProgressIndicator job={cncState.job} />
        </Box>

        <NavigationShortcuts job={cncState.job} />
      </Box>
    </Box>
  );
}

// Default export
export default StatusBar;