/**
 * Sample G-code Commands for Testing
 * 
 * Provides realistic G-code samples for testing command execution,
 * parsing, and response handling.
 */

export const SAMPLE_GCODE = {
  // Basic movement commands
  BASIC_MOVES: [
    'G0 X10 Y20',      // Rapid move
    'G1 X5 Y10 F100',  // Linear move with feed rate
    'G0 Z5',           // Z-axis move
    'G1 X0 Y0 Z0'      // Return to origin
  ],

  // Homing and setup commands
  SETUP_COMMANDS: [
    '$H',              // Home machine
    '$X',              // Unlock machine
    '?',               // Status query
    '$$'               // View settings
  ],

  // Complex program example
  SIMPLE_PROGRAM: [
    '; Simple rectangle cutting program',
    'G17 G20 G90 G94 G54',  // Setup: XY plane, inches, absolute, feed rate mode, work offset
    'G0 Z0.25',             // Move to safe height
    'G0 X1 Y1',             // Move to start position
    'G1 Z-0.125 F5',        // Plunge
    'G1 X3 F20',            // Cut to X3
    'G1 Y3',                // Cut to Y3
    'G1 X1',                // Cut back to X1
    'G1 Y1',                // Cut back to Y1
    'G0 Z0.25',             // Lift to safe height
    'G0 X0 Y0',             // Return to origin
    'M30'                   // Program end
  ],

  // Arc commands
  ARC_COMMANDS: [
    'G2 X2 Y0 I1 J0',      // Clockwise arc
    'G3 X0 Y2 I0 J1',      // Counter-clockwise arc
    'G2 X0 Y0 I-1 J0'      // Complete circle
  ],

  // Error-inducing commands for testing
  ERROR_COMMANDS: [
    'G999',                // Invalid G-code
    'X',                   // Missing parameter
    'G1 X1000000',         // Out of range
    'INVALID_COMMAND'      // Not G-code at all
  ],

  // Status and query commands
  QUERY_COMMANDS: [
    '?',                   // Real-time status
    '$#',                  // View coordinate systems
    '$G',                  // View parser state
    '$I',                  // View build info
    '$N',                  // View startup blocks
    '$C',                  // Check G-code mode
    '$X',                  // Kill alarm lock
    '$H'                   // Run homing cycle
  ],

  // Settings commands
  SETTINGS_COMMANDS: [
    '$$',                  // View all settings
    '$0=10',               // Set step pulse time
    '$1=25',               // Set step idle delay
    '$100=250.000',        // Set X-axis steps/mm
    '$110=500.000',        // Set X-axis max rate
    '$120=10.000'          // Set X-axis acceleration
  ]
};

// Expected responses for testing
export const EXPECTED_RESPONSES = {
  // Standard OK response
  OK: 'ok',

  // Status response examples
  STATUS_IDLE: '<Idle|MPos:0.000,0.000,0.000|FS:0,0>',
  STATUS_RUN: '<Run|MPos:1.500,2.250,0.000|FS:500,0>',
  STATUS_HOLD: '<Hold:0|MPos:5.000,5.000,0.000|FS:0,0>',
  STATUS_ALARM: '<Alarm|MPos:0.000,0.000,0.000|FS:0,0>',

  // Error responses
  ERROR_UNSUPPORTED: 'error:1',       // G-code words consist of a letter and a value
  ERROR_BAD_NUMBER: 'error:2',        // Bad number format
  ERROR_INVALID_STATEMENT: 'error:3', // Invalid statement
  ERROR_NEGATIVE_VALUE: 'error:4',    // Value < 0
  ERROR_SETTING_DISABLED: 'error:5',  // Setting disabled
  ERROR_STEP_PULSE_MIN: 'error:6',    // Value < 3 usec
  ERROR_SETTING_READ_FAIL: 'error:7', // EEPROM read fail
  ERROR_IDLE_ERROR: 'error:8',        // Not idle
  ERROR_LOCK: 'error:9',              // Locked
  ERROR_SOFT_LIMIT: 'error:10',       // Soft limits
  ERROR_OVERFLOW: 'error:11',         // Line overflow

  // Alarm responses
  ALARM_HARD_LIMIT: 'ALARM:1',        // Hard limit triggered
  ALARM_SOFT_LIMIT: 'ALARM:2',        // G-code motion target exceeds machine travel
  ALARM_ABORT_CYCLE: 'ALARM:3',       // Reset while in motion
  ALARM_PROBE_FAIL_INITIAL: 'ALARM:4', // Probe fail initial
  ALARM_PROBE_FAIL_CONTACT: 'ALARM:5', // Probe fail contact
  ALARM_HOMING_FAIL_RESET: 'ALARM:6',  // Homing fail reset
  ALARM_HOMING_FAIL_DOOR: 'ALARM:7',   // Homing fail door
  ALARM_HOMING_FAIL_PULLOFF: 'ALARM:8', // Homing fail pull off
  ALARM_HOMING_FAIL_APPROACH: 'ALARM:9' // Homing fail approach
};

// Command-response mappings for testing
export const COMMAND_RESPONSE_MAP = {
  // Basic commands
  '$H': EXPECTED_RESPONSES.OK,
  '$X': EXPECTED_RESPONSES.OK,
  '?': EXPECTED_RESPONSES.STATUS_IDLE,
  '$$': '$0=10 (Step pulse time, microseconds)\n$1=25 (Step idle delay, milliseconds)',

  // Movement commands
  'G0 X10 Y20': EXPECTED_RESPONSES.OK,
  'G1 X5 Y10 F100': EXPECTED_RESPONSES.OK,
  'G0 Z5': EXPECTED_RESPONSES.OK,
  'G1 X0 Y0 Z0': EXPECTED_RESPONSES.OK,

  // Arc commands
  'G2 X2 Y0 I1 J0': EXPECTED_RESPONSES.OK,
  'G3 X0 Y2 I0 J1': EXPECTED_RESPONSES.OK,

  // Error commands
  'G999': EXPECTED_RESPONSES.ERROR_UNSUPPORTED,
  'X': EXPECTED_RESPONSES.ERROR_BAD_NUMBER,
  'INVALID_COMMAND': EXPECTED_RESPONSES.ERROR_INVALID_STATEMENT
};

// Test sequences for different scenarios
export const TEST_SEQUENCES = {
  // Basic homing sequence
  HOMING_SEQUENCE: {
    name: 'Homing Sequence',
    commands: ['$X', '$H', '?'],
    expectedResponses: [
      EXPECTED_RESPONSES.OK,
      EXPECTED_RESPONSES.OK,
      EXPECTED_RESPONSES.STATUS_IDLE
    ]
  },

  // Simple movement sequence
  MOVEMENT_SEQUENCE: {
    name: 'Movement Sequence',
    commands: ['G0 X10', 'G0 Y10', 'G1 X0 Y0 F100'],
    expectedResponses: [
      EXPECTED_RESPONSES.OK,
      EXPECTED_RESPONSES.OK,
      EXPECTED_RESPONSES.OK
    ]
  },

  // Error handling sequence
  ERROR_SEQUENCE: {
    name: 'Error Handling Sequence',
    commands: ['G999', '$X', 'G0 X10'],
    expectedResponses: [
      EXPECTED_RESPONSES.ERROR_UNSUPPORTED,
      EXPECTED_RESPONSES.OK,
      EXPECTED_RESPONSES.OK
    ]
  },

  // Settings query sequence
  SETTINGS_SEQUENCE: {
    name: 'Settings Query Sequence',
    commands: ['$$', '$#', '$G'],
    expectedResponses: [
      '$0=10 (Step pulse time, microseconds)',
      '[G54:0.000,0.000,0.000]',
      '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]'
    ]
  }
};

// Utility functions for testing
export const GCODE_UTILS = {
  /**
   * Get expected response for a command
   */
  getExpectedResponse(command) {
    const cleanCommand = command.trim();
    return COMMAND_RESPONSE_MAP[cleanCommand] || EXPECTED_RESPONSES.OK;
  },

  /**
   * Check if command should produce an error
   */
  isErrorCommand(command) {
    return SAMPLE_GCODE.ERROR_COMMANDS.includes(command.trim());
  },

  /**
   * Check if command is a query command
   */
  isQueryCommand(command) {
    return SAMPLE_GCODE.QUERY_COMMANDS.includes(command.trim());
  },

  /**
   * Check if command is a movement command
   */
  isMovementCommand(command) {
    const cleanCommand = command.trim().toUpperCase();
    return cleanCommand.startsWith('G0') || 
           cleanCommand.startsWith('G1') || 
           cleanCommand.startsWith('G2') || 
           cleanCommand.startsWith('G3');
  },

  /**
   * Generate a test sequence with expected responses
   */
  createTestSequence(commands) {
    return {
      commands: [...commands],
      expectedResponses: commands.map(cmd => this.getExpectedResponse(cmd))
    };
  }
};

// File content examples for testing file operations
export const SAMPLE_FILES = {
  SIMPLE_GCODE: SAMPLE_GCODE.SIMPLE_PROGRAM.join('\n'),
  
  BASIC_MOVES: SAMPLE_GCODE.BASIC_MOVES.join('\n'),
  
  WITH_COMMENTS: [
    '; Simple test program',
    '; Generated for testing',
    'G0 X10 Y10 ; Move to start',
    'G1 Z-1 F100 ; Plunge',
    'G1 X20 ; Cut line',
    'G0 Z5 ; Lift',
    '; End of program'
  ].join('\n'),

  MIXED_COMMANDS: [
    ...SAMPLE_GCODE.SETUP_COMMANDS,
    ...SAMPLE_GCODE.BASIC_MOVES,
    '?',
    'M30'
  ].join('\n')
};