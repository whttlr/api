#!/usr/bin/env node

import { presetsService } from '../../services/presets/index.js';
import { log, info, warn, error } from '../../services/logger/index.js';

async function validatePresets() {
  try {
    log('🔍 Validating all presets...\n');
    
    const validationResults = await presetsService.validateAllPresets();
    
    let allValid = true;
    let totalIssues = 0;

    for (const result of validationResults) {
      if (result.valid) {
        info(`✅ ${result.name} - Valid (${result.commands.length} commands)`);
      } else {
        allValid = false;
        totalIssues += result.issues.length;
        error(`❌ ${result.name} - Invalid`);
        result.issues.forEach(issue => {
          error(`   • ${issue}`);
        });
      }
    }

    log('\n============================================');
    if (allValid) {
      info(`✅ All ${validationResults.length} presets are valid!`);
    } else {
      warn(`⚠️ Found ${totalIssues} issues across ${validationResults.filter(r => !r.valid).length} presets`);
    }
    log('============================================\n');

    // Generate detailed report
    presetsService.generatePresetsReport();

  } catch (validationError) {
    error(`❌ Validation failed: ${validationError.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node validate-presets.js [options]

Options:
  --help, -h       Show this help message

Description:
  Validates all configured presets for syntax and accessibility.
  Checks G-code commands and file paths.
`);
  process.exit(0);
}

validatePresets().catch(console.error);