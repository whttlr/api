/**
 * Modular CNC Application Entry Point
 * 
 * Clean, modular version of the CNC application using the new architecture.
 * This replaces the monolithic cnc-integrated-app.jsx with properly
 * separated concerns and maintainable code structure.
 * 
 * @module app-modular
 */

import React from 'react';
import { render } from 'ink';
import { CNCApp } from './CNCApp.jsx';

/**
 * Main application entry point
 * Renders the modular CNC application
 */
function main() {
  const { unmount } = render(<CNCApp />);
  
  // Graceful shutdown handling
  process.on('SIGINT', () => {
    unmount();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    unmount();
    process.exit(0);
  });
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { CNCApp, main };
export default main;