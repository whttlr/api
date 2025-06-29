/**
 * Input Handler Service
 * 
 * Provides standardized input handling patterns for keyboard shortcuts,
 * navigation, and text input across the application.
 * 
 * @module InputHandler
 */

/**
 * Standard keyboard shortcuts configuration
 */
export const KeyBindings = {
  // Navigation
  UP: 'upArrow',
  DOWN: 'downArrow', 
  LEFT: 'leftArrow',
  RIGHT: 'rightArrow',
  ENTER: 'return',
  ESCAPE: 'escape',
  
  // Global hotkeys
  HELP: '?',
  GCODE_REFERENCE: 'g',
  UNITS_TOGGLE: 'u',
  SETTINGS: 's',
  FILES: 'f',
  QUIT: 'q',
  
  // Command shortcuts
  EMERGENCY_STOP: 'ctrl+x',
  JOB_PROGRESS: 'j',
  
  // Edit mode
  BACKSPACE: ['backspace', 'delete', '\u0008', '\u007f'],
  
  // Mode switching
  COMMAND_MODE: '1',
  FILE_MODE: '2', 
  HISTORY_MODE: '3'
};

/**
 * Handle list navigation input
 * @param {Object} params - Navigation parameters
 * @param {string} input - Input character
 * @param {Object} key - Key object from useInput
 * @param {number} selectedIndex - Current selection index
 * @param {Array} items - Array of selectable items
 * @param {Function} setSelectedIndex - State setter for index
 * @param {Function} onSelect - Callback for item selection
 * @returns {boolean} True if input was handled
 */
export const handleListNavigation = ({
  input,
  key,
  selectedIndex,
  items,
  setSelectedIndex,
  onSelect
}) => {
  if (key.upArrow && items.length > 0) {
    setSelectedIndex(Math.max(0, selectedIndex - 1));
    return true;
  }
  
  if (key.downArrow && items.length > 0) {
    setSelectedIndex(Math.min(items.length - 1, selectedIndex + 1));
    return true;
  }
  
  if (key.return && items.length > 0) {
    onSelect(items[selectedIndex]);
    return true;
  }
  
  // Handle shortcut keys if items have key property
  const item = items.find(item => item.key === input);
  if (item) {
    onSelect(item);
    return true;
  }
  
  return false;
};

/**
 * Handle text input with validation
 * @param {Object} params - Text input parameters
 * @param {string} input - Input character
 * @param {Object} key - Key object from useInput
 * @param {string} currentValue - Current text value
 * @param {Function} setValue - State setter for text
 * @param {Function} onEnter - Callback for enter key
 * @param {Function} onEscape - Callback for escape key
 * @param {RegExp} allowedChars - Regex for allowed characters
 * @returns {boolean} True if input was handled
 */
export const handleTextInput = ({
  input,
  key,
  currentValue,
  setValue,
  onEnter,
  onEscape,
  allowedChars = /[a-zA-Z0-9\.\-\s]/
}) => {
  if (key.escape) {
    onEscape?.();
    return true;
  }
  
  if (key.return) {
    onEnter?.(currentValue);
    return true;
  }
  
  // Handle backspace/delete (cross-platform)
  if (isDeleteKey(key, input)) {
    setValue(currentValue.slice(0, -1));
    return true;
  }
  
  // Handle character input
  if (input && input.length === 1 && allowedChars.test(input)) {
    setValue(currentValue + input.toUpperCase());
    return true;
  }
  
  return false;
};

/**
 * Check if input represents a delete/backspace key
 * @param {Object} key - Key object from useInput
 * @param {string} input - Input character
 * @returns {boolean} True if it's a delete key
 */
export const isDeleteKey = (key, input) => {
  return key.backspace || 
         key.delete || 
         input === '\u0008' || 
         input === '\u007f';
};

/**
 * Handle modal input with confirmation/cancel
 * @param {Object} params - Modal input parameters
 * @param {string} input - Input character
 * @param {Object} key - Key object from useInput
 * @param {Function} onConfirm - Confirm callback
 * @param {Function} onCancel - Cancel callback
 * @param {string} confirmKey - Key for confirmation (default: 'y')
 * @param {string} cancelKey - Key for cancellation (default: 'n')
 * @returns {boolean} True if input was handled
 */
export const handleModalInput = ({
  input,
  key,
  onConfirm,
  onCancel,
  confirmKey = 'y',
  cancelKey = 'n'
}) => {
  if (key.return || input === confirmKey) {
    onConfirm();
    return true;
  }
  
  if (key.escape || input === cancelKey) {
    onCancel();
    return true;
  }
  
  return false;
};

/**
 * Handle numeric input with bounds checking
 * @param {Object} params - Numeric input parameters
 * @param {string} input - Input character
 * @param {Object} key - Key object from useInput
 * @param {number} currentValue - Current numeric value
 * @param {Function} setValue - State setter for value
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} step - Step size for +/- keys
 * @returns {boolean} True if input was handled
 */
export const handleNumericInput = ({
  input,
  key,
  currentValue,
  setValue,
  min = -Infinity,
  max = Infinity,
  step = 1
}) => {
  // Handle increment/decrement
  if (input === '+' || key.rightArrow) {
    const newValue = Math.min(max, currentValue + step);
    setValue(newValue);
    return true;
  }
  
  if (input === '-' || key.leftArrow) {
    const newValue = Math.max(min, currentValue - step);
    setValue(newValue);
    return true;
  }
  
  // Handle direct numeric input
  if (/[0-9\.]/.test(input)) {
    const newValueStr = currentValue.toString() + input;
    const newValue = parseFloat(newValueStr);
    
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      setValue(newValue);
      return true;
    }
  }
  
  return false;
};

/**
 * Create a debounced input handler
 * @param {Function} handler - Input handler function
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Function} Debounced handler
 */
export const createDebouncedHandler = (handler, delay = 300) => {
  let timeoutId;
  
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => handler(...args), delay);
  };
};

/**
 * Global hotkey definitions for common actions
 */
export const GlobalHotkeys = {
  'g': 'showGcodeReference',
  '?': 'showHelp', 
  'u': 'toggleUnits',
  's': 'openSettings',
  'f': 'openFiles',
  'q': 'quit',
  'ctrl+x': 'emergencyStop',
  'j': 'showJobProgress'
};

/**
 * Check if a key combination matches a global hotkey
 * @param {string} input - Input character
 * @param {Object} key - Key object from useInput
 * @returns {string|null} Hotkey action name or null
 */
export const getGlobalHotkey = (input, key) => {
  // Check single key hotkeys
  if (GlobalHotkeys[input]) {
    return GlobalHotkeys[input];
  }
  
  // Check modifier combinations
  if (key.ctrl && input === 'x') {
    return GlobalHotkeys['ctrl+x'];
  }
  
  return null;
};

/**
 * Validate G-code input characters
 * @param {string} input - Input character
 * @returns {boolean} True if valid G-code character
 */
export const isValidGcodeChar = (input) => {
  return /[GMTFXYZIJKRSPABCDEFHUVWL0-9\.\-\s]/.test(input.toUpperCase());
};

/**
 * Sanitize G-code input
 * @param {string} input - Raw G-code input
 * @returns {string} Sanitized G-code
 */
export const sanitizeGcodeInput = (input) => {
  return input
    .toUpperCase()
    .replace(/[^GMTFXYZIJKRSPABCDEFHUVWL0-9\.\-\s]/g, '')
    .trim();
};

// Default export with all utilities
export default {
  KeyBindings,
  handleListNavigation,
  handleTextInput,
  handleModalInput,
  handleNumericInput,
  isDeleteKey,
  createDebouncedHandler,
  GlobalHotkeys,
  getGlobalHotkey,
  isValidGcodeChar,
  sanitizeGcodeInput
};