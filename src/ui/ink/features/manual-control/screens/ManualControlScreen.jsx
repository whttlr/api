import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { PositionDisplay } from '../components/PositionDisplay.jsx';
import { JogControls } from '../components/JogControls.jsx';
import { SpindleControls } from '../components/SpindleControls.jsx';
import { StatusIndicators } from '../components/StatusIndicators.jsx';
import { StatusBar } from '../../navigation/components/StatusBar.jsx';
import { useAppState } from '../../../shared/context/AppStateContext.jsx';
import { useJogging } from '../hooks/useJogging.js';

const TABS = [
  { id: 'jog', name: 'Jog Controls', key: '1' },
  { id: 'spindle', name: 'Spindle', key: '2' },
  { id: 'status', name: 'Status', key: '3' }
];

export function ManualControlScreen() {
  const [activeTab, setActiveTab] = useState('jog');
  const { goBack } = useAppState();
  const { emergencyStop } = useJogging();

  useInput((input, key) => {
    if (key.escape) {
      goBack();
    } else if (input === ' ') {
      emergencyStop();
    } else if (key.tab) {
      cycleTab();
    } else {
      const tab = TABS.find(t => t.key === input);
      if (tab) {
        setActiveTab(tab.id);
      }
    }
  });

  const cycleTab = () => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    const nextIndex = (currentIndex + 1) % TABS.length;
    setActiveTab(TABS[nextIndex].id);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'jog':
        return <JogControls />;
      case 'spindle':
        return <SpindleControls />;
      case 'status':
        return <StatusIndicators />;
      default:
        return <JogControls />;
    }
  };

  return (
    <Box flexDirection="column" height="100%">
      <Box flex={1} padding={1}>
        <Box flexDirection="row" width="100%">
          <Box flexDirection="column" width={30} marginRight={2}>
            <PositionDisplay />
          </Box>

          <Box flexDirection="column" flex={1}>
            <Box marginBottom={1}>
              <Text bold color="green">
                🕹️ Manual Control
              </Text>
            </Box>

            <Box marginBottom={2}>
              <Box gap={1}>
                {TABS.map(tab => (
                  <Box
                    key={tab.id}
                    paddingX={2}
                    paddingY={0}
                    borderStyle={activeTab === tab.id ? 'double' : 'single'}
                    borderColor={activeTab === tab.id ? 'green' : 'gray'}
                  >
                    <Text 
                      color={activeTab === tab.id ? 'green' : 'white'}
                      bold={activeTab === tab.id}
                    >
                      [{tab.key}] {tab.name}
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box flex={1}>
              {renderTabContent()}
            </Box>

            <Box marginTop={2}>
              <Text dimColor>
                Global: Space (E-Stop) | Tab (Next Tab) | Esc (Back)
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
      
      <StatusBar />
    </Box>
  );
}