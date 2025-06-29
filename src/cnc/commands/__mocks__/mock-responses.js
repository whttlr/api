/**
 * Mock G-code Command Responses
 */

export const MOCK_RESPONSES = {
  // Standard responses
  OK: 'ok',
  ERROR: 'error:1',
  ALARM: 'ALARM:1',
  
  // Status responses
  STATUS_IDLE: '<Idle|MPos:0.000,0.000,0.000|FS:0,0>',
  STATUS_RUN: '<Run|MPos:10.000,5.000,0.000|FS:500,8000>',
  STATUS_ALARM: '<Alarm|MPos:0.000,0.000,0.000|FS:0,0>',
  
  // Settings responses
  SETTINGS_SAMPLE: [
    '$0=10',
    '$1=25',
    '$20=0',
    '$21=0',
    '$22=0',
    '$130=200.000',
    '$131=200.000',
    '$132=200.000'
  ].join('\n'),
  
  // Emergency stop
  EMERGENCY_STOP: 'ok'
};

export const MOCK_COMMAND_DELAYS = {
  'G0': 100,   // Movement commands take longer
  'G1': 150,
  'M3': 50,    // Spindle commands
  'M5': 50,
  '?': 10,     // Status queries are fast
  '$$': 20,    // Settings query
  '$X': 30,    // Unlock command
  '$H': 500    // Homing takes longer
};