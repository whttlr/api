/**
 * Diagnostics Module
 * 
 * Handles movement testing, diagnostic reporting, and machine readiness checks.
 * Separated from main GcodeSender to follow single responsibility principle.
 */

import i18n from '../../i18n.js';
import { info } from '../../lib/logger/LoggerService.js';
import { structuredLogger, createDiagnosticReport, createHealthScore } from '../../lib/reporting/index.js';

export class DiagnosticsManager {
  constructor(config) {
    this.config = config;
  }

  /**
   * Test small movements to verify machine responsiveness
   */
  async testSmallMovements(commandExecutor, port, isConnected) {
    const results = [];
    const testIcon = this.config.ui?.diagnosticsEmojis?.testing || '🎯';
    const successIcon = this.config.ui?.diagnosticsEmojis?.success || '✅';
    const failIcon = this.config.ui?.diagnosticsEmojis?.failure || '❌';
    
    info(i18n.t('diagnosticsManager.testingSmallMovements', { icon: testIcon }));
    
    for (const movement of this.config.movementDebug.testMovements) {
      try {
        info(i18n.t('diagnosticsManager.testingMovement', { movement }));
        const startTime = Date.now();
        const result = await commandExecutor.sendGcode(port, isConnected, movement, 10000);
        const duration = Date.now() - startTime;
        
        results.push({
          command: movement,
          success: true,
          response: result.response,
          duration: duration
        });
        
        info(i18n.t('diagnosticsManager.movementSuccess', { icon: successIcon, movement, response: result.response, duration }));
        
        // Wait between movements
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        results.push({
          command: movement,
          success: false,
          error: error.message,
          duration: null
        });
        
        info(i18n.t('diagnosticsManager.movementFailure', { icon: failIcon, movement, error: error.message }));
      }
    }
    
    return results;
  }

  /**
   * Generate comprehensive diagnostic report (structured)
   */
  generateDiagnosticReport(diagnostics, outputMode = 'console') {
    // Create structured report data
    const reportData = createDiagnosticReport(diagnostics);
    
    // Add health score if available
    if (diagnostics.healthScore !== undefined) {
      const healthData = createHealthScore(diagnostics.healthScore, {
        movementTests: diagnostics.testMovements?.length || 0,
        errors: diagnostics.errors?.length || 0
      });
      reportData.healthScore = healthData.score;
      reportData.healthStatus = healthData.status;
    }
    
    // Configure logger output mode and log the structured data
    structuredLogger.config.outputMode = outputMode;
    structuredLogger.config.ui = this.config.ui;
    
    return structuredLogger.logStructured(reportData);
  }

  /**
   * Legacy method for backward compatibility (console output only)
   * @deprecated Use generateDiagnosticReport with outputMode instead
   */
  displayDiagnosticReport(diagnostics) {
    return this.generateDiagnosticReport(diagnostics, 'console');
  }

  /**
   * Analyze homing requirements
   */
  async analyzeHomingRequirements(grblSettings) {
    if (!grblSettings || !grblSettings.parsed) {
      return null;
    }

    const analysis = {
      homingEnabled: false,
      homingCycleAvailable: false,
      limitSwitchesEnabled: false,
      recommendations: []
    };

    const settings = grblSettings.parsed;
    
    // Check if homing cycle is enabled ($22)
    if (settings[22] === 1) {
      analysis.homingEnabled = true;
      analysis.homingCycleAvailable = true;
    } else {
      analysis.recommendations.push(i18n.t('diagnosticsManager.recommendEnableHoming'));
    }
    
    // Check if hard limits are enabled ($21) - required for homing
    if (settings[21] === 1) {
      analysis.limitSwitchesEnabled = true;
    } else {
      analysis.recommendations.push(i18n.t('diagnosticsManager.recommendEnableHardLimits'));
    }
    
    return analysis;
  }

  /**
   * Analyze diagnostics and provide insights
   */
  analyzeDiagnostics(diagnostics) {
    const analysis = {
      machineReady: false,
      criticalIssues: [],
      warnings: [],
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    // Check machine status
    if (diagnostics.machineStatus && diagnostics.machineStatus.parsed) {
      const status = diagnostics.machineStatus.parsed;
      
      if (status.state === 'Idle') {
        analysis.machineReady = true;
      } else if (status.state === 'Alarm') {
        analysis.criticalIssues.push(i18n.t('diagnosticsManager.machineInAlarmState'));
        analysis.recommendations.push(i18n.t('diagnosticsManager.recommendUnlockAlarm'));
      } else if (status.state === 'Hold') {
        analysis.warnings.push(i18n.t('diagnosticsManager.machineInHoldState'));
        analysis.recommendations.push(i18n.t('diagnosticsManager.recommendResumeFromHold'));
      }
    } else {
      analysis.criticalIssues.push(i18n.t('diagnosticsManager.unableToRetrieveStatus'));
    }

    // Check GRBL settings
    if (diagnostics.grblSettings && diagnostics.grblSettings.parsed) {
      const settings = diagnostics.grblSettings.parsed;
      
      // Check soft limits
      if (settings[20] === 0) {
        analysis.warnings.push(i18n.t('diagnosticsManager.softLimitsDisabled'));
        analysis.recommendations.push(i18n.t('diagnosticsManager.recommendEnableSoftLimits'));
      }
      
      // Check hard limits
      if (settings[21] === 0) {
        analysis.warnings.push(i18n.t('diagnosticsManager.hardLimitsDisabled'));
        analysis.recommendations.push(i18n.t('diagnosticsManager.recommendEnableHardLimitsSetting'));
      }
    }

    // Check movement tests
    if (diagnostics.testMovements && diagnostics.testMovements.length > 0) {
      const failedTests = diagnostics.testMovements.filter(t => !t.success);
      if (failedTests.length > 0) {
        analysis.criticalIssues.push(i18n.t('diagnosticsManager.movementTestsFailed', { count: failedTests.length }));
        analysis.recommendations.push(i18n.t('diagnosticsManager.recommendCheckConnections'));
      }
    }

    return analysis;
  }

  /**
   * Run comprehensive diagnostics
   */
  async runComprehensiveDiagnostics(queryManager, commandExecutor, port, isConnected) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      machineStatus: null,
      grblSettings: null,
      coordinateSystems: null,
      parserState: null,
      testMovements: [],
      homingAnalysis: null,
      recommendations: [],
      errors: []
    };

    try {
      // Get machine status
      try {
        diagnostics.machineStatus = await queryManager.queryMachineStatus(commandExecutor, port, isConnected);
      } catch (err) {
        diagnostics.errors.push(i18n.t('diagnosticsManager.machineStatusQueryFailed', { error: err.message }));
      }

      // Get GRBL settings
      try {
        diagnostics.grblSettings = await queryManager.queryGrblSettings(commandExecutor, port, isConnected);
      } catch (err) {
        diagnostics.errors.push(i18n.t('diagnosticsManager.grblSettingsQueryFailed', { error: err.message }));
      }

      // Get coordinate systems
      try {
        diagnostics.coordinateSystems = await queryManager.queryCoordinateSystems(commandExecutor, port, isConnected);
      } catch (err) {
        diagnostics.errors.push(i18n.t('diagnosticsManager.coordinateSystemsQueryFailed', { error: err.message }));
      }

      // Get parser state
      try {
        diagnostics.parserState = await queryManager.queryParserState(commandExecutor, port, isConnected);
      } catch (err) {
        diagnostics.errors.push(i18n.t('diagnosticsManager.parserStateQueryFailed', { error: err.message }));
      }

      // Analyze homing requirements
      if (diagnostics.grblSettings) {
        try {
          diagnostics.homingAnalysis = await this.analyzeHomingRequirements(diagnostics.grblSettings);
        } catch (err) {
          diagnostics.errors.push(i18n.t('diagnosticsManager.homingAnalysisFailed', { error: err.message }));
        }
      }

      // Test movements if machine is ready
      if (diagnostics.machineStatus && diagnostics.machineStatus.parsed) {
        const machineState = diagnostics.machineStatus.parsed.state;
        
        if (machineState === 'Idle') {
          try {
            diagnostics.testMovements = await this.testSmallMovements(commandExecutor, port, isConnected);
          } catch (err) {
            diagnostics.errors.push(i18n.t('diagnosticsManager.movementTestsFailedError', { error: err.message }));
          }
        } else {
          diagnostics.errors.push(i18n.t('diagnosticsManager.machineNotReadyForMovementTests', { state: machineState }));
        }
      }

      // Analyze overall diagnostics
      const analysis = this.analyzeDiagnostics(diagnostics);
      diagnostics.recommendations = analysis.recommendations;

    } catch (err) {
      diagnostics.errors.push(i18n.t('diagnosticsManager.comprehensiveDiagnosticsFailed', { error: err.message }));
    }

    return diagnostics;
  }

  /**
   * Check if machine is ready for operation
   */
  isMachineReady(diagnostics) {
    if (!diagnostics.machineStatus || !diagnostics.machineStatus.parsed) {
      return false;
    }

    const state = diagnostics.machineStatus.parsed.state;
    return state === 'Idle' || state === 'Check';
  }

  /**
   * Get machine health score (0-100)
   */
  calculateHealthScore(diagnostics) {
    let score = 100;
    
    // Deduct points for critical issues
    if (diagnostics.errors && diagnostics.errors.length > 0) {
      score -= diagnostics.errors.length * 20;
    }

    // Deduct points for failed movement tests
    if (diagnostics.testMovements && diagnostics.testMovements.length > 0) {
      const failedTests = diagnostics.testMovements.filter(t => !t.success).length;
      const totalTests = diagnostics.testMovements.length;
      score -= (failedTests / totalTests) * 30;
    }

    // Deduct points for machine not being ready
    if (!this.isMachineReady(diagnostics)) {
      score -= 25;
    }

    // Deduct points for missing critical settings
    if (diagnostics.grblSettings && diagnostics.grblSettings.parsed) {
      const settings = diagnostics.grblSettings.parsed;
      if (settings[20] === 0) score -= 5; // Soft limits disabled
      if (settings[21] === 0) score -= 5; // Hard limits disabled
    }

    return Math.max(0, Math.min(100, score));
  }
}