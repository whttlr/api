export const globalHotkeys = {
  'g': 'showGcodeReference',
  'u': 'toggleUnits', 
  's': 'openSettings',
  '?': 'showHelp',
  'q': 'quit'
};

export const screenHotkeys = {
  'gcode-execution': {
    'enter': 'executeGcode',
    'escape': 'goBack',
    'ctrl+s': 'saveFile'
  },
  'manual-control': {
    'space': 'emergencyStop',
    'h': 'homeAll',
    'x': 'homeX',
    'y': 'homeY',
    'z': 'homeZ'
  },
  'settings': {
    'escape': 'goBack',
    'ctrl+s': 'saveSettings'
  },
  'main-menu': {
    '1': 'gcodeExecution',
    '2': 'manualControl',
    '3': 'settings',
    'escape': 'quit'
  }
};