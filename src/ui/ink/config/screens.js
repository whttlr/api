export const screens = {
  'main-menu': {
    title: 'CNC G-Code Control',
    component: 'MainScreen'
  },
  'gcode-execution': {
    title: 'G-Code Execution',
    component: 'ExecuteScreen'
  },
  'gcode-input': {
    title: 'Enter G-Code',
    component: 'GcodeEditor'
  },
  'gcode-select': {
    title: 'Select G-Code File',
    component: 'GcodeSelector'
  },
  'gcode-view': {
    title: 'G-Code Preview',
    component: 'GcodeViewer'
  },
  'gcode-run': {
    title: 'G-Code Execution',
    component: 'GcodeRunner'
  },
  'manual-control': {
    title: 'Manual Control',
    component: 'ManualControlScreen'
  },
  'advanced-control': {
    title: 'Advanced Control',
    component: 'AdvancedControlScreen'
  },
  'settings': {
    title: 'Settings',
    component: 'SettingsScreen'
  }
};

export const navigation = {
  'main-menu': ['gcode-execution', 'manual-control', 'settings'],
  'gcode-execution': ['gcode-input', 'gcode-select'],
  'gcode-input': ['gcode-run'],
  'gcode-select': ['gcode-view'],
  'gcode-view': ['gcode-run'],
  'manual-control': ['advanced-control'],
  'settings': []
};