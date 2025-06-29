/**
 * Structured Logger Service
 * 
 * Handles structured data logging for reports, diagnostics, and status information.
 * Decouples data generation from presentation to support multiple output formats.
 */

import { log } from '../logger/index.js';

export class StructuredLogger {
  constructor(config = {}) {
    this.config = config;
    this.outputMode = config.outputMode || 'console'; // console, json, api, file
    this.formatters = new Map();
    
    // Register default formatters
    this.registerFormatter('diagnostic_report', this.formatDiagnosticReport.bind(this));
    this.registerFormatter('alarm_report', this.formatAlarmReport.bind(this));
    this.registerFormatter('file_execution_summary', this.formatFileExecutionSummary.bind(this));
    this.registerFormatter('query_report', this.formatQueryReport.bind(this));
    this.registerFormatter('machine_status', this.formatMachineStatus.bind(this));
  }

  /**
   * Register a custom formatter for a report type
   */
  registerFormatter(reportType, formatter) {
    this.formatters.set(reportType, formatter);
  }

  /**
   * Log structured data based on output mode
   */
  logStructured(data) {
    switch (this.outputMode) {
      case 'json':
        return this.logAsJson(data);
      case 'api':
        return this.logForApi(data);
      case 'file':
        return this.logToFile(data);
      case 'console':
      default:
        return this.logToConsole(data);
    }
  }

  /**
   * Log to console with formatting
   */
  logToConsole(data) {
    if (!data.type) {
      console.log('Structured data missing type:', data);
      return data;
    }

    const formatter = this.formatters.get(data.type);
    if (formatter) {
      formatter(data);
    } else {
      this.logGenericStructure(data);
    }
    
    return data;
  }

  /**
   * Log as JSON for API/structured consumption
   */
  logAsJson(data) {
    console.log(JSON.stringify(data, null, 2));
    return data;
  }

  /**
   * Log for API response (returns structured data)
   */
  logForApi(data) {
    // In API mode, just return the structured data
    // The API layer will handle JSON serialization
    return data;
  }

  /**
   * Log to file (future implementation)
   */
  logToFile(data) {
    // Future: write to log file
    log(`[STRUCTURED] ${data.type}: ${JSON.stringify(data.summary || data)}`);
    return data;
  }

  /**
   * Generic structure formatter
   */
  logGenericStructure(data) {
    const separator = this.config.ui?.reportSeparator || '============================================';
    
    console.log(`\n${separator}`);
    console.log(`           📊 ${(data.title || data.type || 'REPORT').toUpperCase()}`);
    console.log(`${separator}\n`);
    
    if (data.summary) {
      Object.entries(data.summary).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    }
    
    if (data.details) {
      console.log('\nDetails:');
      console.log(JSON.stringify(data.details, null, 2));
    }
    
    console.log(`\n${separator}\n`);
  }

  /**
   * Format diagnostic report
   */
  formatDiagnosticReport(data) {
    const separator = this.config.ui?.reportSeparator || '============================================';
    const icons = this.config.ui?.diagnosticsEmojis || {};
    
    console.log(`\n${separator}`);
    console.log(`           ${icons.info || '📋'} DIAGNOSTIC REPORT ${icons.info || '📋'}`);
    console.log(`${separator}\n`);

    // Machine Status
    console.log('🔍 MACHINE STATUS:');
    if (data.machineStatus) {
      console.log(`   State: ${data.machineStatus.state}`);
      if (data.machineStatus.position) {
        const pos = data.machineStatus.position;
        console.log(`   Position: X${pos.x} Y${pos.y} Z${pos.z}`);
      }
    } else {
      console.log(`   ${icons.failure || '❌'} Unable to retrieve machine status`);
    }

    // GRBL Settings
    console.log('\n⚙️  GRBL SETTINGS:');
    if (data.grblSettings) {
      console.log(`   ${icons.success || '✅'} Retrieved ${data.grblSettings.count} settings`);
      if (data.grblSettings.keySettings) {
        data.grblSettings.keySettings.forEach(setting => {
          console.log(`   $${setting.number}: ${setting.value}`);
        });
      }
    } else {
      console.log(`   ${icons.failure || '❌'} Unable to retrieve GRBL settings`);
    }

    // Movement Tests
    console.log('\n🎯 MOVEMENT TESTS:');
    if (data.movementTests) {
      const successful = data.movementTests.filter(t => t.success).length;
      const total = data.movementTests.length;
      console.log(`   ${icons.success || '✅'} ${successful}/${total} movements successful`);
      
      data.movementTests.forEach(test => {
        const status = test.success ? (icons.success || '✅') : (icons.failure || '❌');
        const info = test.success ? `${test.duration}ms` : test.error;
        console.log(`   ${status} ${test.command}: ${info}`);
      });
    } else {
      console.log(`   ${icons.warning || '⚠️'} No movement tests performed`);
    }

    // Health Score
    if (data.healthScore !== undefined) {
      console.log(`\n💚 HEALTH SCORE: ${data.healthScore}%`);
      console.log(`   Status: ${data.healthStatus || 'Unknown'}`);
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (data.recommendations && data.recommendations.length > 0) {
      data.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    } else {
      console.log(`   ${icons.success || '✅'} No specific recommendations - machine appears operational`);
    }

    console.log(`\n${separator}`);
    console.log(`Report generated: ${data.timestamp}`);
    console.log(`${separator}\n`);
  }

  /**
   * Format alarm report
   */
  formatAlarmReport(data) {
    const separator = this.config.ui?.reportSeparator || '============================================';
    const alarmIcon = this.config.ui?.diagnosticsEmojis?.alarm || '🚨';
    
    console.log(`\n${separator}`);
    console.log(`           ${alarmIcon} ALARM DIAGNOSTIC REPORT ${alarmIcon}`);
    console.log(`${separator}\n`);

    if (data.alarmDetected) {
      console.log('🔍 ALARM DETAILS:');
      console.log(`   Type: ${data.alarmType || 'Unknown'}`);
      console.log(`   Description: ${data.description || 'No description available'}`);
      
      if (data.possibleCauses && data.possibleCauses.length > 0) {
        console.log('\n🎯 POSSIBLE CAUSES:');
        data.possibleCauses.forEach(cause => {
          console.log(`   • ${cause}`);
        });
      }
      
      if (data.recoverySteps && data.recoverySteps.length > 0) {
        console.log('\n🔧 RECOVERY STEPS:');
        data.recoverySteps.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`);
        });
      }
    } else {
      console.log('ℹ️ No ALARM state detected - machine appears operational');
    }

    console.log(`\n${separator}\n`);
  }

  /**
   * Format file execution summary
   */
  formatFileExecutionSummary(data) {
    const separator = this.config.ui?.reportSeparator || '='.repeat(60);
    const title = this.config.ui?.fileExecutionTitle || '📄 G-CODE FILE EXECUTION SUMMARY';
    const successIcon = this.config.ui?.successIcon || '✓';
    const failIcon = this.config.ui?.failIcon || '✗';
    
    console.log(`\n${separator}`);
    console.log(`            ${title}`);
    console.log(separator);
    console.log(`File: ${data.filePath}`);
    console.log(`Total Commands: ${data.totalCommands}`);
    console.log(`${successIcon} Successful: ${data.successful}`);
    console.log(`${failIcon} Failed: ${data.failed}`);
    
    if (data.failedCommands && data.failedCommands.length > 0) {
      console.log('\nFailed Commands:');
      data.failedCommands.forEach(cmd => {
        console.log(`  Line ${cmd.line}: ${cmd.command}`);
        console.log(`    Error: ${cmd.error}`);
      });
    }
    
    if (data.duration) {
      console.log(`\nExecution Time: ${data.duration}ms`);
    }
    
    console.log(`${separator}\n`);
  }

  /**
   * Format query report
   */
  formatQueryReport(data) {
    const separator = this.config.ui?.reportSeparator || '============================================';
    
    console.log(`\n${separator}`);
    console.log(`           📊 MACHINE QUERY REPORT`);
    console.log(`${separator}\n`);

    console.log('🔗 CONNECTION STATUS:');
    console.log(`   Timestamp: ${data.timestamp}`);
    console.log(`   Errors: ${data.errors ? data.errors.length : 0}`);

    if (data.queries) {
      Object.entries(data.queries).forEach(([queryType, result]) => {
        console.log(`\n📋 ${queryType.toUpperCase()}:`);
        if (result.success) {
          console.log(`   ✅ Retrieved successfully`);
          if (result.summary) {
            Object.entries(result.summary).forEach(([key, value]) => {
              console.log(`   ${key}: ${value}`);
            });
          }
        } else {
          console.log(`   ❌ ${result.error || 'Failed to retrieve'}`);
        }
      });
    }

    console.log(`\n${separator}\n`);
  }

  /**
   * Format machine status
   */
  formatMachineStatus(data) {
    console.log('🤖 MACHINE STATUS:');
    console.log(`   State: ${data.state}`);
    console.log(`   Connected: ${data.connected ? '✅' : '❌'}`);
    
    if (data.position) {
      console.log(`   Position: X${data.position.x} Y${data.position.y} Z${data.position.z}`);
    }
    
    if (data.feedRate !== undefined) {
      console.log(`   Feed Rate: ${data.feedRate}`);
    }
    
    if (data.spindleSpeed !== undefined) {
      console.log(`   Spindle Speed: ${data.spindleSpeed}`);
    }
  }
}

// Create singleton instance
export const structuredLogger = new StructuredLogger();