#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';

// Import the CNC-integrated app from the built bundle
import CNCIntegratedApp from './dist/ink-cnc-app.js';

console.log('🚀 Starting CNC-Integrated Ink CLI Application...');
console.log('🔧 This version includes real CNC service integration');
console.log('📝 Note: Raw mode errors are expected in non-interactive environments');
console.log('💡 Run this in your terminal for full interactivity\n');

// Check if we can enable raw mode
const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

if (!isInteractive) {
  console.log('⚠️  Running in non-interactive mode');
  console.log('🔧 For full keyboard control, run: npm run ink:cnc\n');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down CNC application...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down CNC application...');
  process.exit(0);
});

render(React.createElement(CNCIntegratedApp));