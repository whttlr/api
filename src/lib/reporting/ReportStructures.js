/**
 * Report Structure Definitions
 * 
 * Defines the structure for various report types to ensure consistency
 * across the application and enable structured logging.
 */

/**
 * Create a diagnostic report structure
 */
export function createDiagnosticReport(diagnostics) {
  const report = {
    type: 'diagnostic_report',
    timestamp: new Date().toISOString(),
    machineStatus: null,
    grblSettings: null,
    movementTests: [],
    healthScore: null,
    healthStatus: null,
    recommendations: [],
    errors: []
  };

  // Process machine status
  if (diagnostics.machineStatus && diagnostics.machineStatus.parsed) {
    const status = diagnostics.machineStatus.parsed;
    report.machineStatus = {
      state: status.state,
      position: status.position || null
    };
  }

  // Process GRBL settings
  if (diagnostics.grblSettings && diagnostics.grblSettings.parsed) {
    const settings = diagnostics.grblSettings.parsed;
    report.grblSettings = {
      count: Object.keys(settings).length,
      keySettings: [20, 21, 22, 130, 131, 132]
        .filter(num => num in settings)
        .map(num => ({ number: num, value: settings[num] }))
    };
  }

  // Process movement tests
  if (diagnostics.testMovements && diagnostics.testMovements.length > 0) {
    report.movementTests = diagnostics.testMovements.map(test => ({
      command: test.command,
      success: test.success,
      duration: test.duration || null,
      error: test.error || null
    }));
  }

  // Add recommendations
  if (diagnostics.recommendations) {
    report.recommendations = [...diagnostics.recommendations];
  }

  // Add errors
  if (diagnostics.errors) {
    report.errors = [...diagnostics.errors];
  }

  return report;
}

/**
 * Create an alarm report structure
 */
export function createAlarmReport(alarmAnalysis, alarmDiagnostics = null) {
  const report = {
    type: 'alarm_report',
    timestamp: new Date().toISOString(),
    alarmDetected: false,
    alarmType: null,
    description: null,
    possibleCauses: [],
    recoverySteps: [],
    preventionMeasures: []
  };

  if (alarmAnalysis && alarmAnalysis.alarmDetected) {
    report.alarmDetected = true;
    report.alarmType = alarmAnalysis.alarmType;
    report.description = alarmAnalysis.description;
    report.possibleCauses = [...(alarmAnalysis.possibleCauses || [])];
    report.recoverySteps = [...(alarmAnalysis.recoverySteps || [])];
  }

  if (alarmDiagnostics && alarmDiagnostics.preventionMeasures) {
    report.preventionMeasures = [...alarmDiagnostics.preventionMeasures];
  }

  return report;
}

/**
 * Create a file execution summary structure
 */
export function createFileExecutionSummary(filePath, results, startTime = null) {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const failedCommands = results.filter(r => !r.success);

  const report = {
    type: 'file_execution_summary',
    timestamp: new Date().toISOString(),
    filePath,
    totalCommands: results.length,
    successful,
    failed,
    failedCommands: failedCommands.map(cmd => ({
      line: cmd.line,
      command: cmd.command,
      error: cmd.error
    })),
    duration: startTime ? Date.now() - startTime : null,
    summary: {
      'Success Rate': `${successful}/${results.length} (${Math.round((successful/results.length) * 100)}%)`,
      'Status': failed === 0 ? 'Completed Successfully' : `${failed} errors encountered`
    }
  };

  return report;
}

/**
 * Create a query report structure
 */
export function createQueryReport(queryResults) {
  const report = {
    type: 'query_report',
    timestamp: queryResults.timestamp || new Date().toISOString(),
    errors: queryResults.errors || [],
    queries: {}
  };

  // Process each query type
  const queryTypes = ['machineStatus', 'grblSettings', 'coordinateSystems', 'parserState', 'limitsInfo'];
  
  queryTypes.forEach(queryType => {
    if (queryResults[queryType]) {
      const result = queryResults[queryType];
      report.queries[queryType] = {
        success: !!result.parsed,
        error: result.parsed ? null : 'Failed to parse response',
        summary: result.parsed ? generateQuerySummary(queryType, result.parsed) : null
      };
    }
  });

  return report;
}

/**
 * Create a machine status structure
 */
export function createMachineStatus(connectionStatus, machineData = null) {
  const report = {
    type: 'machine_status',
    timestamp: new Date().toISOString(),
    connected: connectionStatus.connected,
    state: machineData?.state || 'Unknown',
    position: machineData?.position || null,
    feedRate: machineData?.feedRate || null,
    spindleSpeed: machineData?.spindleSpeed || null,
    port: connectionStatus.port || null
  };

  return report;
}

/**
 * Create a health score structure
 */
export function createHealthScore(score, details = {}) {
  let status;
  if (score >= 90) status = 'Excellent';
  else if (score >= 75) status = 'Good';
  else if (score >= 50) status = 'Fair';
  else if (score >= 25) status = 'Poor';
  else status = 'Critical';

  return {
    type: 'health_score',
    timestamp: new Date().toISOString(),
    score,
    status,
    details
  };
}

/**
 * Generate summary for different query types
 */
function generateQuerySummary(queryType, data) {
  switch (queryType) {
    case 'machineStatus':
      return {
        state: data.state,
        position: data.position ? `X${data.position.x} Y${data.position.y} Z${data.position.z}` : 'Unknown'
      };
    
    case 'grblSettings':
      return {
        totalSettings: Object.keys(data).length,
        softLimits: data[20] === 1 ? 'Enabled' : 'Disabled',
        hardLimits: data[21] === 1 ? 'Enabled' : 'Disabled',
        homing: data[22] === 1 ? 'Enabled' : 'Disabled'
      };
    
    case 'coordinateSystems':
      return {
        systems: Object.keys(data).length
      };
    
    case 'parserState':
      return {
        modal: Object.keys(data).length + ' states'
      };
    
    case 'limitsInfo':
      return {
        configured: data ? 'Yes' : 'No'
      };
    
    default:
      return { status: 'Available' };
  }
}