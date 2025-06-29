import React, { createContext, useContext, useReducer } from 'react';

const SettingsContext = createContext();

const initialState = {
  machine: {
    limits: {
      speed: {
        min: 0,
        max: 8000
      },
      rpm: {
        min: 0,
        max: 24000
      },
      travel: {
        x: { min: -200, max: 200 },
        y: { min: -200, max: 200 },
        z: { min: -100, max: 100 }
      }
    },
    stepSizes: [0.001, 0.01, 0.1, 1, 10, 100],
    defaultStepSize: 1,
    homeSequence: ['Z', 'X', 'Y']
  },
  user: {
    units: 'mm',
    theme: 'default',
    autoHome: false,
    confirmDestructive: true,
    logLevel: 'info'
  },
  hotkeys: {
    global: {
      'g': 'showGcodeReference',
      'u': 'toggleUnits', 
      's': 'openSettings',
      '?': 'showHelp',
      'q': 'quit'
    },
    contextual: {}
  }
};

function settingsReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_MACHINE_SETTING':
      return {
        ...state,
        machine: {
          ...state.machine,
          [action.payload.key]: action.payload.value
        }
      };
    case 'UPDATE_USER_SETTING':
      return {
        ...state,
        user: {
          ...state.user,
          [action.payload.key]: action.payload.value
        }
      };
    case 'UPDATE_HOTKEY':
      return {
        ...state,
        hotkeys: {
          ...state.hotkeys,
          [action.payload.context]: {
            ...state.hotkeys[action.payload.context],
            [action.payload.key]: action.payload.action
          }
        }
      };
    case 'RESET_SETTINGS':
      return initialState;
    case 'LOAD_SETTINGS':
      return {
        ...state,
        ...action.payload
      };
    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
}

export function SettingsProvider({ children }) {
  const [state, dispatch] = useReducer(settingsReducer, initialState);

  const value = {
    state,
    dispatch,
    updateMachineSetting: (key, value) => 
      dispatch({ type: 'UPDATE_MACHINE_SETTING', payload: { key, value } }),
    updateUserSetting: (key, value) => 
      dispatch({ type: 'UPDATE_USER_SETTING', payload: { key, value } }),
    updateHotkey: (context, key, action) => 
      dispatch({ type: 'UPDATE_HOTKEY', payload: { context, key, action } }),
    resetSettings: () => dispatch({ type: 'RESET_SETTINGS' }),
    loadSettings: (settings) => dispatch({ type: 'LOAD_SETTINGS', payload: settings })
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}