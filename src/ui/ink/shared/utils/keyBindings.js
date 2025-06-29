export const keyMappings = {
  // Navigation
  'up': 'upArrow',
  'down': 'downArrow',
  'left': 'leftArrow',
  'right': 'rightArrow',
  'enter': 'return',
  'esc': 'escape',
  'space': ' ',
  'tab': 'tab',
  
  // Modifiers
  'ctrl+c': (key) => key.ctrl && key.name === 'c',
  'ctrl+s': (key) => key.ctrl && key.name === 's',
  'ctrl+z': (key) => key.ctrl && key.name === 'z',
  'ctrl+y': (key) => key.ctrl && key.name === 'y',
};

export function matchKey(input, key, binding) {
  if (typeof binding === 'string') {
    if (binding.includes('+')) {
      const [modifier, keyName] = binding.split('+');
      return key[modifier] && (input === keyName || key.name === keyName);
    }
    return input === binding || key[binding];
  }
  
  if (typeof binding === 'function') {
    return binding(key);
  }
  
  return false;
}

export function formatKeyBinding(binding) {
  if (binding.includes('ctrl+')) {
    return binding.replace('ctrl+', 'Ctrl+').toUpperCase();
  }
  if (binding === 'return') return 'Enter';
  if (binding === 'escape') return 'Esc';
  if (binding === ' ') return 'Space';
  if (binding === 'upArrow') return '↑';
  if (binding === 'downArrow') return '↓';
  if (binding === 'leftArrow') return '←';
  if (binding === 'rightArrow') return '→';
  
  return binding.toUpperCase();
}