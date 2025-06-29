#!/usr/bin/env node

import { presetsService } from '../../services/presets/index.js';
import { log, info } from '../../services/logger/index.js';

async function listPresets() {
  try {
    const presets = presetsService.getAvailablePresets();
    
    if (presets.length === 0) {
      info('No presets configured in config.json');
      return;
    }

    // Generate the preset report
    presetsService.generatePresetsReport();

    // Show how to execute presets
    log('💡 Usage Examples:');
    presets.slice(0, 3).forEach(name => {
      log(`   node cli.js  # then type: preset ${name}`);
    });
    log('');

  } catch (error) {
    console.error(`❌ Failed to list presets: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node list-presets.js [options]

Options:
  --help, -h       Show this help message

Description:
  Lists all available presets configured in config.json.
  Shows preset type (command, file, or sequence) and usage examples.
`);
  process.exit(0);
}

listPresets().catch(console.error);