/**
 * Mock Error Data for Recovery Testing
 * 
 * Provides realistic error scenarios, patterns, and data
 * for testing error classification and recovery systems.
 */

export class MockErrorData {
  /**
   * Get sample GRBL errors for testing
   */
  static getGrblErrors() {
    return [
      { code: 1, message: 'Expected command letter', type: 'syntax_error' },
      { code: 2, message: 'Bad number format', type: 'syntax_error' },
      { code: 3, message: 'Invalid statement', type: 'syntax_error' },
      { code: 4, message: 'Value < 0', type: 'parameter_error' },
      { code: 8, message: 'Not idle', type: 'state_error' },
      { code: 9, message: 'Locked', type: 'state_error' },
      { code: 10, message: 'Soft limits', type: 'limit_error' },
      { code: 11, message: 'Line overflow', type: 'buffer_error' },
      { code: 13, message: 'Check Door', type: 'safety_error' },
      { code: 15, message: 'Travel exceeded', type: 'safety_error' }
    ];
  }

  /**
   * Get sample alarm scenarios
   */
  static getAlarmScenarios() {
    return [
      {
        code: 1,
        name: 'Hard Limit',
        severity: 'critical',
        autoRecoverable: false,
        description: 'Limit switch triggered during movement',
        commonCauses: ['Incorrect work coordinates', 'Machine misconfiguration', 'Mechanical issue'],
        requiredActions: ['Manual inspection', 'Reset limits', 'Check wiring']
      },
      {
        code: 2,
        name: 'Soft Limit',
        severity: 'high',
        autoRecoverable: true,
        description: 'Software limit exceeded',
        commonCauses: ['Incorrect G-code', 'Wrong work offset', 'Missing homing'],
        requiredActions: ['Home machine', 'Check work coordinates', 'Verify G-code']
      },
      {
        code: 3,
        name: 'Abort Cycle',
        severity: 'medium',
        autoRecoverable: true,
        description: 'Cycle aborted by user or system',
        commonCauses: ['User intervention', 'Safety trigger', 'Emergency stop'],
        requiredActions: ['Clear alarm', 'Check machine state', 'Resume if safe']
      },
      {
        code: 8,
        name: 'Homing Fail Reset',
        severity: 'high',
        autoRecoverable: true,
        description: 'Homing cycle failed to complete',
        commonCauses: ['Limit switch failure', 'Mechanical binding', 'Electrical issue'],
        requiredActions: ['Check limit switches', 'Verify homing settings', 'Manual homing']
      }
    ];
  }

  /**
   * Get communication error patterns
   */
  static getCommunicationErrors() {
    return [
      {
        type: 'timeout',
        message: 'Request timeout after 5000ms',
        frequency: 'common',
        retryable: true,
        commonContext: ['Heavy system load', 'USB interference', 'Long running commands']
      },
      {
        type: 'connection_lost',
        message: 'Serial port disconnected',
        frequency: 'uncommon',
        retryable: true,
        commonContext: ['USB cable issue', 'Power loss', 'Driver problem']
      },
      {
        type: 'buffer_overflow',
        message: 'Input buffer overflow',
        frequency: 'rare',
        retryable: true,
        commonContext: ['Rapid command sending', 'Large G-code files', 'System lag']
      },
      {
        type: 'malformed_response',
        message: 'Invalid response format',
        frequency: 'rare',
        retryable: false,
        commonContext: ['Firmware bug', 'Communication corruption', 'Interference']
      },
      {
        type: 'checksum_error',
        message: 'Checksum mismatch',
        frequency: 'uncommon',
        retryable: true,
        commonContext: ['Electrical noise', 'Cable degradation', 'EMI interference']
      }
    ];
  }

  /**
   * Get error patterns for machine learning
   */
  static getErrorPatterns() {
    return [
      {
        pattern: ['G0 X200', 'G0 Y200', 'G0 Z10'],
        errorType: 'soft_limit',
        confidence: 0.95,
        description: 'Movement beyond soft limits'
      },
      {
        pattern: ['M3 S1000', 'G1 X10 Y10', 'M5'],
        errorType: 'spindle_error',
        confidence: 0.80,
        description: 'Spindle operation sequence'
      },
      {
        pattern: ['$H', '$H', '$H'],
        errorType: 'homing_fail',
        confidence: 0.90,
        description: 'Repeated homing attempts'
      },
      {
        pattern: ['G28', 'G0 Z-10'],
        errorType: 'collision_risk',
        confidence: 0.85,
        description: 'Dangerous Z movement after homing'
      }
    ];
  }

  /**
   * Get trained patterns for import testing
   */
  static getTrainedPatterns() {
    return [
      {
        id: 'pattern_001',
        commands: ['G0 X100', 'G0 Y100'],
        errorType: 'soft_limit',
        frequency: 15,
        confidence: 0.92,
        lastSeen: Date.now() - 86400000 // 1 day ago
      },
      {
        id: 'pattern_002',
        commands: ['M3 S2000', 'G1 F500'],
        errorType: 'feed_rate_error',
        frequency: 8,
        confidence: 0.78,
        lastSeen: Date.now() - 3600000 // 1 hour ago
      },
      {
        id: 'pattern_003',
        commands: ['G28', 'G0 Z-5'],
        errorType: 'collision_risk',
        frequency: 3,
        confidence: 0.95,
        lastSeen: Date.now() - 7200000 // 2 hours ago
      }
    ];
  }

  /**
   * Get model weights for ML import testing
   */
  static getModelWeights() {
    return {
      commandWeights: {
        'G0': 0.3,    // Rapid positioning
        'G1': 0.4,    // Linear interpolation
        'G28': 0.8,   // Return to home
        'M3': 0.5,    // Spindle on
        'M5': 0.2     // Spindle off
      },
      errorTypeWeights: {
        'soft_limit': 0.9,
        'hard_limit': 1.0,
        'timeout': 0.6,
        'syntax_error': 0.8
      },
      contextWeights: {
        'machine_state': 0.7,
        'recent_commands': 0.8,
        'time_of_day': 0.3,
        'session_duration': 0.4
      }
    };
  }

  /**
   * Get recovery scenarios for testing
   */
  static getRecoveryScenarios() {
    return [
      {
        name: 'Soft Limit Recovery',
        initialState: {
          alarm: 2,
          position: { x: 205, y: 150, z: 10 },
          limits: { x: 200, y: 200, z: 100 }
        },
        expectedSteps: [
          'Unlock machine ($X)',
          'Home machine ($H)',
          'Move to safe position',
          'Restore work offset'
        ],
        expectedDuration: 15000, // 15 seconds
        successCriteria: {
          machineState: 'IDLE',
          positionValid: true,
          alarmCleared: true
        }
      },
      {
        name: 'Communication Timeout Recovery',
        initialState: {
          error: 'timeout',
          lastCommand: 'G0 X50 Y50',
          attempts: 0
        },
        expectedSteps: [
          'Wait for backoff delay',
          'Retry last command',
          'Verify position',
          'Continue operation'
        ],
        expectedDuration: 2000, // 2 seconds
        successCriteria: {
          commandExecuted: true,
          positionConfirmed: true
        }
      },
      {
        name: 'Homing Failure Recovery',
        initialState: {
          alarm: 8,
          homingAttempts: 1,
          limitSwitchStatus: 'unknown'
        },
        expectedSteps: [
          'Check limit switches',
          'Clear alarm state',
          'Retry homing sequence',
          'Verify home position'
        ],
        expectedDuration: 30000, // 30 seconds
        successCriteria: {
          isHomed: true,
          limitSwitchesOperational: true,
          positionZero: true
        }
      }
    ];
  }

  /**
   * Generate error statistics for testing
   */
  static generateErrorStatistics(days = 7) {
    const now = Date.now();
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      errorsByDay: {},
      errorTrends: []
    };

    const errorTypes = ['timeout', 'soft_limit', 'connection_lost', 'syntax_error', 'hard_limit'];
    
    for (let day = 0; day < days; day++) {
      const date = new Date(now - (day * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      
      stats.errorsByDay[dateKey] = {};
      
      errorTypes.forEach(type => {
        // Generate random error counts with some patterns
        let count = Math.floor(Math.random() * 10);
        
        // Simulate increasing trend for timeouts
        if (type === 'timeout' && day < 3) {
          count += Math.floor(Math.random() * 5);
        }
        
        // Simulate weekend effect (fewer errors)
        if (date.getDay() === 0 || date.getDay() === 6) {
          count = Math.floor(count / 2);
        }
        
        stats.errorsByDay[dateKey][type] = count;
        stats.errorsByType[type] = (stats.errorsByType[type] || 0) + count;
        stats.totalErrors += count;
      });
    }

    // Calculate trends
    errorTypes.forEach(type => {
      const counts = Object.values(stats.errorsByDay).map(day => day[type] || 0);
      const recent = counts.slice(0, 3).reduce((a, b) => a + b, 0);
      const older = counts.slice(3).reduce((a, b) => a + b, 0);
      
      stats.errorTrends.push({
        type,
        trend: recent > older ? 'increasing' : 'decreasing',
        recentCount: recent,
        historicalCount: older
      });
    });

    return stats;
  }

  /**
   * Get sample command histories for pattern testing
   */
  static getCommandHistories() {
    return [
      {
        name: 'Simple Movement Sequence',
        commands: [
          { command: 'G0 X10 Y10', timestamp: Date.now() - 3000 },
          { command: 'G0 Z5', timestamp: Date.now() - 2000 },
          { command: 'G1 X20 Y20 F500', timestamp: Date.now() - 1000 },
          { command: 'G0 Z10', timestamp: Date.now() }
        ]
      },
      {
        name: 'Spindle Operation',
        commands: [
          { command: 'M3 S1000', timestamp: Date.now() - 4000 },
          { command: 'G1 X10 F300', timestamp: Date.now() - 3000 },
          { command: 'G1 Y10', timestamp: Date.now() - 2000 },
          { command: 'M5', timestamp: Date.now() - 1000 }
        ]
      },
      {
        name: 'Limit Exceeding Sequence',
        commands: [
          { command: 'G0 X150 Y150', timestamp: Date.now() - 2000 },
          { command: 'G0 X200 Y200', timestamp: Date.now() - 1000 },
          { command: 'G0 X250 Y250', timestamp: Date.now() } // Would exceed limits
        ]
      },
      {
        name: 'Rapid Command Sequence',
        commands: Array.from({ length: 20 }, (_, i) => ({
          command: `G0 X${i} Y${i}`,
          timestamp: Date.now() - (20 - i) * 100
        }))
      }
    ];
  }

  /**
   * Get correlation patterns for testing
   */
  static getCorrelationPatterns() {
    return [
      {
        name: 'Communication Issues',
        correlatedErrors: ['timeout', 'connection_lost', 'checksum_error'],
        correlation: 0.85,
        likelyRootCause: 'USB communication problems',
        recommendations: [
          'Check USB cable connection',
          'Try different USB port',
          'Update USB drivers',
          'Check for electromagnetic interference'
        ]
      },
      {
        name: 'Mechanical Issues',
        correlatedErrors: ['hard_limit', 'homing_fail', 'probe_fail'],
        correlation: 0.78,
        likelyRootCause: 'Mechanical system problems',
        recommendations: [
          'Check limit switch wiring',
          'Inspect mechanical components',
          'Verify machine calibration',
          'Lubricate moving parts'
        ]
      },
      {
        name: 'G-code Issues',
        correlatedErrors: ['syntax_error', 'soft_limit', 'parameter_error'],
        correlation: 0.92,
        likelyRootCause: 'G-code generation or validation problems',
        recommendations: [
          'Validate G-code before sending',
          'Check CAM software settings',
          'Verify work coordinate setup',
          'Review tool path simulation'
        ]
      }
    ];
  }

  /**
   * Create realistic error for testing
   */
  static createTestError(type = 'timeout', context = {}) {
    const errorTemplates = {
      timeout: {
        message: 'Command timeout after {timeout}ms',
        code: 'TIMEOUT',
        retryable: true
      },
      connection_lost: {
        message: 'Serial connection lost',
        code: 'CONN_LOST',
        retryable: true
      },
      soft_limit: {
        message: 'Soft limit exceeded on {axis} axis',
        code: 'SOFT_LIMIT',
        retryable: false
      },
      syntax_error: {
        message: 'Invalid G-code syntax: {details}',
        code: 'SYNTAX_ERR',
        retryable: false
      }
    };

    const template = errorTemplates[type] || errorTemplates.timeout;
    const error = new Error(template.message);
    error.code = template.code;
    error.retryable = template.retryable;
    error.context = context;
    error.timestamp = Date.now();

    return error;
  }

  /**
   * Generate realistic machine state for testing
   */
  static generateMachineState(scenario = 'normal') {
    const baseState = {
      state: 'IDLE',
      position: { x: 0, y: 0, z: 0 },
      workOffset: { x: 0, y: 0, z: 0 },
      spindle: { running: false, speed: 0 },
      coolant: false,
      isHomed: true,
      coordinateSystem: 'G54'
    };

    const scenarios = {
      alarm: {
        ...baseState,
        state: 'ALARM',
        alarmCode: 2,
        alarmMessage: 'Soft limit exceeded'
      },
      running: {
        ...baseState,
        state: 'RUN',
        position: { x: 25.5, y: 30.2, z: 5.0 },
        spindle: { running: true, speed: 1000 }
      },
      unhomed: {
        ...baseState,
        isHomed: false,
        position: { x: 0, y: 0, z: 0 }
      },
      limits: {
        ...baseState,
        position: { x: 199.5, y: 199.8, z: 95.0 }, // Near limits
        workOffset: { x: 10, y: 10, z: 0 }
      }
    };

    return scenarios[scenario] || baseState;
  }
}