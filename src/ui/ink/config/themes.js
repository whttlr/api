export const themes = {
  default: {
    colors: {
      primary: '#00ff00',
      secondary: '#0088ff',
      warning: '#ffaa00',
      error: '#ff0000',
      success: '#00ff00',
      text: '#ffffff',
      background: '#000000',
      border: '#333333'
    },
    symbols: {
      bullet: '•',
      arrow: '→',
      check: '✓',
      cross: '✗',
      warning: '⚠',
      info: 'ℹ'
    }
  },
  monochrome: {
    colors: {
      primary: '#ffffff',
      secondary: '#cccccc',
      warning: '#ffffff',
      error: '#ffffff',
      success: '#ffffff',
      text: '#ffffff',
      background: '#000000',
      border: '#333333'
    },
    symbols: {
      bullet: '*',
      arrow: '>',
      check: '+',
      cross: 'x',
      warning: '!',
      info: 'i'
    }
  }
};

export default themes.default;