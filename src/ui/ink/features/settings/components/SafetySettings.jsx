/**
 * Safety Settings Component
 * 
 * Configuration interface for safety parameters and emergency procedures.
 * 
 * @module SafetySettings
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Safety Settings Component
 * Interface for safety configuration parameters
 */
export function SafetySettings({ 
  settings = {}, 
  onUpdate = () => {} 
}) {
  
  const {
    enableLimits = true,
    enableSoftLimits = true,
    enableHardLimits = true,
    homingRequired = true,
    emergencyStopEnabled = true,
    maxJogDistance = 10,
    maxJogSpeed = 5000
  } = settings;
  
  return (
    <Box flexDirection="column">
      <Text bold color="red" marginBottom={1}>🛡️ Safety Configuration</Text>
      
      {/* Limit Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1} paddingY={1}>
          <Text bold color="red" marginBottom={1}>Limit Switches</Text>
          
          <Box flexDirection="column" gap={1}>
            <Text>
              Soft Limits: <Text color={enableSoftLimits ? "green" : "red"}>
                {enableSoftLimits ? "✓ Enabled" : "✗ Disabled"}
              </Text>
            </Text>
            <Text>
              Hard Limits: <Text color={enableHardLimits ? "green" : "red"}>
                {enableHardLimits ? "✓ Enabled" : "✗ Disabled"}
              </Text>
            </Text>
            <Text dimColor>[L] Toggle limit settings</Text>
          </Box>
        </Box>
      </Box>
      
      {/* Homing Settings */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" paddingX={1} paddingY={1}>
          <Text bold color="yellow" marginBottom={1}>Homing Requirements</Text>
          
          <Text>
            Homing Required: <Text color={homingRequired ? "green" : "red"}>
              {homingRequired ? "✓ Required" : "✗ Optional"}
            </Text>
          </Text>
          <Text dimColor>[H] Toggle homing requirement</Text>
        </Box>
      </Box>
      
      {/* Emergency Stop */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="red" paddingX={1} paddingY={1}>
          <Text bold color="red" marginBottom={1}>Emergency Stop</Text>
          
          <Text>
            E-Stop: <Text color={emergencyStopEnabled ? "green" : "red"}>
              {emergencyStopEnabled ? "✓ Enabled" : "✗ Disabled"}
            </Text>
          </Text>
          <Text dimColor>[E] Toggle emergency stop</Text>
        </Box>
      </Box>
      
      {/* Jog Limits */}
      <Box marginBottom={2}>
        <Box flexDirection="column" borderStyle="single" borderColor="orange" paddingX={1} paddingY={1}>
          <Text bold color="yellow" marginBottom={1}>Jog Safety Limits</Text>
          
          <Box flexDirection="column" gap={1}>
            <Text>Max Jog Distance: {maxJogDistance} mm</Text>
            <Text>Max Jog Speed: {maxJogSpeed} mm/min</Text>
            <Text dimColor>[J] Adjust jog limits</Text>
          </Box>
        </Box>
      </Box>
      
      {/* Warning */}
      <Box marginTop={1}>
        <Text color="red">⚠️ Disabling safety features may cause machine damage or injury</Text>
      </Box>
    </Box>
  );
}

export default SafetySettings;