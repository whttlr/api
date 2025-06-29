#!/usr/bin/env node

// Simple runner for the Ink CLI application
// This allows us to run JSX files with Node.js

import React from 'react';
import { render } from 'ink';
import App from './App.js';

// Render the app
render(React.createElement(App));