/**
 * Settings Navigation Component
 * 
 * Sidebar navigation for different settings sections.
 * 
 * @module SettingsNavigation
 */

import React from 'react';
import { Box, Text } from 'ink';

/**
 * Settings Navigation Component
 * Sidebar with settings section navigation
 */
export function SettingsNavigation({ 
  sections = [], 
  currentSection = '', 
  onNavigate = () => {},
  onInput = () => {} 
}) {
  
  return (
    <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} paddingY={1}>
      <Text bold color="white" marginBottom={1}>Settings Sections:</Text>
      
      <Box flexDirection="column" gap={1}>
        {sections.map((section) => (
          <Box 
            key={section.id}
            borderStyle={currentSection === section.id ? 'single' : undefined}
            borderColor={currentSection === section.id ? 'cyan' : undefined}
            paddingX={currentSection === section.id ? 1 : 0}
            paddingY={currentSection === section.id ? 0 : 0}
          >
            <Text color={currentSection === section.id ? 'cyan' : 'white'}>
              [{section.key}] {section.icon} {section.label}
            </Text>
            {currentSection === section.id && (
              <Text dimColor fontSize="small" marginTop={0}>
                {section.description}
              </Text>
            )}
          </Box>
        ))}
      </Box>
      
      <Box marginTop={2}>
        <Text dimColor>Use number keys to navigate</Text>
      </Box>
    </Box>
  );
}

export default SettingsNavigation;