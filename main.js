#!/usr/bin/env node

/**
 * CNC G-code Sender - Main Entry Point
 * 
 * A unified entry point for the CNC G-code sender application.
 * Delegates to the appropriate interface based on the execution context.
 */

import { cliMain } from './src/ui/cli/index.js';

// For now, we only have the CLI interface, so delegate to it
// In the future, we could add web interface, API server, etc.

async function main() {
  try {
    await cliMain();
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { main };