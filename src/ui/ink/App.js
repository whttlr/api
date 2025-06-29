import React from 'react';
import { Box, Text } from 'ink';

// Simple test version of the main App to verify architecture
function AppRouter() {
  const [currentScreen, setCurrentScreen] = React.useState('main-menu');

  const renderScreen = () => {
    switch (currentScreen) {
      case 'main-menu':
        return React.createElement(MainScreen, { onNavigate: setCurrentScreen });
      default:
        return React.createElement(MainScreen, { onNavigate: setCurrentScreen });
    }
  };

  return React.createElement(
    Box,
    { flexDirection: 'column', height: '100%' },
    renderScreen()
  );
}

function MainScreen({ onNavigate }) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const menuItems = [
    { id: 'gcode-execution', title: 'Execute G-Code', key: '1' },
    { id: 'manual-control', title: 'Manual Control', key: '2' },
    { id: 'settings', title: 'Settings', key: '3' },
    { id: 'quit', title: 'Quit', key: 'q' }
  ];

  return React.createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    React.createElement(
      Text,
      { bold: true, color: 'green' },
      '🔧 CNC G-Code Control System'
    ),
    React.createElement(
      Text,
      { dimColor: true, marginBottom: 1 },
      'Select an option to continue'
    ),
    ...menuItems.map((item, index) => 
      React.createElement(
        Box,
        { key: item.id, marginBottom: 1 },
        React.createElement(
          Text,
          { 
            color: index === selectedIndex ? 'green' : 'white',
            bold: index === selectedIndex 
          },
          `[${item.key}] ${item.title}`
        )
      )
    ),
    React.createElement(
      Text,
      { dimColor: true, marginTop: 1 },
      'Use number keys to select, Ctrl+C to exit'
    )
  );
}

export default function App() {
  return React.createElement(AppRouter);
}