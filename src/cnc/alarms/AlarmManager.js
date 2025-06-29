/**
 * Alarm Management Module
 * 
 * Handles alarm detection, analysis, recovery procedures, and alarm-specific diagnostics.
 * Separated from main GcodeSender to follow single responsibility principle.
 */

import i18n from '../../i18n.js';
import { info, warn } from '../../lib/logger/LoggerService.js';
import { structuredLogger, createAlarmReport } from '../../lib/reporting/index.js';

export class AlarmManager {
  constructor(config) {
    this.config = config;
  }

  /**
   * Perform ALARM analysis based on diagnostics
   */
  async performAlarmAnalysis(diagnostics) {
    const analysis = {
      alarmDetected: false,
      alarmType: null,
      description: null,
      possibleCauses: [],
      recoverySteps: []
    };

    // Extract alarm information from machine status
    if (diagnostics.machineStatus && diagnostics.machineStatus.raw) {
      const alarmMatch = diagnostics.machineStatus.raw.match(/Alarm:(\d+)/i);
      if (alarmMatch) {
        analysis.alarmDetected = true;
        analysis.alarmType = parseInt(alarmMatch[1]);
        
        // Get description from config
        const descriptions = this.config.alarms?.descriptions || {};
        analysis.description = descriptions[analysis.alarmType] || i18n.t('alarmManager.unknownAlarm');
        
        // Get recovery steps from config
        const recoverySteps = this.config.alarms?.recoverySteps || {};
        analysis.recoverySteps = recoverySteps[analysis.alarmType] || [
          i18n.t('alarmManager.recoveryUnlock'),
          i18n.t('alarmManager.recoveryCheckHome')
        ];
        
        // Set possible causes based on alarm type
        analysis.possibleCauses = this.getAlarmCauses(analysis.alarmType);
      }
    }

    return analysis;
  }

  /**
   * Get possible causes for specific alarm types
   */
  getAlarmCauses(alarmType) {
    const causesMap = {
      1: ['Hard limit triggered', 'Machine moved beyond physical limits', 'Limit switch malfunction'],
      2: ['G-code motion target exceeds machine travel', 'Soft limits not properly configured', 'Invalid coordinate system'],
      3: ['Reset while in motion', 'Emergency stop activated', 'Power interruption during operation'],
      4: ['Probe fail', 'Probe not making contact', 'Probe wiring issue'],
      5: ['Probe fail', 'Probe already triggered at start', 'Probe stuck in triggered state'],
      6: ['Homing fail', 'Limit switches not found during homing', 'Homing sequence interrupted'],
      7: ['Homing fail', 'Safety door opened during homing', 'Door switch malfunction'],
      8: ['Homing fail', 'Pull off travel exceeded', 'Mechanical binding during pull-off'],
      9: ['Homing fail', 'No limit switches found', 'Limit switch wiring issue']
    };
    
    return causesMap[alarmType] || [i18n.t('alarmManager.unknownAlarmCause')];
  }

  /**
   * Test alarm triggers (for diagnostic purposes)
   */
  async testAlarmTriggers(commandExecutor, port, isConnected) {
    const warningIcon = this.config.ui?.diagnosticsEmojis?.warning || '⚠️';
    warn(i18n.t('alarmManager.testingAlarmTriggers', { icon: warningIcon }));
    
    const tests = [
      {
        name: i18n.t('alarmManager.softLimitTestName'),
        command: 'G0 X999999', // Intentionally exceed limits
        expectAlarm: true,
        description: i18n.t('alarmManager.softLimitTestDescription')
      }
    ];
    
    const results = [];
    
    for (const test of tests) {
      try {
        info(i18n.t('alarmManager.testingTest', { name: test.name, description: test.description }));
        const result = await commandExecutor.sendGcode(port, isConnected, test.command, 5000);
        
        results.push({
          test: test.name,
          command: test.command,
          success: !test.expectAlarm, // Success if we didn't expect alarm
          response: result.response,
          expected: test.expectAlarm ? i18n.t('alarmManager.expectedAlarm') : i18n.t('alarmManager.expectedSuccess'),
          actual: i18n.t('alarmManager.actualSuccess')
        });
        
      } catch (error) {
        results.push({
          test: test.name,
          command: test.command,
          success: test.expectAlarm, // Success if we expected alarm
          error: error.message,
          expected: test.expectAlarm ? i18n.t('alarmManager.expectedAlarm') : i18n.t('alarmManager.expectedSuccess'),
          actual: i18n.t('alarmManager.actualAlarm')
        });
      }
    }
    
    return results;
  }

  /**
   * Analyze alarm diagnostics for prevention measures
   */
  analyzeAlarmDiagnostics(diagnostics) {
    const analysis = {
      hasAlarmIssues: false,
      alarmCauses: [],
      preventionMeasures: [],
      currentAlarmState: null
    };

    // Check current alarm state
    if (diagnostics.machineStatus && diagnostics.machineStatus.raw.includes('Alarm')) {
      analysis.hasAlarmIssues = true;
      analysis.currentAlarmState = 'ALARM';
      analysis.alarmCauses.push(i18n.t('alarmManager.machineInAlarm'));
      analysis.preventionMeasures.push(i18n.t('alarmManager.preventionLimitChecking'));
      analysis.preventionMeasures.push(i18n.t('alarmManager.preventionEnableSoftLimits'));
    }

    // Check if soft limits are disabled
    if (diagnostics.grblSettings && diagnostics.grblSettings.parsed && diagnostics.grblSettings.parsed[20] === 0) {
      analysis.alarmCauses.push(i18n.t('alarmManager.softLimitsDisabled'));
      analysis.preventionMeasures.push(i18n.t('alarmManager.preventionEnableSoftLimitsCommand'));
    }

    // Check if hard limits are disabled but limit switches might be present
    if (diagnostics.grblSettings && diagnostics.grblSettings.parsed && diagnostics.grblSettings.parsed[21] === 0) {
      analysis.preventionMeasures.push(i18n.t('alarmManager.preventionEnableHardLimits'));
    }

    // Check homing configuration
    if (diagnostics.grblSettings && diagnostics.grblSettings.parsed && diagnostics.grblSettings.parsed[22] === 0) {
      analysis.preventionMeasures.push(i18n.t('alarmManager.preventionEnableHomingCycle'));
    }

    return analysis;
  }

  /**
   * Generate alarm diagnostic report (structured)
   */
  generateAlarmDiagnosticReport(diagnostics, outputMode = 'console') {
    // Create structured alarm report data
    const reportData = createAlarmReport(
      diagnostics.alarmAnalysis,
      diagnostics.alarmDiagnostics
    );
    
    // Configure logger output mode and log the structured data
    structuredLogger.config.outputMode = outputMode;
    structuredLogger.config.ui = this.config.ui;
    
    return structuredLogger.logStructured(reportData);
  }

  /**
   * Legacy method for backward compatibility (console output only)
   * @deprecated Use generateAlarmDiagnosticReport with outputMode instead
   */
  displayAlarmDiagnosticReport(diagnostics) {
    return this.generateAlarmDiagnosticReport(diagnostics, 'console');
  }

  /**
   * Suggest alarm recovery commands
   */
  getRecoveryCommands(alarmType) {
    const recoveryCommands = {
      1: ['$X', '$H'], // Hard limit: unlock, then home
      2: ['$X'], // Soft limit: unlock
      3: ['$X', '$H'], // Reset during motion: unlock, then home
      4: ['$X'], // Probe fail: unlock
      5: ['$X'], // Probe fail: unlock
      6: ['$X', '$H'], // Homing fail: unlock, try homing again
      7: ['$X'], // Safety door: unlock
      8: ['$X', '$H'], // Homing pull-off fail: unlock, try homing again
      9: ['$X', '$H'] // No limit switches: unlock, try homing again
    };
    
    return recoveryCommands[alarmType] || ['$X'];
  }

  /**
   * Execute recovery sequence for alarm
   */
  async executeAlarmRecovery(alarmType, commandExecutor, port, isConnected) {
    const commands = this.getRecoveryCommands(alarmType);
    const results = [];
    
    info(i18n.t('alarmManager.executingRecoverySequence', { alarmType }));
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      try {
        info(i18n.t('alarmManager.sendingCommand', { current: i + 1, total: commands.length, command }));
        const result = await commandExecutor.sendGcode(port, isConnected, command);
        
        results.push({
          command,
          success: true,
          response: result.response
        });
        
        info(i18n.t('alarmManager.commandSuccess', { command, response: result.response }));
        
        // Wait between recovery commands
        if (i < commands.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        results.push({
          command,
          success: false,
          error: error.message
        });
        
        warn(i18n.t('alarmManager.commandError', { command, error: error.message }));
        
        // Continue with remaining commands even if one fails
      }
    }
    
    return {
      alarmType,
      recoveryCommands: commands,
      results,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }

  /**
   * Check if machine is in alarm state
   */
  isInAlarmState(machineStatus) {
    if (!machineStatus || !machineStatus.parsed) {
      return false;
    }
    
    return machineStatus.parsed.state === 'Alarm';
  }

  /**
   * Get alarm prevention checklist
   */
  getPreventionChecklist() {
    return [
      i18n.t('alarmManager.checklistSoftLimits'),
      i18n.t('alarmManager.checklistHardLimits'),
      i18n.t('alarmManager.checklistHomingCycle'),
      i18n.t('alarmManager.checklistTestLimitSwitches'),
      i18n.t('alarmManager.checklistVerifyTravelLimits'),
      i18n.t('alarmManager.checklistCheckProbe'),
      i18n.t('alarmManager.checklistSafetyDoor'),
      i18n.t('alarmManager.checklistCalibrate')
    ];
  }
}