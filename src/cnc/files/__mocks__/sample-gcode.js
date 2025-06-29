/**
 * Sample G-code Files for Testing
 */

export const SAMPLE_GCODE_SIMPLE = `
; Simple G-code test file
G0 X0 Y0 Z0
G0 X10
G0 Y10
G0 X0 Y0
M30
`;

export const SAMPLE_GCODE_WITH_COMMENTS = `
; Test file with comments
G0 X0 Y0 Z0 ; Move to origin
(This is a comment in parentheses)
G0 X10 ; Move X to 10
G0 Y10 ; Move Y to 10
G0 X0 Y0 ; Return to origin
M30 ; End program
`;

export const SAMPLE_GCODE_INVALID = `
; File with invalid commands
G0 X0 Y0 Z0
INVALID_COMMAND
G0 X10
ANOTHER_INVALID
M30
`;

export const SAMPLE_FILE_STATS = {
  simple: {
    totalLines: 6,
    validCommands: 5,
    estimatedDuration: { milliseconds: 2500, seconds: 3, minutes: 0 }
  },
  withComments: {
    totalLines: 7,
    validCommands: 5,
    estimatedDuration: { milliseconds: 2500, seconds: 3, minutes: 0 }
  },
  invalid: {
    totalLines: 6,
    validCommands: 3,
    estimatedDuration: { milliseconds: 1500, seconds: 2, minutes: 0 }
  }
};