import React from 'react';
import { Box, Text } from 'ink';
import { useAppState } from '../../contexts/AppStateContext.jsx';

const HelpSidebar = ({ isOpen }) => {
  const { state } = useAppState();
  const { currentScreen, sidebar } = state;

  const helpContent = {
    'main-menu': {
      title: 'Main Menu Help',
      shortcuts: [
        { key: '↑/↓', desc: 'Navigate menu items' },
        { key: 'Enter', desc: 'Select menu item' },
        { key: 'ESC', desc: 'Exit application' },
        { key: '?', desc: 'Toggle this help sidebar' }
      ],
      description: 'The main menu provides access to all CNC control features.'
    },
    connection: {
      title: 'Connection Help',
      shortcuts: [
        { key: '↑/↓', desc: 'Navigate ports' },
        { key: 'Enter', desc: 'Connect to selected port' },
        { key: 'r', desc: 'Refresh port list' },
        { key: 'd', desc: 'Disconnect' },
        { key: 'ESC', desc: 'Back to main menu' },
        { key: '?', desc: 'Toggle help' }
      ],
      description: 'Connect to your CNC machine via serial port. Select the correct port and press Enter to connect.'
    },
    'file-browser': {
      title: 'File Browser Help',
      shortcuts: [
        { key: '↑/↓', desc: 'Navigate files' },
        { key: 'Enter', desc: 'Select/open file' },
        { key: 'Tab', desc: 'Switch panels' },
        { key: 'Space', desc: 'Preview file' },
        { key: 'ESC', desc: 'Back to main menu' },
        { key: '?', desc: 'Toggle help' }
      ],
      description: 'Browse and select G-code files to execute on your CNC machine.'
    },
    'gcode-execution': {
      title: 'G-code Execution Help',
      shortcuts: [
        { key: 'Enter', desc: 'Execute G-code command' },
        { key: 'r', desc: 'Show G-code reference' },
        { key: 'ESC', desc: 'Back to main menu' },
        { key: '?', desc: 'Toggle help' }
      ],
      description: 'Execute G-code commands with real-time validation and feedback.',
      gcode: {
        movement: [
          { cmd: 'G0 X10 Y20', desc: 'Rapid move to position' },
          { cmd: 'G1 X10 Y20 F1000', desc: 'Linear move with feed rate' },
          { cmd: 'G2/G3', desc: 'Clockwise/counter-clockwise arc' },
          { cmd: 'G28', desc: 'Home all axes' },
          { cmd: 'G30', desc: 'Go to predefined position' }
        ],
        spindle: [
          { cmd: 'M3 S1000', desc: 'Start spindle clockwise at speed' },
          { cmd: 'M4 S1000', desc: 'Start spindle counter-clockwise' },
          { cmd: 'M5', desc: 'Stop spindle' }
        ],
        settings: [
          { cmd: '$$', desc: 'View all GRBL settings' },
          { cmd: '$#', desc: 'View coordinate system data' },
          { cmd: '$G', desc: 'View current G-code state' },
          { cmd: '$I', desc: 'View build info' }
        ],
        control: [
          { cmd: '?', desc: 'Current status report' },
          { cmd: '~', desc: 'Resume from feed hold' },
          { cmd: '!', desc: 'Feed hold (pause)' },
          { cmd: 'Ctrl+X', desc: 'Reset (soft reset)' }
        ]
      }
    },
    'manual-control': {
      title: 'Manual Control Help',
      shortcuts: [
        { key: '←/→/↑/↓', desc: 'Jog X/Y axes' },
        { key: 'Page Up/Down', desc: 'Jog Z axis' },
        { key: '+/-', desc: 'Adjust jog step' },
        { key: 'h', desc: 'Home all axes' },
        { key: 'u', desc: 'Unlock alarm' },
        { key: 'ESC', desc: 'Back to main menu' },
        { key: '?', desc: 'Toggle help' }
      ],
      description: 'Manually control your CNC machine with keyboard shortcuts for precise positioning.'
    },
    settings: {
      title: 'Settings Help',
      shortcuts: [
        { key: '↑/↓', desc: 'Navigate settings' },
        { key: 'Enter', desc: 'Edit setting' },
        { key: 's', desc: 'Save settings' },
        { key: 'r', desc: 'Reset to defaults' },
        { key: 'ESC', desc: 'Back to main menu' },
        { key: '?', desc: 'Toggle help' }
      ],
      description: 'Configure machine settings, connection parameters, and application preferences.'
    },
    'job-progress': {
      title: 'Job Progress Help',
      shortcuts: [
        { key: 'Space', desc: 'Pause/Resume' },
        { key: 's', desc: 'Stop job' },
        { key: 'ESC', desc: 'Back to main menu' },
        { key: '?', desc: 'Toggle help' }
      ],
      description: 'Monitor the progress of your current CNC job with real-time updates.'
    }
  };

  const currentHelp = helpContent[currentScreen] || helpContent['main-menu'];

  if (!isOpen) return null;

  // Handle command confirmation display
  if (sidebar.type === 'command-confirmation') {
    const { command, isConnected, validation, onConfirm, onCancel } = sidebar.data || {};
    const isValid = validation ? validation.isValid : true;
    const hasErrors = validation && validation.errors && validation.errors.length > 0;
    const hasWarnings = validation && validation.warnings && validation.warnings.length > 0;
    
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={isValid ? "yellow" : "red"}
        paddingX={1}
        minWidth={35}
        maxWidth={40}
      >
        <Box marginBottom={1}>
          <Text bold color={isValid ? "yellow" : "red"}>
            {isValid ? "ℹ️ Confirm Command Execution" : "❌ Command Validation"}
          </Text>
        </Box>

        <Box marginBottom={1}>
          <Text dimColor wrap="wrap">
            {isValid ? "About to execute:" : "Command to validate:"}
          </Text>
        </Box>

        <Box marginBottom={1} paddingX={1} borderStyle="single" borderColor={isValid ? "cyan" : "red"}>
          <Text color={isValid ? "cyan" : "red"} bold>
            {command || '(command not available)'}
          </Text>
        </Box>

        {/* Validation feedback */}
        {validation && (
          <Box flexDirection="column" marginBottom={1}>
            {hasErrors && (
              <Box flexDirection="column">
                <Text bold color="red">Errors:</Text>
                {validation.errors.map((error, index) => (
                  <Box key={index}>
                    <Text color="red">• {error}</Text>
                  </Box>
                ))}
              </Box>
            )}
            
            {hasWarnings && (
              <Box flexDirection="column" marginTop={hasErrors ? 1 : 0}>
                <Text bold color="yellow">Warnings:</Text>
                {validation.warnings.map((warning, index) => (
                  <Box key={index}>
                    <Text color="yellow">• {warning}</Text>
                  </Box>
                ))}
              </Box>
            )}
            
            {validation.suggestions && validation.suggestions.length > 0 && (
              <Box flexDirection="column" marginTop={(hasErrors || hasWarnings) ? 1 : 0}>
                <Text bold color="green">Suggestions:</Text>
                {validation.suggestions.map((suggestion, index) => (
                  <Box key={index}>
                    <Text color="green">• {suggestion}</Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        <Box marginBottom={1}>
          <Text dimColor wrap="wrap">
            {isConnected 
              ? (isValid ? "This command will control your CNC machine. Are you sure?" : "This command has errors and cannot be executed.")
              : (isValid ? "This command would control your CNC machine when connected. Continue to validate?" : "This command has validation errors.")
            }
          </Text>
        </Box>

        {!isConnected && isValid && (
          <Box marginBottom={1}>
            <Text color="blue" dimColor>
              ℹ️ No machine connected - command will be validated but not executed
            </Text>
          </Box>
        )}

        <Box flexDirection="column" marginBottom={1}>
          <Text bold underline color="yellow">
            Keyboard Shortcuts:
          </Text>
          <Box marginTop={1}>
            <Text color="green">Enter       </Text>
            <Text>{isValid ? (isConnected ? 'Execute' : 'Validate') : 'Acknowledge'}</Text>
          </Box>
          <Box>
            <Text color="green">ESC         </Text>
            <Text>Cancel</Text>
          </Box>
        </Box>

        <Box borderStyle="single" borderColor="dimColor">
          <Text dimColor italic>
            Press Enter to {isValid ? 'confirm' : 'acknowledge'}, ESC to cancel
          </Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      paddingX={1}
      minWidth={35}
      maxWidth={40}
    >
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {currentHelp.title}
        </Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor wrap="wrap">
          {currentHelp.description}
        </Text>
      </Box>

      <Box flexDirection="column">
        <Text bold underline color="yellow">
          Keyboard Shortcuts:
        </Text>
        {currentHelp.shortcuts.map((shortcut, index) => (
          <Box key={index} marginTop={index === 0 ? 1 : 0}>
            <Text color="green">{shortcut.key.padEnd(12)}</Text>
            <Text>{shortcut.desc}</Text>
          </Box>
        ))}
      </Box>

      {/* G-code Reference for gcode-execution screen */}
      {currentScreen === 'gcode-execution' && currentHelp.gcode && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold underline color="magenta">
            G-code Reference:
          </Text>
          
          <Box flexDirection="column" marginTop={1}>
            {/* Combine all commands into a single list */}
            {[
              ...currentHelp.gcode.movement,
              ...currentHelp.gcode.spindle,
              ...currentHelp.gcode.settings,
              ...currentHelp.gcode.control
            ].map((item, index) => (
              <Box key={index}>
                <Text color="green">{item.cmd.padEnd(18)}</Text>
                <Text dimColor>{item.desc}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      <Box marginTop={1} borderStyle="single" borderColor="dimColor">
        <Text dimColor italic>
          Press '?' to close help
        </Text>
      </Box>
    </Box>
  );
};

export default HelpSidebar;