#!/usr/bin/env node

import React from 'react';
import { render, Box, Text } from 'ink';

// Simple test component to verify Ink is working
function TestApp() {
  return React.createElement(
    Box,
    { flexDirection: 'column', padding: 1 },
    React.createElement(
      Text,
      { bold: true, color: 'green' },
      '🔧 CNC G-Code Control System - Test Mode'
    ),
    React.createElement(
      Text,
      null,
      'If you can see this, Ink is working correctly!'
    ),
    React.createElement(
      Text,
      { dimColor: true },
      'Press Ctrl+C to exit'
    )
  );
}

// Render the test app
console.log('Starting Ink test application...');
render(React.createElement(TestApp));