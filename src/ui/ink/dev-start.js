#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';

// Import the fixed app directly
import FixedApp from './fixed-app.jsx';

console.log('🚀 Starting CNC Ink CLI Application...');
console.log('📝 Note: Raw mode errors are expected in non-interactive environments');
console.log('💡 Run this in your terminal for full interactivity\n');

// Check if we can enable raw mode
const isInteractive = process.stdin.isTTY && process.stdout.isTTY;

if (!isInteractive) {
  console.log('⚠️  Running in non-interactive mode');
  console.log('🔧 For full keyboard control, run: npm run ink\n');
}

render(React.createElement(FixedApp));