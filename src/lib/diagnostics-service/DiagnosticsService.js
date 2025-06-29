import i18n from '../../i18n.js';
import { Config } from '../../cnc/config.js';
import { log } from '../logger/index.js';

// Load configuration
const CONFIG = Config.get();

/**
 * Run comprehensive movement diagnostics
 */
async function runMovementDiagnostics(isConnected, queryMachineStatus, queryGrblSettings, queryCoordinateSystems, queryParserState, performAlarmAnalysis, isMachineReadyForMovement, testSmallMovements, generateRecommendations, generateDiagnosticReport) {
  if (!isConnected) {
    throw new Error(i18n.t('diagnosticsService.notConnectedError'));
  }

  log(`\n${i18n.t('diagnosticsService.separator')}`);
  log(i18n.t('diagnosticsService.comprehensiveDiagnosticsTitle'));
  log(`${i18n.t('diagnosticsService.separator')}\n`);

  const diagnostics = {
    timestamp: new Date().toISOString(),
    machineStatus: null,
    grblSettings: null,
    coordinateSystems: null,
    parserState: null,
    testMovements: [],
    alarmAnalysis: null,
    recommendations: []
  };

  try {
    // Step 1: Query machine status
    log(i18n.t('diagnosticsService.step1QueryMachineStatus'));
    diagnostics.machineStatus = await queryMachineStatus();

    // Step 2: Query GRBL settings
    log(i18n.t('diagnosticsService.step2QueryGrblSettings'));
    diagnostics.grblSettings = await queryGrblSettings();

    // Step 3: Query coordinate systems
    log(i18n.t('diagnosticsService.step3QueryCoordinateSystems'));
    diagnostics.coordinateSystems = await queryCoordinateSystems();

    // Step 4: Query parser state
    log(i18n.t('diagnosticsService.step4QueryParserState'));
    diagnostics.parserState = await queryParserState();

    // Step 5: Perform ALARM analysis if needed
    if (diagnostics.machineStatus && diagnostics.machineStatus.raw.includes('Alarm')) {
      log(i18n.t('diagnosticsService.step5PerformingAlarmAnalysis'));
      diagnostics.alarmAnalysis = await performAlarmAnalysis(diagnostics);
    } else {
      log(i18n.t('diagnosticsService.step5NoAlarmDetected'));
    }

    // Step 6: Test small movements (only if machine is ready)
    if (isMachineReadyForMovement(diagnostics)) {
      log(i18n.t('diagnosticsService.step6TestingSmallMovements'));
      diagnostics.testMovements = await testSmallMovements();
    } else {
      log(i18n.t('diagnosticsService.step6SkippingMovementTests'));
    }

    // Step 7: Generate analysis and recommendations
    log(i18n.t('diagnosticsService.step7GeneratingRecommendations'));
    diagnostics.recommendations = generateRecommendations(diagnostics);

    // Generate and display the final report
    generateDiagnosticReport(diagnostics);

    return diagnostics;

  } catch (err) {
    error(i18n.t('diagnosticsService.diagnosticError', { error: err.message }));
    throw err;
  }
}

/**
 * Analyze diagnostics and provide insights
 */
function analyzeDiagnostics(diagnostics) {
  const analysis = {
    machineReady: false,
    issues: [],
    recommendations: []
  };

  // Analyze machine status
  if (diagnostics.machineStatus && diagnostics.machineStatus.parsed) {
    const state = diagnostics.machineStatus.parsed.state;
    if (state === 'Idle') {
      analysis.machineReady = true;
    } else if (state.includes('Alarm')) {
      analysis.issues.push(i18n.t('diagnosticsService.machineInAlarmState'));
      analysis.recommendations.push(i18n.t('diagnosticsService.alarmRecoveryRecommendation'));
    }
  }

  return analysis;
}

/**
 * Analyze GRBL settings for movement issues
 */
function analyzeGrblSettings(settings, diagnostics) {
  const analysis = {
    issues: [],
    recommendations: []
  };

  const criticalSettings = {
    20: 'Soft limits enable',
    21: 'Hard limits enable',
    22: 'Homing cycle enable',
    23: 'Homing dir invert',
    100: 'X steps/mm',
    101: 'Y steps/mm',
    102: 'Z steps/mm',
    110: 'X max rate (mm/min)',
    111: 'Y max rate (mm/min)',
    112: 'Z max rate (mm/min)',
    120: 'X acceleration (mm/sec²)',
    121: 'Y acceleration (mm/sec²)',
    122: 'Z acceleration (mm/sec²)',
    130: 'X max travel (mm)',
    131: 'Y max travel (mm)',
    132: 'Z max travel (mm)'
  };

  // Check if critical settings are configured
  for (const [setting, description] of Object.entries(criticalSettings)) {
    const settingNum = parseInt(setting);
    if (settings.parsed && !(settingNum in settings.parsed)) {
      analysis.issues.push(i18n.t('diagnosticsService.missingCriticalSetting', { setting, description }));
      analysis.recommendations.push(i18n.t('diagnosticsService.configureSetting', { setting, description }));
    }
  }

  // Check for potentially problematic values
  if (settings.parsed) {
    // Check if steps/mm are reasonable (not 0)
    if (settings.parsed[100] === 0) analysis.issues.push(i18n.t('diagnosticsService.xAxisStepsZero'));
    if (settings.parsed[101] === 0) analysis.issues.push(i18n.t('diagnosticsService.yAxisStepsZero'));
    if (settings.parsed[102] === 0) analysis.issues.push(i18n.t('diagnosticsService.zAxisStepsZero'));

    // Check if max rates are reasonable
    if (settings.parsed[110] === 0) analysis.issues.push(i18n.t('diagnosticsService.xAxisMaxRateZero'));
    if (settings.parsed[111] === 0) analysis.issues.push(i18n.t('diagnosticsService.yAxisMaxRateZero'));
    if (settings.parsed[112] === 0) analysis.issues.push(i18n.t('diagnosticsService.zAxisMaxRateZero'));
  }

  return analysis;
}

/**
 * Generate recommendations based on diagnostics
 */
function generateRecommendations(diagnostics) {
  const recommendations = [];

  // Basic connectivity recommendations
  if (!diagnostics.machineStatus || !diagnostics.machineStatus.parsed) {
    recommendations.push(i18n.t('diagnosticsService.unableToCommunicate'));
    return recommendations;
  }

  // ALARM state recommendations
  if (diagnostics.machineStatus.raw.includes('Alarm')) {
    recommendations.push(i18n.t('diagnosticsService.machineInAlarmStateAutoRecovery'));
    recommendations.push(i18n.t('diagnosticsService.alarmRecoveryUnlockHome'));
  }

  // Settings-based recommendations
  if (diagnostics.grblSettings && diagnostics.grblSettings.parsed) {
    const settings = diagnostics.grblSettings.parsed;

    if (settings[20] === 0) {
      recommendations.push(i18n.t('diagnosticsService.enableSoftLimitsRecommendation'));
    }

    if (settings[22] === 0) {
      recommendations.push(i18n.t('diagnosticsService.enableHomingCycleRecommendation'));
    }
  }

  // Movement test recommendations
  if (diagnostics.testMovements.length === 0) {
    recommendations.push(i18n.t('diagnosticsService.movementTestSkipped'));
  }

  if (recommendations.length === 0) {
    recommendations.push(i18n.t('diagnosticsService.machineReady'));
  }

  return recommendations;
}

/**
 * Check if machine is ready for movement
 */
function isMachineReadyForMovement(diagnostics) {
  if (!diagnostics.machineStatus || !diagnostics.machineStatus.parsed) {
    return false;
  }

  const state = diagnostics.machineStatus.parsed.state;
  return state === 'Idle' || state === 'Run';
}

/**
 * Test small movements to verify machine responsiveness
 */
async function testSmallMovements(sendRawGcode) {
  const results = [];

  log(i18n.t('diagnosticsService.testingSmallMovementsLog'));

  for (const movement of CONFIG.movementDebug.testMovements) {
    try {
      log(i18n.t('diagnosticsService.testingMovementLog', { movement }));
      const startTime = Date.now();
      const result = await sendRawGcode(movement, 10000);
      const duration = Date.now() - startTime;

      results.push({
        command: movement,
        success: true,
        response: result.response,
        duration: duration
      });

      log(i18n.t('diagnosticsService.movementSuccessLog', { movement, response: result.response, duration }));

      // Wait between movements
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      results.push({
        command: movement,
        success: false,
        error: error.message,
        duration: null
      });

      error(i18n.t('diagnosticsService.movementFailureLog', { movement, error: error.message }));
    }
  }

  return results;
}

/**
 * Generate comprehensive diagnostic report
 */
function generateDiagnosticReport(diagnostics) {
  log(`\n${i18n.t('diagnosticsService.separator')}`);
  log(i18n.t('diagnosticsService.diagnosticReportTitle'));
  log(`${i18n.t('diagnosticsService.separator')}\n`);

  // Machine Status Summary
  log(i18n.t('diagnosticsService.machineStatusHeader'));
  if (diagnostics.machineStatus && diagnostics.machineStatus.parsed) {
    const status = diagnostics.machineStatus.parsed;
    log(i18n.t('diagnosticsService.state', { state: status.state }));
    if (status.position) {
      log(i18n.t('diagnosticsService.position', { x: status.position.x, y: status.position.y, z: status.position.z }));
    }
  } else {
    log(i18n.t('diagnosticsService.unableToRetrieveMachineStatus'));
  }

  // GRBL Settings Summary
  log(i18n.t('diagnosticsService.grblSettingsHeader'));
  if (diagnostics.grblSettings && diagnostics.grblSettings.parsed) {
    const settings = diagnostics.grblSettings.parsed;
    const settingCount = Object.keys(settings).length;
    log(i18n.t('diagnosticsService.settingsRetrieved', { count: settingCount }));

    // Key settings
    const keySettings = [20, 21, 22, 130, 131, 132];
    keySettings.forEach(settingNum => {
      if (settingNum in settings) {
        log(i18n.t('diagnosticsService.settingValue', { settingNum, value: settings[settingNum] }));
      }
    });
  } else {
    log(i18n.t('diagnosticsService.unableToRetrieveGrblSettings'));
  }

  // Movement Test Results
  log(i18n.t('diagnosticsService.movementTestsHeader'));
  if (diagnostics.testMovements.length > 0) {
    const successful = diagnostics.testMovements.filter(t => t.success).length;
    const total = diagnostics.testMovements.length;
    log(i18n.t('diagnosticsService.movementsSuccessful', { successful, total }));

    diagnostics.testMovements.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const info = test.success ? i18n.t('diagnosticsService.durationMs', { duration: test.duration }) : test.error;
      log(i18n.t('diagnosticsService.testResult', { status, command: test.command, info }));
    });
  } else {
    log(i18n.t('diagnosticsService.noMovementTestsPerformed'));
  }

  // Recommendations
  log(i18n.t('diagnosticsService.recommendationsHeader'));
  if (diagnostics.recommendations.length > 0) {
    diagnostics.recommendations.forEach(rec => {
      log(i18n.t('diagnosticsService.recommendationItem', { recommendation: rec }));
    });
  } else {
    log(i18n.t('diagnosticsService.noSpecificRecommendations'));
  }

  log(`\n${i18n.t('diagnosticsService.separator')}`);
  log(i18n.t('diagnosticsService.reportGenerated', { timestamp: diagnostics.timestamp }));
  log(`${i18n.t('diagnosticsService.separator')}\n`);
}

/**
 * Analyze homing requirements
 */
async function analyzeHomingRequirements(grblSettings) {
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
    analysis.recommendations.push(i18n.t('diagnosticsService.enableHomingCycleRecommendation2'));
  }

  // Check if hard limits are enabled ($21) - required for homing
  if (settings[21] === 1) {
    analysis.limitSwitchesEnabled = true;
  } else {
    analysis.recommendations.push(i18n.t('diagnosticsService.enableHardLimitsRecommendation2'));
  }

  return analysis;
}

/**
 * Perform ALARM analysis
 */
async function performAlarmAnalysis(diagnostics) {
  const analysis = {
    alarmDetected: true,
    alarmType: null,
    possibleCauses: [],
    recoverySteps: []
  };

  // Extract alarm information from machine status
  if (diagnostics.machineStatus && diagnostics.machineStatus.raw) {
    const alarmMatch = diagnostics.machineStatus.raw.match(/Alarm:(\d+)/i);
    if (alarmMatch) {
      analysis.alarmType = parseInt(alarmMatch[1]);
    }
  }

  // Provide alarm-specific analysis
  switch (analysis.alarmType) {
    case 1:
      analysis.possibleCauses.push(i18n.t('diagnosticsService.alarm1Cause'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.alarm1Step1'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.alarm1Step2'));
      break;
    case 2:
      analysis.possibleCauses.push(i18n.t('diagnosticsService.alarm2Cause'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.alarm2Step1'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.alarm2Step2'));
      break;
    case 3:
      analysis.possibleCauses.push(i18n.t('diagnosticsService.alarm3Cause'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.alarm3Step1'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.alarm3Step2'));
      break;
    default:
      analysis.possibleCauses.push(i18n.t('diagnosticsService.unknownAlarmCondition'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.unknownAlarmStep1'));
      analysis.recoverySteps.push(i18n.t('diagnosticsService.unknownAlarmStep2'));
  }

  return analysis;
}

/**
 * Test alarm triggers (for diagnostic purposes)
 */
async function testAlarmTriggers(sendRawGcode) {
  warn(i18n.t('diagnosticsService.testingAlarmTriggers'));

  const tests = [
    {
      name: 'Soft limit test',
      command: 'G0 X999999', // Intentionally exceed limits
      expectAlarm: true
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      log(`   Testing: ${test.name}`);
      const result = await sendRawGcode(test.command, 5000);

      results.push({
        test: test.name,
        command: test.command,
        success: !test.expectAlarm, // Success if we didn't expect alarm
        response: result.response
      });

    } catch (error) {
      results.push({
        test: test.name,
        command: test.command,
        success: test.expectAlarm, // Success if we expected alarm
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Analyze alarm diagnostics
 */
function analyzeAlarmDiagnostics(diagnostics) {
  const analysis = {
    hasAlarmIssues: false,
    alarmCauses: [],
    preventionMeasures: []
  };

  if (diagnostics.machineStatus && diagnostics.machineStatus.raw.includes('Alarm')) {
    analysis.hasAlarmIssues = true;
    analysis.alarmCauses.push(i18n.t('diagnosticsService.machineInAlarmState2'));
    analysis.preventionMeasures.push(i18n.t('diagnosticsService.implementLimitChecking'));
    analysis.preventionMeasures.push(i18n.t('diagnosticsService.enableSoftLimitsPrevention'));
  }

  // Check if soft limits are disabled
  if (diagnostics.grblSettings && diagnostics.grblSettings.parsed && diagnostics.grblSettings.parsed[20] === 0) {
    analysis.alarmCauses.push(i18n.t('diagnosticsService.softLimitsDisabled'));
    analysis.preventionMeasures.push(i18n.t('diagnosticsService.enableSoftLimitsCommand'));
  }

  return analysis;
}

/**
 * Generate alarm diagnostic report
 */
function generateAlarmDiagnosticReport(diagnostics) {
  log(`\n${i18n.t('diagnosticsService.separator')}`);
  log(i18n.t('diagnosticsService.alarmDiagnosticReportTitle'));
  log(`${i18n.t('diagnosticsService.separator')}\n`);

  if (diagnostics.alarmAnalysis) {
    const analysis = diagnostics.alarmAnalysis;

    log(i18n.t('diagnosticsService.alarmDetailsHeader'));
    log(i18n.t('diagnosticsService.alarmType', { type: analysis.alarmType || i18n.t('diagnosticsService.unknown') }));

    if (analysis.possibleCauses.length > 0) {
      log(i18n.t('diagnosticsService.possibleCausesHeader'));
      analysis.possibleCauses.forEach(cause => {
        log(i18n.t('diagnosticsService.causeItem', { cause }));
      });
    }

    if (analysis.recoverySteps.length > 0) {
      log(i18n.t('diagnosticsService.recoveryStepsHeader'));
      analysis.recoverySteps.forEach((step, index) => {
        log(i18n.t('diagnosticsService.recoveryStepItem', { index: index + 1, step }));
      });
    }
  } else {
    info(i18n.t('diagnosticsService.noAlarmDetectedInfo'));
  }

  log(`\n${i18n.t('diagnosticsService.separator')}\n`);
}

export {
  runMovementDiagnostics,
  analyzeDiagnostics,
  analyzeGrblSettings,
  generateRecommendations,
  isMachineReadyForMovement,
  testSmallMovements,
  generateDiagnosticReport,
  analyzeHomingRequirements,
  performAlarmAnalysis,
  testAlarmTriggers,
  analyzeAlarmDiagnostics,
  generateAlarmDiagnosticReport
};